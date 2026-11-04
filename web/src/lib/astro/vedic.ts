import * as Astronomy from "astronomy-engine";
import { SIGNS, Sign, norm360, signOf } from "./math";
import { bodyLongitude, meanNode, type WesternChart } from "./western";

export type Graha = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn" | "Rahu" | "Ketu";
export type DashaLord = Graha;

export interface GrahaPosition {
  name: Graha | "Lagna";
  lon: number; // sidereal
  sign: Sign;
  degreeInSign: number;
  house: number | null; // whole-sign house from Lagna
  navamsa: Sign;
  nakshatra: string;
  pada: number;
  nakshatraLord: DashaLord;
  retrograde: boolean;
  dignity: "exalted" | "debilitated" | "own sign" | null;
}

export interface Dasha {
  lord: DashaLord;
  start: string; // ISO date
  end: string;
  antardashas?: Dasha[];
}

export interface Yoga {
  name: string;
  description: string;
}

export interface VedicChart {
  ayanamsa: number;
  ayanamsaName: "Lahiri";
  lagna: GrahaPosition | null;
  grahas: GrahaPosition[];
  moonNakshatra: { name: string; pada: number; lord: DashaLord };
  lagnaNakshatra: { name: string; pada: number; lord: DashaLord } | null;
  dashas: Dasha[];
  currentDasha: { maha: DashaLord; antar: DashaLord; mahaEnds: string; antarEnds: string } | null;
  yogas: Yoga[];
  mangalDosha: { present: boolean; fromLagna: boolean; fromMoon: boolean; marsHouseFromLagna: number | null; marsHouseFromMoon: number };
  sadeSati: { active: boolean; phase: string | null; saturnSign: Sign; moonSign: Sign };
}

export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

const DASHA_ORDER: DashaLord[] = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS: Record<DashaLord, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

const EXALTED: Partial<Record<Graha, Sign>> = { Sun: "Aries", Moon: "Taurus", Mars: "Capricorn", Mercury: "Virgo", Jupiter: "Cancer", Venus: "Pisces", Saturn: "Libra" };
const OWN: Partial<Record<Graha, Sign[]>> = {
  Sun: ["Leo"], Moon: ["Cancer"], Mars: ["Aries", "Scorpio"], Mercury: ["Gemini", "Virgo"],
  Jupiter: ["Sagittarius", "Pisces"], Venus: ["Taurus", "Libra"], Saturn: ["Capricorn", "Aquarius"],
};

const NAK_SPAN = 360 / 27;
const YEAR_MS = 365.25 * 86400000;

/**
 * Lahiri (Chitrapaksha) ayanamsa. Linear model anchored at 23°51′11″ on 1 Jan 2000
 * with the general precession rate; agrees with tabulated Lahiri values to ~0.01° for 1900–2100.
 */
export function lahiriAyanamsa(date: Date): number {
  const years = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / YEAR_MS;
  const T = years / 100;
  return 23.853056 + (5029.0966 * T + 1.11113 * T * T) / 3600;
}

export function nakshatraOf(siderealLon: number) {
  const idx = Math.floor(norm360(siderealLon) / NAK_SPAN);
  const within = norm360(siderealLon) - idx * NAK_SPAN;
  return {
    index: idx,
    name: NAKSHATRAS[idx],
    pada: Math.floor(within / (NAK_SPAN / 4)) + 1,
    lord: DASHA_ORDER[idx % 9],
    fractionElapsed: within / NAK_SPAN,
  };
}

/** D9: each sign is split into nine 3°20′ parts that run continuously through the zodiac. */
export const navamsaOf = (siderealLon: number): Sign => SIGNS[Math.floor((norm360(siderealLon) * 9) / 30) % 12];

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function vimshottari(moonSidereal: number, birth: Date): Dasha[] {
  const nak = nakshatraOf(moonSidereal);
  const startIdx = DASHA_ORDER.indexOf(nak.lord);
  // The first mahadasha began before birth: only the unelapsed fraction remains.
  let t = birth.getTime() - nak.fractionElapsed * DASHA_YEARS[nak.lord] * YEAR_MS;
  const out: Dasha[] = [];
  for (let i = 0; i < 10; i++) {
    const lord = DASHA_ORDER[(startIdx + i) % 9];
    const len = DASHA_YEARS[lord] * YEAR_MS;
    const antardashas: Dasha[] = [];
    let a = t;
    for (let j = 0; j < 9; j++) {
      const sub = DASHA_ORDER[(DASHA_ORDER.indexOf(lord) + j) % 9];
      const subLen = (DASHA_YEARS[lord] * DASHA_YEARS[sub] / 120) * YEAR_MS;
      antardashas.push({ lord: sub, start: iso(a), end: iso(a + subLen) });
      a += subLen;
    }
    out.push({ lord, start: iso(t), end: iso(t + len), antardashas });
    t += len;
    if (t - birth.getTime() > 110 * YEAR_MS) break;
  }
  return out;
}

const houseFrom = (fromSign: Sign, sign: Sign) => ((SIGNS.indexOf(sign) - SIGNS.indexOf(fromSign) + 12) % 12) + 1;

export function computeVedicChart(utc: Date, western: WesternChart, now = new Date()): VedicChart {
  const ay = lahiriAyanamsa(utc);
  const tropical = (n: string) => western.points.find((p) => p.name === n)!;
  const ascPoint = western.hasBirthTime ? tropical("Ascendant") : null;
  const lagnaSign = ascPoint ? signOf(ascPoint.lon - ay) : null;

  const build = (name: Graha | "Lagna", tropLon: number, retrograde: boolean): GrahaPosition => {
    const lon = norm360(tropLon - ay);
    const sign = signOf(lon);
    const nak = nakshatraOf(lon);
    let dignity: GrahaPosition["dignity"] = null;
    if (name !== "Lagna" && name !== "Rahu" && name !== "Ketu") {
      if (EXALTED[name] === sign) dignity = "exalted";
      else if (EXALTED[name] && SIGNS[(SIGNS.indexOf(EXALTED[name]!) + 6) % 12] === sign) dignity = "debilitated";
      else if (OWN[name]?.includes(sign)) dignity = "own sign";
    }
    return {
      name, lon, sign, degreeInSign: lon % 30,
      house: lagnaSign ? houseFrom(lagnaSign, sign) : null,
      navamsa: navamsaOf(lon),
      nakshatra: nak.name, pada: nak.pada, nakshatraLord: nak.lord,
      retrograde, dignity,
    };
  };

  const grahas: GrahaPosition[] = (["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const).map((g) => {
    const p = tropical(g);
    return build(g, p.lon, p.retrograde);
  });
  const node = meanNode(utc);
  grahas.push(build("Rahu", node, true), build("Ketu", node + 180, true));
  const lagna = ascPoint ? build("Lagna", ascPoint.lon, false) : null;

  const moon = grahas.find((g) => g.name === "Moon")!;
  const moonNak = nakshatraOf(moon.lon);
  const dashas = vimshottari(moon.lon, utc);
  const nowIso = now.toISOString().slice(0, 10);
  const maha = dashas.find((d) => d.start <= nowIso && nowIso < d.end);
  const antar = maha?.antardashas?.find((d) => d.start <= nowIso && nowIso < d.end);

  const g = (n: Graha) => grahas.find((x) => x.name === n)!;
  const yogas: Yoga[] = [];
  const kendra = [1, 4, 7, 10];
  if (kendra.includes(houseFrom(moon.sign, g("Jupiter").sign)))
    yogas.push({ name: "Gaja Kesari Yoga", description: "Jupiter in a kendra from the Moon: wisdom, reputation, and the ability to overcome obstacles." });
  if (g("Sun").sign === g("Mercury").sign)
    yogas.push({ name: "Budha-Aditya Yoga", description: "Sun and Mercury together: intelligence, communication skill, and recognition for your ideas." });
  if (g("Moon").sign === g("Mars").sign)
    yogas.push({ name: "Chandra-Mangala Yoga", description: "Moon with Mars: enterprising drive and earning power through bold action." });
  if (lagnaSign) {
    const mahapurusha: [Graha, string, string][] = [
      ["Mars", "Ruchaka", "courage, leadership, and physical vitality"],
      ["Mercury", "Bhadra", "intellect, eloquence, and business acumen"],
      ["Jupiter", "Hamsa", "wisdom, virtue, and spiritual grace"],
      ["Venus", "Malavya", "charm, artistry, comfort, and happy relationships"],
      ["Saturn", "Sasa", "authority, discipline, and influence over groups"],
    ];
    for (const [planet, name, gift] of mahapurusha) {
      const p = g(planet);
      if (kendra.includes(p.house!) && (p.dignity === "exalted" || p.dignity === "own sign"))
        yogas.push({ name: `${name} Yoga (Pancha Mahapurusha)`, description: `${planet} strong in a kendra: ${gift}.` });
    }
  }
  const nearMoon = grahas.filter((x) => !["Sun", "Moon", "Rahu", "Ketu"].includes(x.name) && [2, 12].includes(houseFrom(moon.sign, x.sign)));
  const withMoon = grahas.filter((x) => !["Sun", "Moon", "Rahu", "Ketu"].includes(x.name) && x.sign === moon.sign);
  if (nearMoon.length === 0 && withMoon.length === 0)
    yogas.push({ name: "Kemadruma Yoga", description: "No planets flank the Moon: periods of emotional self-reliance that build deep inner strength." });

  const mars = g("Mars");
  const doshaHouses = [1, 2, 4, 7, 8, 12];
  const marsFromLagna = lagnaSign ? houseFrom(lagnaSign, mars.sign) : null;
  const marsFromMoon = houseFrom(moon.sign, mars.sign);
  const fromLagna = marsFromLagna !== null && doshaHouses.includes(marsFromLagna);
  const fromMoon = doshaHouses.includes(marsFromMoon);

  const saturnNow = signOf(bodyLongitude(Astronomy.Body.Saturn, now) - lahiriAyanamsa(now));
  const fromMoonNow = houseFrom(moon.sign, saturnNow);
  const phase = fromMoonNow === 12 ? "rising (first) phase" : fromMoonNow === 1 ? "peak (second) phase" : fromMoonNow === 2 ? "setting (final) phase" : null;

  return {
    ayanamsa: ay,
    ayanamsaName: "Lahiri",
    lagna,
    grahas,
    moonNakshatra: { name: moonNak.name, pada: moonNak.pada, lord: moonNak.lord },
    lagnaNakshatra: lagna ? { name: lagna.nakshatra, pada: lagna.pada, lord: lagna.nakshatraLord } : null,
    dashas,
    currentDasha: maha && antar ? { maha: maha.lord, antar: antar.lord, mahaEnds: maha.end, antarEnds: antar.end } : null,
    yogas,
    mangalDosha: { present: fromLagna || fromMoon, fromLagna, fromMoon, marsHouseFromLagna: marsFromLagna, marsHouseFromMoon: marsFromMoon },
    sadeSati: { active: phase !== null, phase, saturnSign: saturnNow, moonSign: moon.sign },
  };
}
