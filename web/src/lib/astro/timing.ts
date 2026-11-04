import * as Astronomy from "astronomy-engine";
import { norm360 } from "./math";
import { Aspect, ChartPoint, PointName, bodyLongitude, findAspects, meanNode } from "./western";

export interface LifeEvent {
  label: string;
  description: string;
  dates: string[]; // ISO dates of exact hits
  age: number;
}

export interface Transit extends Aspect {
  transiting: PointName;
  natal: PointName;
}

const DAY = 86400000;

/** Dates when `lonAt(t)` crosses `target` between start and end (handles retrograde re-crossings). */
function crossings(lonAt: (d: Date) => number, target: number, start: Date, end: Date, stepDays: number): Date[] {
  const out: Date[] = [];
  const f = (t: number) => norm360(lonAt(new Date(t)) - target + 180) - 180;
  let t0 = start.getTime();
  let v0 = f(t0);
  for (let t1 = t0 + stepDays * DAY; t1 <= end.getTime(); t1 += stepDays * DAY) {
    const v1 = f(t1);
    if (Math.sign(v0) !== Math.sign(v1) && Math.abs(v0 - v1) < 90) {
      let a = t0, b = t1, fa = v0;
      for (let i = 0; i < 40; i++) {
        const mid = (a + b) / 2;
        const fm = f(mid);
        if (Math.sign(fm) === Math.sign(fa)) { a = mid; fa = fm; } else b = mid;
      }
      out.push(new Date((a + b) / 2));
    }
    t0 = t1; v0 = v1;
  }
  return out;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addYears = (d: Date, y: number) => new Date(d.getTime() + y * 365.25 * DAY);

export function lifeCycles(birth: Date, natal: ChartPoint[]): LifeEvent[] {
  const lon = (n: PointName) => natal.find((p) => p.name === n)!.lon;
  const events: LifeEvent[] = [];
  const planet = (b: Astronomy.Body) => (d: Date) => bodyLongitude(b, d);

  const push = (label: string, description: string, hits: Date[]) => {
    if (!hits.length) return;
    events.push({
      label, description, dates: hits.map(iso),
      age: Math.round((hits[0].getTime() - birth.getTime()) / (365.25 * DAY)),
    });
  };

  for (const n of [1, 2, 3]) {
    const center = 29.46 * n;
    push(
      n === 1 ? "First Saturn Return" : n === 2 ? "Second Saturn Return" : "Third Saturn Return",
      n === 1 ? "Coming of age: structures that don't fit fall away; you become the author of your adult life."
        : n === 2 ? "Elder wisdom: reviewing your life's work and choosing what legacy to build."
          : "A rare third return: distilling a lifetime into wisdom.",
      crossings(planet(Astronomy.Body.Saturn), lon("Saturn"), addYears(birth, center - 2), addYears(birth, center + 2), 3),
    );
  }
  for (const n of [1, 2, 3, 4, 5, 6, 7]) {
    push(`Jupiter Return #${n}`, "A new 12-year cycle of growth, opportunity, and expanded faith.",
      crossings(planet(Astronomy.Body.Jupiter), lon("Jupiter"), addYears(birth, 11.86 * n - 1), addYears(birth, 11.86 * n + 1), 2).slice(0, 1));
  }
  push("Uranus Opposition (midlife awakening)", "A wake-up call to live more authentically; sudden changes and liberation.",
    crossings(planet(Astronomy.Body.Uranus), norm360(lon("Uranus") + 180), addYears(birth, 36), addYears(birth, 46), 5));
  push("Neptune Square", "Dissolving illusions; a spiritual re-evaluation of dreams and ideals.",
    crossings(planet(Astronomy.Body.Neptune), norm360(lon("Neptune") + 90), addYears(birth, 35), addYears(birth, 48), 5)
      .concat(crossings(planet(Astronomy.Body.Neptune), norm360(lon("Neptune") - 90), addYears(birth, 35), addYears(birth, 48), 5)).slice(0, 3));
  for (const n of [1, 2, 3, 4]) {
    push(`Nodal Return #${n}`, "A destiny checkpoint: re-aligning with your soul's direction (North Node).",
      crossings(meanNode, lon("North Node"), addYears(birth, 18.6 * n - 1), addYears(birth, 18.6 * n + 1), 5).slice(0, 1));
  }
  return events.sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
}

const SLOW: [PointName, Astronomy.Body][] = [
  ["Jupiter", Astronomy.Body.Jupiter], ["Saturn", Astronomy.Body.Saturn],
  ["Uranus", Astronomy.Body.Uranus], ["Neptune", Astronomy.Body.Neptune], ["Pluto", Astronomy.Body.Pluto],
];

/** Major transits from the slow planets to natal points, right now. */
export function currentTransits(natal: ChartPoint[], now = new Date()): Transit[] {
  const natalTargets = natal.filter((p) => !["South Node", "Part of Fortune", "Lilith"].includes(p.name));
  const out: Transit[] = [];
  for (const [name, body] of SLOW) {
    const l = bodyLongitude(body, now);
    const l2 = bodyLongitude(body, new Date(now.getTime() + DAY));
    const speed = norm360(l2 - l + 180) - 180;
    for (const n of natalTargets) {
      const asp = findAspects([{ name, lon: l, speed }, { name: n.name, lon: n.lon, speed: 0 }], 0.4)
        .filter((a) => a.type !== "quincunx");
      for (const a of asp) out.push({ ...a, transiting: name, natal: n.name });
    }
  }
  return out.sort((a, b) => a.orb - b.orb);
}

export function currentSky(now = new Date()) {
  const bodies: [PointName, Astronomy.Body][] = [
    ["Sun", Astronomy.Body.Sun], ["Moon", Astronomy.Body.Moon], ["Mercury", Astronomy.Body.Mercury],
    ["Venus", Astronomy.Body.Venus], ["Mars", Astronomy.Body.Mars], ...SLOW,
  ];
  return bodies.map(([name, body]) => {
    const l = bodyLongitude(body, now);
    const prev = bodyLongitude(body, new Date(now.getTime() - DAY));
    return { name, lon: l, retrograde: norm360(l - prev + 180) - 180 < 0 };
  });
}

