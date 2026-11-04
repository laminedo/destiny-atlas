import { computeWesternChart, computeHouses } from "../src/lib/astro/western";
import { lunarNewYear } from "../src/lib/astro/chinese";
import { computeNumerology } from "../src/lib/numerology";
import { buildProfile } from "../src/lib/profile";
import { formatDegree } from "../src/lib/astro/math";
import { lahiriAyanamsa, nakshatraOf, navamsaOf, vimshottari } from "../src/lib/astro/vedic";
import { bodyLongitude } from "../src/lib/astro/western";
import { computeCompatibility } from "../src/lib/astro/synastry";
import * as Astronomy from "astronomy-engine";

let fails = 0;
const check = (label: string, got: number, want: number, tol: number) => {
  const ok = Math.abs(((got - want + 540) % 360) - 180) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: got ${got.toFixed(3)} want ${want} ±${tol}`);
};
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
};

// J2000.0 reference positions (Astronomical Almanac): apparent Sun 280°22', Moon ~223°19', mean node 125°02'
const j2000 = new Date(Date.UTC(2000, 0, 1, 12));
const c = computeWesternChart(j2000, 51.4769, 0, true);
const p = (n: string) => c.points.find((x) => x.name === n)!;
check("Sun J2000", p("Sun").lon, 280.37, 0.05);
check("Moon J2000", p("Moon").lon, 223.32, 0.2);
check("Mean node J2000", p("North Node").lon, 125.04, 0.01);
check("Mercury J2000", p("Mercury").lon, 271.9, 0.3);
check("Saturn J2000", p("Saturn").lon, 40.4, 0.3);
check("Pluto J2000", p("Pluto").lon, 251.5, 0.3);
check("MC Greenwich J2000", p("Midheaven").lon, 279.6, 0.3);
check("ASC Greenwich J2000", p("Ascendant").lon, 24.3, 0.5);
const h = computeHouses(j2000, 51.4769, 0, "placidus");
console.log("Placidus cusps:", h.cusps.map(formatDegree).join(" | "));
let monotonic = true;
for (let i = 0; i < 12; i++) { const span = ((h.cusps[(i + 1) % 12] - h.cusps[i]) + 360) % 360; if (span <= 0 || span >= 90) monotonic = false; }
eq("Placidus cusps ordered", monotonic, true);

// Mercury retrograde 1–25 April 2024
const r = computeWesternChart(new Date(Date.UTC(2024, 3, 10)), 0, 0, false);
eq("Mercury Rx Apr 10 2024", r.points.find((x) => x.name === "Mercury")!.retrograde, true);
eq("Jupiter direct Apr 10 2024", r.points.find((x) => x.name === "Jupiter")!.retrograde, false);

// Lunar New Year dates
const lny = (y: number) => lunarNewYear(y).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
eq("LNY 2023", lny(2023), "2023-01-22");
eq("LNY 2024", lny(2024), "2024-02-10");
eq("LNY 2025", lny(2025), "2025-01-29");
eq("LNY 1985", lny(1985), "1985-02-20");
eq("LNY 2000", lny(2000), "2000-02-05");
for (const [y, d] of [[1990,"1990-01-27"],[1996,"1996-02-19"],[2006,"2006-01-29"],[2014,"2014-01-31"],[2026,"2026-02-17"]] as const) eq(`LNY ${y}`, lny(y), d);

// Numerology
const n = computeNumerology("John Smith", null, 1990, 12, 25, new Date(2026, 10, 3));
eq("Life Path 1990-12-25", n.lifePath.value, 11);
eq("Expression John Smith", n.expression.value, 8);
const n2 = computeNumerology("Mary", null, 1985, 7, 16, new Date(2026, 10, 3), "chaldean");
eq("Karmic debt birthday 16", n2.karmicDebts.some((k) => k.number === 16), true);

// Full profile incl. Chinese pillars: 2000-01-01 00:30 in Paris
const prof = buildProfile({
  birthName: "Test Person", date: "2000-01-01", time: "00:30", timeAccuracy: "exact",
  place: { name: "Paris", lat: 48.8566, lon: 2.3522, timezone: "Europe/Paris" },
  houseSystem: "placidus", numerologySystem: "pythagorean", focus: [],
});
eq("UTC conversion Paris winter", prof.utc, "1999-12-31T23:30:00.000Z");
eq("Chinese year animal (before LNY 2000)", `${prof.chinese.element} ${prof.chinese.animal}`, "Earth Rabbit");
eq("Day pillar 2000-01-01", `${prof.chinese.pillars[2].stem}-${prof.chinese.pillars[2].branch}`, "Wu-Wu");
eq("Hour animal 00:30", prof.chinese.secretAnimal, "Rat");
const sr = prof.lifeCycles.find((e) => e.label === "First Saturn Return")!;
console.log("First Saturn Return:", sr.dates, "age", sr.age);
eq("Saturn return age", sr.age >= 28 && sr.age <= 30, true);
console.log("Transits now:", prof.transits.slice(0, 4).map((t) => `${t.transiting} ${t.type} ${t.natal} (${t.orb}°)`));
console.log("Patterns:", prof.western.patterns);

// Historical DST: New York, 1975-07-01 12:00 is EDT (UTC-4)
const ny = buildProfile({
  birthName: "A", date: "1975-07-01", time: "12:00", timeAccuracy: "exact",
  place: { name: "NYC", lat: 40.71, lon: -74.0, timezone: "America/New_York" },
  houseSystem: "placidus", numerologySystem: "pythagorean", focus: [],
});
eq("Historical DST NYC 1975", ny.utcOffset, "-04:00");

// --- Phase 2 ---
// Chinese leap months: 2020 (leap 4), 2023 (leap 2), 2033 (leap 11 — the "2033 problem")
for (const [y, d] of [[2020, "2020-01-25"], [2021, "2021-02-12"], [2033, "2033-01-31"], [2034, "2034-02-19"], [2035, "2035-02-08"]] as const) eq(`LNY ${y}`, lny(y), d);

// Lahiri: sidereal Sun is 0° Capricorn at Makar Sankranti (2024-01-15 02:54 IST) and 0° Aries at Mesha Sankranti (2024-04-13 21:15 IST)
const sid = (d: Date) => bodyLongitude(Astronomy.Body.Sun, d) - lahiriAyanamsa(d);
check("Makar Sankranti 2024 sidereal Sun", sid(new Date("2024-01-14T21:24:00Z")), 270, 0.05);
check("Mesha Sankranti 2024 sidereal Sun", sid(new Date("2024-04-13T15:45:00Z")), 0, 0.05);
eq("Nakshatra at 0°", [nakshatraOf(0).name, nakshatraOf(0).pada, nakshatraOf(0).lord], ["Ashwini", 1, "Ketu"]);
eq("Nakshatra at 13.5°", [nakshatraOf(13.5).name, nakshatraOf(13.5).lord], ["Bharani", "Venus"]);
eq("Nakshatra at 359°", [nakshatraOf(359).name, nakshatraOf(359).pada], ["Revati", 4]);
eq("Navamsa 1° Aries / 4° Aries / 0.5° Taurus / 0.5° Cancer", [navamsaOf(1), navamsaOf(4), navamsaOf(30.5), navamsaOf(90.5)], ["Aries", "Taurus", "Capricorn", "Cancer"]);
const das = vimshottari(0, new Date("2000-01-01T00:00:00Z"));
eq("Dasha from 0° Ashwini starts with a full 7-year Ketu", [das[0].lord, das[0].start, das[0].end, das[1].lord], ["Ketu", "2000-01-01", "2006-12-31", "Venus"]);
eq("Antardashas fill the mahadasha", das[1].antardashas!.at(-1)!.end, das[1].end);

// Forecast
const now = new Date("2026-11-03T12:00:00Z");
eq("Solar Return Sun = natal Sun", Math.abs(prof.solarReturn.chart.points[0].lon - prof.western.points[0].lon) < 0.001, true);
eq("Progressed Sun moves ~1°/yr", prof.progressions.solarArc > 25 && prof.progressions.solarArc < 28, true);
eq("Next solar eclipse after 2026-11-03", prof.eclipses.find((e) => e.kind.includes("solar"))?.date, "2027-02-06");
const merc = prof.retrogrades.filter((r) => r.planet === "Mercury");
eq("Mercury retrogrades last 19–25 days", merc.length >= 3 && merc.every((r) => { const d = (Date.parse(r.end) - Date.parse(r.start)) / 86400000; return d >= 18 && d <= 26; }), true);
console.log("Retrogrades:", prof.retrogrades.map((r) => `${r.planet} ${r.start}→${r.end}`).join("; "));
console.log("Vedic:", prof.vedic.grahas.map((g) => `${g.name} ${formatDegree(g.lon)} ${g.nakshatra}`).join(" | "), "dasha", prof.vedic.currentDasha);

// Compatibility with oneself: every planet is conjunct itself
const self = computeCompatibility(prof, prof);
eq("Self-synastry Sun conjunct Sun", self.aspects.some((a) => a.a === "Sun" && a.b === "Sun" && a.type === "conjunction" && a.orb === 0), true);
console.log("Self compatibility:", self.overall, self.scores);
void now;

console.log(fails ? `\n${fails} FAILURES` : "\nAll checks passed");
process.exit(fails ? 1 : 0);
