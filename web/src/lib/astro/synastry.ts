import { Sign, angDist, norm360, signOf } from "./math";
import { relationBetween } from "./chinese";
import type { AspectType, PointName } from "./western";
import type { Profile } from "../profile";

export interface InterAspect {
  a: PointName; // person A's point
  b: PointName; // person B's point
  type: AspectType;
  orb: number;
}

export type Dimension = "Romance" | "Communication" | "Values" | "Stability" | "Chemistry";

export interface Compatibility {
  aName: string;
  bName: string;
  aspects: InterAspect[];
  scores: Record<Dimension, number>;
  overall: number;
  drivers: Record<Dimension, string[]>; // the aspects that moved each score most
  composite: { name: PointName; lon: number; sign: Sign }[];
  numerology: { a: number; b: number; score: number; note: string };
  chinese: { a: string; b: string; relation: string };
  elementBlend: string;
}

const ORBS: Partial<Record<AspectType, number>> = { conjunction: 7, opposition: 7, trine: 6, square: 6, sextile: 4 };
const ANGLES: Record<string, number> = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };

const USED: PointName[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "North Node", "Ascendant", "Midheaven"];

export function interAspects(a: Profile, b: Profile): InterAspect[] {
  const out: InterAspect[] = [];
  const pa = a.western.points.filter((p) => USED.includes(p.name));
  const pb = b.western.points.filter((p) => USED.includes(p.name));
  for (const x of pa) for (const y of pb) {
    // Outer planet to outer planet contacts are generational, not personal.
    if (["Uranus", "Neptune", "Pluto"].includes(x.name) && ["Uranus", "Neptune", "Pluto"].includes(y.name)) continue;
    const d = angDist(x.lon, y.lon);
    for (const [type, angle] of Object.entries(ANGLES)) {
      const orb = Math.abs(d - angle);
      if (orb <= ORBS[type as AspectType]!) {
        out.push({ a: x.name, b: y.name, type: type as AspectType, orb: +orb.toFixed(2) });
        break;
      }
    }
  }
  return out.sort((p, q) => p.orb - q.orb);
}

const pair = (x: PointName, y: PointName, m: PointName, n: PointName) => (x === m && y === n) || (x === n && y === m);

const DIMENSION_PAIRS: Record<Dimension, [PointName, PointName][]> = {
  Romance: [["Sun", "Moon"], ["Venus", "Mars"], ["Venus", "Venus"], ["Moon", "Venus"], ["Sun", "Venus"], ["Venus", "Ascendant"], ["Moon", "Moon"]],
  Communication: [["Mercury", "Mercury"], ["Mercury", "Moon"], ["Mercury", "Sun"], ["Mercury", "Jupiter"], ["Mercury", "Ascendant"], ["Mercury", "Venus"]],
  Values: [["Venus", "Jupiter"], ["Sun", "Jupiter"], ["Jupiter", "Jupiter"], ["Venus", "Venus"], ["Sun", "Sun"], ["Moon", "Jupiter"]],
  Stability: [["Saturn", "Sun"], ["Saturn", "Moon"], ["Saturn", "Venus"], ["Moon", "Moon"], ["Sun", "Moon"], ["North Node", "Sun"], ["North Node", "Moon"], ["Saturn", "Ascendant"]],
  Chemistry: [["Mars", "Mars"], ["Venus", "Mars"], ["Mars", "Pluto"], ["Venus", "Pluto"], ["Mars", "Ascendant"], ["Sun", "Mars"], ["Moon", "Pluto"]],
};

function aspectValue(dim: Dimension, a: InterAspect): number {
  const tight = 1 - (a.orb / (ORBS[a.type] ?? 6)) * 0.6;
  const soft = a.type === "trine" || a.type === "sextile";
  const hard = a.type === "square" || a.type === "opposition";
  const saturn = a.a === "Saturn" || a.b === "Saturn";
  let v = 0;
  if (dim === "Chemistry") v = hard ? 0.8 : a.type === "conjunction" ? 1 : 0.6; // tension fuels attraction
  else if (dim === "Stability" && saturn) v = soft || a.type === "conjunction" ? 1 : -0.7; // Saturn binds, or restricts
  else v = soft ? 1 : a.type === "conjunction" ? 0.9 : -0.6;
  return v * tight;
}

const LP_GROUP = (n: number) => {
  const r = n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n;
  return [1, 5, 7].includes(r) ? 0 : [2, 4, 8].includes(r) ? 1 : 2;
};

export function computeCompatibility(a: Profile, b: Profile): Compatibility {
  const aspects = interAspects(a, b);
  const dims = Object.keys(DIMENSION_PAIRS) as Dimension[];
  const scores = {} as Record<Dimension, number>;
  const drivers = {} as Record<Dimension, string[]>;
  for (const dim of dims) {
    const relevant = aspects.filter((x) => DIMENSION_PAIRS[dim].some(([m, n]) => pair(x.a, x.b, m, n)));
    const contributions = relevant.map((x) => ({ x, v: aspectValue(dim, x) }));
    const sum = contributions.reduce((acc, c) => acc + c.v, 0);
    scores[dim] = Math.round(Math.max(18, Math.min(97, 55 + 14 * sum)));
    drivers[dim] = contributions
      .sort((p, q) => Math.abs(q.v) - Math.abs(p.v))
      .slice(0, 3)
      .map(({ x }) => `${a.input.birthName.split(" ")[0]}'s ${x.a} ${x.type} ${b.input.birthName.split(" ")[0]}'s ${x.b} (${x.orb}°)`);
  }

  const la = a.numerology.lifePath.value, lb = b.numerology.lifePath.value;
  const numScore = la === lb ? 78 : LP_GROUP(la) === LP_GROUP(lb) ? 88 : 62;
  const numNote = la === lb
    ? "Mirror numbers: deep recognition, but you may share the same blind spots."
    : LP_GROUP(la) === LP_GROUP(lb)
      ? "Natural harmony: your life paths move in a similar rhythm."
      : "Complementary paths: you grow by learning each other's way of seeing the world.";

  const chineseRel = relationBetween(a.chinese.animal, b.chinese.animal);
  const chineseScore = /Clash/.test(chineseRel) ? 45 : /Harmony|Secret friend/.test(chineseRel) ? 90 : /Same/.test(chineseRel) ? 72 : 65;

  // Composite chart: nearer midpoints of matching points.
  const composite: Compatibility["composite"] = [];
  for (const name of ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Ascendant", "Midheaven"] as PointName[]) {
    const x = a.western.points.find((p) => p.name === name), y = b.western.points.find((p) => p.name === name);
    if (!x || !y) continue;
    let mid = norm360(x.lon + norm360(y.lon - x.lon) / 2);
    if (norm360(y.lon - x.lon) > 180) mid = norm360(mid + 180);
    composite.push({ name, lon: mid, sign: signOf(mid) });
  }

  const dom = (p: Profile) => Object.entries(p.western.elements).sort((m, n) => n[1] - m[1])[0][0];
  const ea = dom(a), eb = dom(b);
  const blend = ea === eb ? `Both strongest in ${ea}: you instinctively understand each other's temperament.`
    : ([["Fire", "Air"], ["Earth", "Water"]].some(([m, n]) => (ea === m && eb === n) || (ea === n && eb === m)))
      ? `${ea} and ${eb} feed each other: a naturally supportive mix.`
      : `${ea} meets ${eb}: different temperaments that balance each other when you respect the difference.`;

  const astroAvg = dims.reduce((acc, d) => acc + scores[d], 0) / dims.length;
  return {
    aName: a.input.currentName || a.input.birthName,
    bName: b.input.currentName || b.input.birthName,
    aspects,
    scores,
    overall: Math.round(astroAvg * 0.7 + numScore * 0.15 + chineseScore * 0.15),
    drivers,
    composite,
    numerology: { a: la, b: lb, score: numScore, note: numNote },
    chinese: { a: `${a.chinese.element} ${a.chinese.animal}`, b: `${b.chinese.element} ${b.chinese.animal}`, relation: chineseRel },
    elementBlend: blend,
  };
}
