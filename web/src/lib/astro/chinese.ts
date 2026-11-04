import * as Astronomy from "astronomy-engine";
import { DateTime } from "luxon";
import { norm360 } from "./math";

export const ANIMALS = [
  "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
  "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig",
] as const;
export type Animal = (typeof ANIMALS)[number];

export const STEMS = ["Jia", "Yi", "Bing", "Ding", "Wu", "Ji", "Geng", "Xin", "Ren", "Gui"] as const;
export const BRANCHES = ["Zi", "Chou", "Yin", "Mao", "Chen", "Si", "Wu", "Wei", "Shen", "You", "Xu", "Hai"] as const;

export type FiveElement = "Wood" | "Fire" | "Earth" | "Metal" | "Water";
const STEM_ELEMENT: FiveElement[] = ["Wood", "Wood", "Fire", "Fire", "Earth", "Earth", "Metal", "Metal", "Water", "Water"];
// Main qi element of each earthly branch
const BRANCH_ELEMENT: FiveElement[] = ["Water", "Earth", "Wood", "Wood", "Earth", "Fire", "Fire", "Earth", "Metal", "Metal", "Earth", "Water"];

export interface Pillar {
  label: "Year" | "Month" | "Day" | "Hour";
  stem: string;
  branch: string;
  element: FiveElement;
  polarity: "Yang" | "Yin";
  animal: Animal;
}

export interface ChineseChart {
  animal: Animal; // year animal by Lunar New Year
  element: FiveElement;
  polarity: "Yang" | "Yin";
  lunarYear: number;
  lunarNewYear: string; // ISO date of the Lunar New Year that starts the birth's zodiac year
  innerAnimal: Animal; // month
  trueAnimal: Animal; // day
  secretAnimal: Animal | null; // hour
  pillars: Pillar[];
  dayMaster: { stem: string; element: FiveElement; polarity: "Yang" | "Yin" };
  elementBalance: Record<FiveElement, number>;
  bestMatches: Animal[];
  clash: Animal;
  currentYear: { year: number; animal: Animal; element: FiveElement; relation: string };
}

/** Lunar New Year for a Gregorian year: second new moon after the December solstice, in China time. */
const cnDay = (d: Date) => DateTime.fromJSDate(d, { zone: "Asia/Shanghai" }).startOf("day");

/** Start (China midnight) of lunar month 11: the month whose first day is on or before the December solstice day. */
function month11Start(gregorianYear: number): Astronomy.AstroTime {
  const solstice = cnDay(Astronomy.Seasons(gregorianYear).dec_solstice.date);
  let nm = Astronomy.SearchMoonPhase(0, Astronomy.MakeTime(solstice.minus({ days: 31 }).toJSDate()), 40)!;
  for (;;) {
    const next = Astronomy.SearchMoonPhase(0, nm.AddDays(1), 40)!;
    if (cnDay(next.date) > solstice) return nm;
    nm = next;
  }
}

/** Lunar New Year for a Gregorian year, following the modern Chinese calendar rules (including leap months). */
export function lunarNewYear(year: number): Date {
  const a = month11Start(year - 1);
  const bDay = cnDay(month11Start(year).date);
  const starts: Astronomy.AstroTime[] = [a];
  while (cnDay(starts[starts.length - 1].date) < bDay) starts.push(Astronomy.SearchMoonPhase(0, starts[starts.length - 1].AddDays(1), 40)!);
  // starts[] now runs from month 11 to the next month 11, so 13 entries = 12 months, 14 = 13 months (a leap year).
  let newYearIndex = 2;
  if (starts.length === 14) {
    const sunAt = (t: Astronomy.AstroTime) => Astronomy.SunPosition(cnDay(t.date).toJSDate()).elon;
    // The leap month is the first month after month 11 that contains no principal solar term.
    for (let i = 1; i < 13; i++) {
      const hasZhongqi = Math.floor(sunAt(starts[i]) / 30) !== Math.floor(sunAt(starts[i + 1]) / 30);
      if (!hasZhongqi) {
        if (i <= 2) newYearIndex = 3; // a leap 11th or 12th month delays the new year by one month
        break;
      }
    }
  }
  // The new year begins at midnight (UTC+8) on the calendar day of that new moon.
  return cnDay(starts[newYearIndex].date).toJSDate();
}

const pillarFrom = (label: Pillar["label"], cycle: number): Pillar => {
  const s = ((cycle % 10) + 10) % 10;
  const b = ((cycle % 12) + 12) % 12;
  return {
    label,
    stem: STEMS[s],
    branch: BRANCHES[b],
    element: STEM_ELEMENT[s],
    polarity: s % 2 === 0 ? "Yang" : "Yin",
    animal: ANIMALS[b],
  };
};

const TRINES: Animal[][] = [
  ["Rat", "Dragon", "Monkey"], ["Ox", "Snake", "Rooster"],
  ["Tiger", "Horse", "Dog"], ["Rabbit", "Goat", "Pig"],
];
const SECRET_FRIEND: Record<Animal, Animal> = {
  Rat: "Ox", Ox: "Rat", Tiger: "Pig", Pig: "Tiger", Rabbit: "Dog", Dog: "Rabbit",
  Dragon: "Rooster", Rooster: "Dragon", Snake: "Monkey", Monkey: "Snake", Horse: "Goat", Goat: "Horse",
};

export function relationBetween(a: Animal, b: Animal): string {
  if (a === b) return "Same animal — your Ben Ming Nian (birth-sign year), traditionally a year to move carefully";
  const ia = ANIMALS.indexOf(a), ib = ANIMALS.indexOf(b);
  if ((ia + 6) % 12 === ib) return "Clash — a year of change and friction that rewards flexibility";
  if (TRINES.some((t) => t.includes(a) && t.includes(b))) return "Harmony (trine) — supportive, flowing energy";
  if (SECRET_FRIEND[a] === b) return "Secret friend — quiet, behind-the-scenes support";
  return "Neutral — results follow effort";
}

export function computeChineseChart(utc: Date, localTime: DateTime, sunLon: number, hasBirthTime: boolean): ChineseChart {
  const y = localTime.year;
  const lny = lunarNewYear(y);
  const lunarYear = utc < lny ? y - 1 : y;
  const lnyStart = utc < lny ? lunarNewYear(y - 1) : lny;
  const yearCycle = lunarYear - 4; // 4 CE was a Jia-Zi year
  const yearP = pillarFrom("Year", yearCycle);

  // BaZi year & month pillars follow the solar terms (Li Chun = Sun at 315°).
  const liChun = Astronomy.SearchSunLongitude(315, new Date(Date.UTC(y, 0, 20)), 40)!.date;
  const baziYear = utc < liChun ? y - 1 : y;
  const baziYearCycle = baziYear - 4;
  const monthIndex = Math.floor(norm360(sunLon - 315) / 30); // 0 = Tiger month
  const monthBranch = (monthIndex + 2) % 12;
  const yearStem = ((baziYearCycle % 10) + 10) % 10;
  const monthStem = ((yearStem % 5) * 2 + 2 + monthIndex) % 10;
  const monthP = pillarFrom("Month", findCycle(monthStem, monthBranch));

  // Day pillar from the Julian Day Number of the local civil date.
  const jdn = julianDayNumber(localTime.year, localTime.month, localTime.day);
  const dayCycle = ((jdn - 11) % 60 + 60) % 60;
  const dayP = pillarFrom("Day", dayCycle);

  const pillars: Pillar[] = [pillarFrom("Year", baziYearCycle), monthP, dayP];
  let secretAnimal: Animal | null = null;
  if (hasBirthTime) {
    const hourBranch = Math.floor(((localTime.hour + 1) % 24) / 2);
    const dayStem = dayCycle % 10;
    const hourStem = ((dayStem % 5) * 2 + hourBranch) % 10;
    const hourP = pillarFrom("Hour", findCycle(hourStem, hourBranch));
    pillars.push(hourP);
    secretAnimal = hourP.animal;
  }

  const elementBalance: Record<FiveElement, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const p of pillars) {
    elementBalance[p.element] += 1;
    elementBalance[BRANCH_ELEMENT[BRANCHES.indexOf(p.branch as (typeof BRANCHES)[number])]] += 1;
  }

  const animal = yearP.animal;
  const trine = TRINES.find((t) => t.includes(animal))!.filter((a) => a !== animal);
  const nowYear = new Date().getUTCFullYear();
  const nowLunar = new Date() < lunarNewYear(nowYear) ? nowYear - 1 : nowYear;
  const nowP = pillarFrom("Year", nowLunar - 4);

  return {
    animal,
    element: yearP.element,
    polarity: yearP.polarity,
    lunarYear,
    lunarNewYear: DateTime.fromJSDate(lnyStart, { zone: "Asia/Shanghai" }).toISODate()!,
    innerAnimal: monthP.animal,
    trueAnimal: dayP.animal,
    secretAnimal,
    pillars,
    dayMaster: { stem: dayP.stem, element: dayP.element, polarity: dayP.polarity },
    elementBalance,
    bestMatches: [...trine, SECRET_FRIEND[animal]],
    clash: ANIMALS[(ANIMALS.indexOf(animal) + 6) % 12],
    currentYear: { year: nowLunar, animal: nowP.animal, element: nowP.element, relation: relationBetween(animal, nowP.animal) },
  };
}

export function julianDayNumber(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** Position in the 60-cycle for a stem/branch pair (they share parity). */
function findCycle(stem: number, branch: number): number {
  for (let n = 0; n < 60; n++) if (n % 10 === stem && n % 12 === branch) return n;
  return 0;
}
