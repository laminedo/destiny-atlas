import * as Astronomy from "astronomy-engine";
import { Sign, angDist, norm360, signOf } from "./math";
import { bodyLongitude, computeWesternChart, houseOf, ordinal, type HouseSystem, type PointName, type WesternChart } from "./western";

const DAY = 86400000;
const YEAR = 365.2422 * DAY;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export interface Progressions {
  progressedDate: string; // the ephemeris day standing for this year of life
  sun: { lon: number; sign: Sign };
  moon: { lon: number; sign: Sign; nextSignChange: string | null; nextSign: Sign | null };
  ascendant: { lon: number; sign: Sign } | null; // solar arc
  midheaven: { lon: number; sign: Sign } | null; // solar arc
  solarArc: number;
  lunarPhase: { name: string; angle: number; meaning: string };
  signChanges: { body: "Sun" | "Mercury" | "Venus" | "Mars"; sign: Sign; date: string }[];
}

const PHASES = [
  ["New", "Seeding a new 30-year cycle: instinct over plans; something new is beginning."],
  ["Crescent", "Struggling free of the past and committing to a new direction."],
  ["First Quarter", "Crisis in action: building, deciding, and pushing through resistance."],
  ["Gibbous", "Refining and perfecting; analysing what works before the harvest."],
  ["Full", "Illumination and fulfilment: relationships and results reveal what you've built."],
  ["Disseminating", "Sharing what you've learned: teaching, spreading your message."],
  ["Last Quarter", "Crisis in consciousness: re-orienting and letting go of outworn structures."],
  ["Balsamic", "Release and preparation: wisdom, endings, and planting seeds for the next cycle."],
] as const;

/** Secondary progressions (a day for a year), with solar-arc angles. */
export function computeProgressions(birthUtc: Date, natal: WesternChart, now = new Date()): Progressions {
  const ageYears = (now.getTime() - birthUtc.getTime()) / YEAR;
  const progDate = new Date(birthUtc.getTime() + ageYears * DAY);
  const pSun = bodyLongitude(Astronomy.Body.Sun, progDate);
  const pMoon = bodyLongitude(Astronomy.Body.Moon, progDate);
  const natalSun = natal.points.find((p) => p.name === "Sun")!.lon;
  const arc = norm360(pSun - natalSun);
  const asc = natal.points.find((p) => p.name === "Ascendant");
  const mc = natal.points.find((p) => p.name === "Midheaven");

  // Next progressed Moon sign change (it moves ~1° per month of real time).
  let nextSignChange: string | null = null, nextSign: Sign | null = null;
  const moonSign = signOf(pMoon);
  for (let m = 1; m <= 40; m++) {
    const realDate = new Date(now.getTime() + m * 30.44 * DAY);
    const pd = new Date(birthUtc.getTime() + ((realDate.getTime() - birthUtc.getTime()) / YEAR) * DAY);
    const s = signOf(bodyLongitude(Astronomy.Body.Moon, pd));
    if (s !== moonSign) { nextSignChange = iso(realDate).slice(0, 7); nextSign = s; break; }
  }

  // Progressed sign ingresses of the personal planets across the whole life (birth → age 90).
  const signChanges: Progressions["signChanges"] = [];
  const bodies = [["Sun", Astronomy.Body.Sun], ["Mercury", Astronomy.Body.Mercury], ["Venus", Astronomy.Body.Venus], ["Mars", Astronomy.Body.Mars]] as const;
  for (const [name, body] of bodies) {
    let prev = signOf(bodyLongitude(body, birthUtc));
    for (let d = 1; d <= 90; d++) {
      const s = signOf(bodyLongitude(body, new Date(birthUtc.getTime() + d * DAY)));
      if (s !== prev) {
        signChanges.push({ body: name, sign: s, date: iso(new Date(birthUtc.getTime() + d * YEAR)).slice(0, 4) });
        prev = s;
      }
    }
  }

  const angle = norm360(pMoon - pSun);
  const phase = PHASES[Math.floor(angle / 45)];
  return {
    progressedDate: iso(progDate),
    sun: { lon: pSun, sign: signOf(pSun) },
    moon: { lon: pMoon, sign: moonSign, nextSignChange, nextSign },
    ascendant: asc ? { lon: norm360(asc.lon + arc), sign: signOf(asc.lon + arc) } : null,
    midheaven: mc ? { lon: norm360(mc.lon + arc), sign: signOf(mc.lon + arc) } : null,
    solarArc: arc,
    lunarPhase: { name: phase[0], angle, meaning: phase[1] },
    signChanges: signChanges.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export interface SolarReturn {
  moment: string; // ISO UTC
  locationName: string;
  chart: WesternChart;
  highlights: string[];
}

/** The chart for the moment the Sun returns to its natal degree — the current birthday year. */
export function computeSolarReturn(
  natal: WesternChart, birthUtc: Date, lat: number, lon: number, locationName: string,
  hasBirthTime: boolean, system: HouseSystem, now = new Date(),
): SolarReturn {
  const natalSun = natal.points.find((p) => p.name === "Sun")!.lon;
  const birthMonthDay = new Date(Date.UTC(now.getUTCFullYear(), birthUtc.getUTCMonth(), birthUtc.getUTCDate()));
  // The return in force is the most recent one on or before today.
  const year = birthMonthDay.getTime() - 3 * DAY > now.getTime() ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const searchFrom = new Date(Date.UTC(year, birthUtc.getUTCMonth(), birthUtc.getUTCDate()) - 4 * DAY);
  const moment = Astronomy.SearchSunLongitude(natalSun, searchFrom, 10)!.date;
  const chart = computeWesternChart(moment, lat, lon, hasBirthTime, system);

  const p = (n: PointName) => chart.points.find((x) => x.name === n);
  const highlights: string[] = [];
  const asc = p("Ascendant"), sun = p("Sun")!, moon = p("Moon")!;
  if (asc) highlights.push(`Solar Return Ascendant in ${asc.sign}: the year's overall tone and how you approach it.`);
  if (sun.house) highlights.push(`Sun in the ${ordinal(sun.house)} house: the main stage of the year.`);
  highlights.push(`Moon in ${moon.sign}${moon.house ? ` (house ${moon.house})` : ""}: where your emotional focus and needs will be.`);
  for (const a of chart.aspects.filter((x) => x.orb < 2 && (x.a === "Sun" || x.a === "Moon" || x.b === "Sun" || x.b === "Moon")).slice(0, 4)) {
    highlights.push(`${a.a} ${a.type} ${a.b} (orb ${a.orb}°)`);
  }
  if (asc) {
    for (const ang of ["Ascendant", "Midheaven"] as const) {
      const angLon = p(ang)!.lon;
      for (const pl of chart.points.filter((x) => ["Jupiter", "Saturn", "Venus", "Mars", "Pluto", "Uranus"].includes(x.name))) {
        if (angDist(pl.lon, angLon) < 5) highlights.push(`${pl.name} on the Solar Return ${ang}: a defining influence this year.`);
      }
    }
  }
  return { moment: moment.toISOString(), locationName, chart, highlights };
}

export interface EclipseHit {
  date: string;
  kind: string; // e.g. "Total solar eclipse"
  lon: number;
  sign: Sign;
  natalHouse: number | null;
  contacts: string[]; // natal points within 3°
}

/** Solar and lunar eclipses over the next 24 months and the natal points they touch. */
export function upcomingEclipses(natal: WesternChart, now = new Date()): EclipseHit[] {
  const end = now.getTime() + 2 * 365.25 * DAY;
  const out: EclipseHit[] = [];
  const targets = natal.points.filter((p) => !["South Node", "Part of Fortune", "Lilith"].includes(p.name));
  const describe = (date: Date, kind: string, lon: number) => {
    const contacts = targets
      .filter((t) => angDist(t.lon, lon) <= 3 || angDist(t.lon, lon + 180) <= 3)
      .map((t) => `${angDist(t.lon, lon) <= 3 ? "conjunct" : "opposite"} your ${t.name}`);
    out.push({
      date: iso(date), kind, lon: norm360(lon), sign: signOf(lon),
      natalHouse: natal.hasBirthTime ? houseOf(lon, natal.houses) : null, contacts,
    });
  };
  let solar = Astronomy.SearchGlobalSolarEclipse(now);
  while (solar.peak.date.getTime() < end) {
    describe(solar.peak.date, `${cap(solar.kind)} solar eclipse`, bodyLongitude(Astronomy.Body.Sun, solar.peak.date));
    solar = Astronomy.NextGlobalSolarEclipse(solar.peak);
  }
  let lunar = Astronomy.SearchLunarEclipse(now);
  while (lunar.peak.date.getTime() < end) {
    describe(lunar.peak.date, `${cap(lunar.kind)} lunar eclipse`, bodyLongitude(Astronomy.Body.Moon, lunar.peak.date));
    lunar = Astronomy.NextLunarEclipse(lunar.peak);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface RetrogradePeriod {
  planet: "Mercury" | "Venus" | "Mars";
  start: string;
  end: string;
  fromSign: Sign;
  toSign: Sign;
  natalHouses: number[];
}

/** Mercury, Venus and Mars retrograde periods overlapping the next 12 months. */
export function retrogradeCalendar(natal: WesternChart, now = new Date()): RetrogradePeriod[] {
  const out: RetrogradePeriod[] = [];
  const bodies = [["Mercury", Astronomy.Body.Mercury], ["Venus", Astronomy.Body.Venus], ["Mars", Astronomy.Body.Mars]] as const;
  for (const [planet, body] of bodies) {
    const speed = (t: number) => norm360(bodyLongitude(body, new Date(t + DAY / 2)) - bodyLongitude(body, new Date(t - DAY / 2)) + 180) - 180;
    let start: number | null = null;
    // Start 90 days back so a retrograde already in progress is caught.
    const from = now.getTime() - 90 * DAY, to = now.getTime() + 365 * DAY;
    let prevRetro = speed(from) < 0;
    if (prevRetro) start = from;
    for (let t = from + DAY; t <= to; t += DAY) {
      const retro = speed(t) < 0;
      if (retro && !prevRetro) start = t;
      if (!retro && prevRetro && start !== null) {
        if (t >= now.getTime()) out.push(period(planet, body, start, t));
        start = null;
      }
      prevRetro = retro;
    }
    if (start !== null) out.push(period(planet, body, start, to));
  }
  function period(planet: RetrogradePeriod["planet"], body: Astronomy.Body, s: number, e: number): RetrogradePeriod {
    const a = bodyLongitude(body, new Date(s)), b = bodyLongitude(body, new Date(e));
    const houses = natal.hasBirthTime ? [...new Set([houseOf(a, natal.houses), houseOf(b, natal.houses)])] : [];
    return { planet, start: iso(new Date(s)), end: iso(new Date(e)), fromSign: signOf(a), toSign: signOf(b), natalHouses: houses };
  }
  return out.sort((x, y) => x.start.localeCompare(y.start));
}

