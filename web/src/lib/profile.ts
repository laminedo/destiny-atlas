import { DateTime } from "luxon";
import { computeChineseChart, ChineseChart } from "./astro/chinese";
import { HouseSystem, WesternChart, computeWesternChart } from "./astro/western";
import { LifeEvent, Transit, currentTransits, lifeCycles } from "./astro/timing";
import { VedicChart, computeVedicChart } from "./astro/vedic";
import {
  EclipseHit, Progressions, RetrogradePeriod, SolarReturn,
  computeProgressions, computeSolarReturn, retrogradeCalendar, upcomingEclipses,
} from "./astro/forecast";
import { NumerologyChart, NumerologySystem, computeNumerology } from "./numerology";

export type TimeAccuracy = "exact" | "approximate" | "unknown";

export interface Place {
  name: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface BirthInput {
  birthName: string;
  currentName?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm local
  timeAccuracy: TimeAccuracy;
  place: Place;
  currentPlace?: Place; // where the person lives now (used for the Solar Return)
  houseSystem: HouseSystem;
  numerologySystem: NumerologySystem;
  focus: string[];
  question?: string;
  pronouns?: string;
}

export interface Profile {
  input: BirthInput;
  utc: string;
  localTime: string;
  utcOffset: string;
  western: WesternChart;
  chinese: ChineseChart;
  numerology: NumerologyChart;
  lifeCycles: LifeEvent[];
  transits: Transit[];
  vedic: VedicChart;
  progressions: Progressions;
  solarReturn: SolarReturn;
  eclipses: EclipseHit[];
  retrogrades: RetrogradePeriod[];
  computedAt: string;
}

export function buildProfile(input: BirthInput, now = new Date()): Profile {
  const hasTime = input.timeAccuracy !== "unknown" && !!input.time;
  const [y, m, d] = input.date.split("-").map(Number);
  const [hh, mm] = hasTime ? input.time!.split(":").map(Number) : [12, 0];
  // Luxon uses the IANA database, which includes historical DST and offset changes.
  const local = DateTime.fromObject({ year: y, month: m, day: d, hour: hh, minute: mm }, { zone: input.place.timezone });
  if (!local.isValid) throw new Error(`Invalid birth date/time or timezone: ${local.invalidExplanation}`);
  const utc = local.toUTC().toJSDate();

  const western = computeWesternChart(utc, input.place.lat, input.place.lon, hasTime, input.houseSystem);
  const sun = western.points.find((p) => p.name === "Sun")!;
  const chinese = computeChineseChart(utc, local, sun.lon, hasTime);
  const numerology = computeNumerology(input.birthName, input.currentName ?? null, y, m, d, now, input.numerologySystem);

  const srPlace = input.currentPlace ?? input.place;

  return {
    input,
    utc: utc.toISOString(),
    localTime: local.toISO()!,
    utcOffset: local.toFormat("ZZ"),
    western,
    chinese,
    numerology,
    lifeCycles: lifeCycles(utc, western.points),
    transits: currentTransits(western.points, now),
    vedic: computeVedicChart(utc, western, now),
    progressions: computeProgressions(utc, western, now),
    solarReturn: computeSolarReturn(western, utc, srPlace.lat, srPlace.lon, srPlace.name, hasTime, input.houseSystem, now),
    eclipses: upcomingEclipses(western, now),
    retrogrades: retrogradeCalendar(western, now),
    computedAt: now.toISOString(),
  };
}
