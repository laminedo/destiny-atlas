import * as Astronomy from "astronomy-engine";
import {
  SIGNS, Sign, angDist, asind, atan2d, cosd, norm360, signOf, sind, tand,
} from "./math";

export type PointName =
  | "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn"
  | "Uranus" | "Neptune" | "Pluto" | "North Node" | "South Node" | "Lilith"
  | "Ascendant" | "Midheaven" | "Part of Fortune";

export type HouseSystem = "placidus" | "whole-sign" | "equal";

export interface ChartPoint {
  name: PointName;
  lon: number;
  sign: Sign;
  degreeInSign: number;
  house: number | null;
  retrograde: boolean;
  speed: number; // degrees per day
  dignity: string | null;
}

export interface Aspect {
  a: PointName;
  b: PointName;
  type: AspectType;
  orb: number;
  applying: boolean;
}

export type AspectType =
  | "conjunction" | "sextile" | "square" | "trine" | "opposition" | "quincunx";

export interface Pattern {
  type: "Grand Trine" | "T-Square" | "Grand Cross" | "Yod" | "Stellium";
  points: PointName[];
  detail?: string;
}

export interface WesternChart {
  points: ChartPoint[];
  houses: number[]; // 12 cusp longitudes, index 0 = 1st house
  houseSystem: HouseSystem;
  houseSystemUsed: HouseSystem | "porphyry";
  aspects: Aspect[];
  patterns: Pattern[];
  elements: Record<"Fire" | "Earth" | "Air" | "Water", number>;
  modalities: Record<"Cardinal" | "Fixed" | "Mutable", number>;
  hemispheres: { north: number; south: number; east: number; west: number };
  chartRuler: PointName;
  dominantPlanet: PointName;
  dominantSign: Sign;
  isDayChart: boolean;
  hasBirthTime: boolean;
}

const PLANETS: [PointName, Astronomy.Body][] = [
  ["Sun", Astronomy.Body.Sun],
  ["Moon", Astronomy.Body.Moon],
  ["Mercury", Astronomy.Body.Mercury],
  ["Venus", Astronomy.Body.Venus],
  ["Mars", Astronomy.Body.Mars],
  ["Jupiter", Astronomy.Body.Jupiter],
  ["Saturn", Astronomy.Body.Saturn],
  ["Uranus", Astronomy.Body.Uranus],
  ["Neptune", Astronomy.Body.Neptune],
  ["Pluto", Astronomy.Body.Pluto],
];

export const PLANET_NAMES = PLANETS.map(([n]) => n);

export const ELEMENT_OF: Record<Sign, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

export const MODALITY_OF: Record<Sign, "Cardinal" | "Fixed" | "Mutable"> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};

/** Modern rulerships (traditional co-rulers noted in meanings). */
export const RULER_OF: Record<Sign, PointName> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun",
  Virgo: "Mercury", Libra: "Venus", Scorpio: "Pluto", Sagittarius: "Jupiter",
  Capricorn: "Saturn", Aquarius: "Uranus", Pisces: "Neptune",
};

const DIGNITIES: Partial<Record<PointName, { domicile: Sign[]; exaltation: Sign[] }>> = {
  Sun: { domicile: ["Leo"], exaltation: ["Aries"] },
  Moon: { domicile: ["Cancer"], exaltation: ["Taurus"] },
  Mercury: { domicile: ["Gemini", "Virgo"], exaltation: ["Virgo"] },
  Venus: { domicile: ["Taurus", "Libra"], exaltation: ["Pisces"] },
  Mars: { domicile: ["Aries", "Scorpio"], exaltation: ["Capricorn"] },
  Jupiter: { domicile: ["Sagittarius", "Pisces"], exaltation: ["Cancer"] },
  Saturn: { domicile: ["Capricorn", "Aquarius"], exaltation: ["Libra"] },
  Uranus: { domicile: ["Aquarius"], exaltation: ["Scorpio"] },
  Neptune: { domicile: ["Pisces"], exaltation: ["Cancer"] },
  Pluto: { domicile: ["Scorpio"], exaltation: ["Aries"] },
};

const opposite = (s: Sign): Sign => SIGNS[(SIGNS.indexOf(s) + 6) % 12];

function dignityOf(name: PointName, sign: Sign): string | null {
  const d = DIGNITIES[name];
  if (!d) return null;
  if (d.domicile.includes(sign)) return "domicile";
  if (d.exaltation.includes(sign)) return "exaltation";
  if (d.domicile.map(opposite).includes(sign)) return "detriment";
  if (d.exaltation.map(opposite).includes(sign)) return "fall";
  return null;
}

/** Geocentric apparent longitude on the true ecliptic of date. */
export function bodyLongitude(body: Astronomy.Body, date: Date): number {
  if (body === Astronomy.Body.Sun) return Astronomy.SunPosition(date).elon;
  if (body === Astronomy.Body.Moon) return Astronomy.EclipticGeoMoon(date).lon;
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon;
}

const julianCenturies = (date: Date) =>
  (Astronomy.MakeTime(date).tt) / 36525;

/** Mean lunar node (Meeus 47.7). */
export function meanNode(date: Date): number {
  const T = julianCenturies(date);
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441);
}

/** Mean Black Moon Lilith (mean lunar apogee, Meeus 47.7 perigee + 180°). */
export function meanLilith(date: Date): number {
  const T = julianCenturies(date);
  const perigee = 83.3532465 + 4069.0137287 * T - 0.01032 * T * T - (T * T * T) / 80053;
  return norm360(perigee + 180);
}

function obliquity(date: Date): number {
  return Astronomy.e_tilt(Astronomy.MakeTime(date)).tobl;
}

/** Right ascension of the meridian (local apparent sidereal time in degrees). */
function ramc(date: Date, lonDeg: number): number {
  return norm360(Astronomy.SiderealTime(date) * 15 + lonDeg);
}

export function ascendantMc(date: Date, lat: number, lon: number) {
  const eps = obliquity(date);
  const r = ramc(date, lon);
  const mc = norm360(atan2d(sind(r), cosd(r) * cosd(eps)));
  const asc = norm360(atan2d(cosd(r), -(sind(r) * cosd(eps) + tand(lat) * sind(eps))));
  return { asc, mc, ramc: r, eps };
}

/** Ecliptic longitude whose right ascension is `ra`. */
const lonFromRa = (ra: number, eps: number) => norm360(atan2d(sind(ra), cosd(ra) * cosd(eps)));

function placidusCusp(r: number, eps: number, lat: number, fraction: number, above: boolean): number | null {
  // above horizon (houses 11, 12): RA = RAMC + f * DSA
  // below horizon (houses 2, 3):   RA = RAMC + 180 - f * NSA
  let lon = norm360(r + (above ? fraction * 90 : 180 - fraction * 90));
  for (let i = 0; i < 50; i++) {
    const dec = asind(sind(eps) * sind(lon));
    const x = tand(lat) * tand(dec);
    if (Math.abs(x) >= 1) return null;
    const ad = asind(x);
    const ra = above ? r + fraction * (90 + ad) : r + 180 - fraction * (90 - ad);
    const next = lonFromRa(norm360(ra), eps);
    if (angDist(next, lon) < 1e-7) return next;
    lon = next;
  }
  return lon;
}

export function computeHouses(date: Date, lat: number, lon: number, system: HouseSystem) {
  const { asc, mc, ramc: r, eps } = ascendantMc(date, lat, lon);
  const cusps: number[] = new Array(12);
  let used: HouseSystem | "porphyry" = system;

  if (system === "whole-sign") {
    const start = Math.floor(asc / 30) * 30;
    for (let i = 0; i < 12; i++) cusps[i] = norm360(start + 30 * i);
  } else if (system === "equal") {
    for (let i = 0; i < 12; i++) cusps[i] = norm360(asc + 30 * i);
  } else {
    const c11 = placidusCusp(r, eps, lat, 1 / 3, true);
    const c12 = placidusCusp(r, eps, lat, 2 / 3, true);
    const c2 = placidusCusp(r, eps, lat, 2 / 3, false);
    const c3 = placidusCusp(r, eps, lat, 1 / 3, false);
    if (c11 === null || c12 === null || c2 === null || c3 === null) {
      // Placidus is undefined near the polar circles; fall back to Porphyry.
      used = "porphyry";
      const q1 = norm360(asc - mc) / 3; // MC -> ASC
      const q2 = norm360(mc + 180 - asc) / 3; // ASC -> IC
      cusps[9] = mc; cusps[10] = norm360(mc + q1); cusps[11] = norm360(mc + 2 * q1);
      cusps[0] = asc; cusps[1] = norm360(asc + q2); cusps[2] = norm360(asc + 2 * q2);
    } else {
      cusps[0] = asc; cusps[1] = c2; cusps[2] = c3;
      cusps[9] = mc; cusps[10] = c11; cusps[11] = c12;
    }
    cusps[3] = norm360(cusps[9] + 180);
    cusps[4] = norm360(cusps[10] + 180);
    cusps[5] = norm360(cusps[11] + 180);
    cusps[6] = norm360(cusps[0] + 180);
    cusps[7] = norm360(cusps[1] + 180);
    cusps[8] = norm360(cusps[2] + 180);
  }
  return { cusps, asc, mc, used };
}

export function houseOf(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    const span = norm360(end - start);
    if (norm360(lon - start) < span) return i + 1;
  }
  return 1;
}

const ASPECTS: { type: AspectType; angle: number; orb: number }[] = [
  { type: "conjunction", angle: 0, orb: 8 },
  { type: "opposition", angle: 180, orb: 8 },
  { type: "trine", angle: 120, orb: 7 },
  { type: "square", angle: 90, orb: 7 },
  { type: "sextile", angle: 60, orb: 5 },
  { type: "quincunx", angle: 150, orb: 3 },
];

const LUMINARIES: PointName[] = ["Sun", "Moon"];

export function findAspects(
  pts: { name: PointName; lon: number; speed: number }[],
  orbScale = 1,
): Aspect[] {
  const out: Aspect[] = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const p = pts[i], q = pts[j];
      if ((p.name === "North Node" && q.name === "South Node") || (p.name === "South Node" && q.name === "North Node")) continue;
      const d = angDist(p.lon, q.lon);
      for (const a of ASPECTS) {
        const bonus = LUMINARIES.includes(p.name) || LUMINARIES.includes(q.name) ? 2 : 0;
        const orb = Math.abs(d - a.angle);
        if (orb <= (a.orb + (a.angle === 150 ? 0 : bonus)) * orbScale) {
          // applying if the orb shrinks a moment later
          const later = angDist(p.lon + p.speed * 0.01, q.lon + q.speed * 0.01);
          out.push({ a: p.name, b: q.name, type: a.type, orb: +orb.toFixed(2), applying: Math.abs(later - a.angle) < orb });
          break;
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

function findPatterns(points: ChartPoint[], aspects: Aspect[]): Pattern[] {
  const has = (a: PointName, b: PointName, t: AspectType) =>
    aspects.some((x) => x.type === t && ((x.a === a && x.b === b) || (x.a === b && x.b === a)));
  // Patterns use the ten planets only; the ASC/MC axis is square by construction.
  const names = points.filter((p) => PLANET_NAMES.includes(p.name)).map((p) => p.name);
  const patterns: Pattern[] = [];
  const seen = new Set<string>();
  const add = (type: Pattern["type"], pts: PointName[], detail?: string) => {
    const key = type + [...pts].sort().join();
    if (!seen.has(key)) { seen.add(key); patterns.push({ type, points: pts, detail }); }
  };

  for (const a of names) for (const b of names) for (const c of names) {
    if (a >= b || b >= c) continue;
    if (has(a, b, "trine") && has(b, c, "trine") && has(a, c, "trine")) add("Grand Trine", [a, b, c]);
  }
  for (const a of names) for (const b of names) {
    if (a >= b || !has(a, b, "opposition")) continue;
    for (const c of names) {
      if (c === a || c === b) continue;
      if (has(a, c, "square") && has(b, c, "square")) {
        const d = names.find((x) => x !== a && x !== b && x !== c && has(c, x, "opposition") && has(a, x, "square") && has(b, x, "square"));
        if (d) add("Grand Cross", [a, b, c, d]);
        else add("T-Square", [a, b, c], `${c} is the focal (apex) planet`);
      }
    }
  }
  for (const a of names) for (const b of names) {
    if (a >= b || !has(a, b, "sextile")) continue;
    for (const c of names) {
      if (c !== a && c !== b && has(a, c, "quincunx") && has(b, c, "quincunx")) add("Yod", [a, b, c], `${c} is the apex ("finger of fate")`);
    }
  }
  const bySign = new Map<Sign, PointName[]>();
  for (const p of points) {
    if (!PLANET_NAMES.includes(p.name)) continue;
    bySign.set(p.sign, [...(bySign.get(p.sign) ?? []), p.name]);
  }
  for (const [sign, ps] of bySign) if (ps.length >= 3) add("Stellium", ps, `in ${sign}`);
  const byHouse = new Map<number, PointName[]>();
  for (const p of points) {
    if (!PLANET_NAMES.includes(p.name) || p.house === null) continue;
    byHouse.set(p.house, [...(byHouse.get(p.house) ?? []), p.name]);
  }
  for (const [house, ps] of byHouse) if (ps.length >= 3) add("Stellium", ps, `in the ${ordinal(house)} house`);
  return patterns;
}

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const WEIGHT: Partial<Record<PointName, number>> = {
  Sun: 3, Moon: 3, Ascendant: 3, Mercury: 2, Venus: 2, Mars: 2,
  Jupiter: 1.5, Saturn: 1.5, Uranus: 1, Neptune: 1, Pluto: 1, Midheaven: 1,
};

export function computeWesternChart(
  utc: Date,
  lat: number,
  lon: number,
  hasBirthTime: boolean,
  system: HouseSystem = "placidus",
): WesternChart {
  const raw: { name: PointName; lon: number; speed: number }[] = PLANETS.map(([name, body]) => {
    const l = bodyLongitude(body, utc);
    const dt = 0.5;
    const before = bodyLongitude(body, new Date(utc.getTime() - dt * 86400000));
    const after = bodyLongitude(body, new Date(utc.getTime() + dt * 86400000));
    let speed = (norm360(after - before + 180) - 180) / (2 * dt);
    if (!isFinite(speed)) speed = 0;
    return { name, lon: l, speed };
  });

  const node = meanNode(utc);
  raw.push({ name: "North Node", lon: node, speed: -0.053 });
  raw.push({ name: "South Node", lon: norm360(node + 180), speed: -0.053 });
  raw.push({ name: "Lilith", lon: meanLilith(utc), speed: 0.111 });

  const { cusps, asc, mc, used } = computeHouses(utc, lat, lon, system);
  const sun = raw[0].lon, moon = raw[1].lon;
  // Day chart when the Sun is above the horizon (houses 7–12).
  const sunHouse = houseOf(sun, cusps);
  const isDayChart = sunHouse >= 7;

  if (hasBirthTime) {
    raw.push({ name: "Ascendant", lon: asc, speed: 360 });
    raw.push({ name: "Midheaven", lon: mc, speed: 360 });
    const pof = isDayChart ? asc + moon - sun : asc + sun - moon;
    raw.push({ name: "Part of Fortune", lon: norm360(pof), speed: 0 });
  }

  const points: ChartPoint[] = raw.map((p) => {
    const sign = signOf(p.lon);
    return {
      ...p,
      lon: norm360(p.lon),
      sign,
      degreeInSign: norm360(p.lon) % 30,
      house: hasBirthTime ? houseOf(p.lon, cusps) : null,
      retrograde: PLANET_NAMES.includes(p.name) && p.speed < 0,
      dignity: dignityOf(p.name, sign),
    };
  });

  const aspectPts = raw.filter((p) => !["South Node", "Part of Fortune"].includes(p.name));
  const aspects = findAspects(aspectPts);
  const patterns = findPatterns(points, aspects);

  const elements = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalities = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  const signScore = new Map<Sign, number>();
  const planetScore = new Map<PointName, number>();
  for (const p of points) {
    const w = WEIGHT[p.name];
    if (!w) continue;
    elements[ELEMENT_OF[p.sign]] += w;
    modalities[MODALITY_OF[p.sign]] += w;
    signScore.set(p.sign, (signScore.get(p.sign) ?? 0) + w);
    // A planet gains strength from what it rules and from dignity.
    const ruler = RULER_OF[p.sign];
    planetScore.set(ruler, (planetScore.get(ruler) ?? 0) + w);
    if (p.dignity === "domicile" || p.dignity === "exaltation") planetScore.set(p.name, (planetScore.get(p.name) ?? 0) + 2);
  }
  const hemispheres = { north: 0, south: 0, east: 0, west: 0 };
  if (hasBirthTime) {
    for (const p of points) {
      if (!PLANET_NAMES.includes(p.name) || p.house === null) continue;
      if (p.house >= 7) hemispheres.south++; else hemispheres.north++;
      if (p.house >= 10 || p.house <= 3) hemispheres.east++; else hemispheres.west++;
    }
  }

  const ascSign = signOf(asc);
  const chartRuler = hasBirthTime ? RULER_OF[ascSign] : RULER_OF[signOf(sun)];
  planetScore.set(chartRuler, (planetScore.get(chartRuler) ?? 0) + 3);
  const top = <K,>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];

  return {
    points,
    houses: cusps,
    houseSystem: system,
    houseSystemUsed: used,
    aspects,
    patterns,
    elements,
    modalities,
    hemispheres,
    chartRuler,
    dominantPlanet: top(planetScore),
    dominantSign: top(signScore),
    isDayChart,
    hasBirthTime,
  };
}
