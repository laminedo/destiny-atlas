export type NumerologySystem = "pythagorean" | "chaldean";

export interface NumberResult {
  value: number; // final (master numbers kept)
  steps: string; // human-readable calculation
  karmicDebt: number | null;
}

export interface Period {
  number: number;
  fromAge: number;
  toAge: number | null;
}

export interface NumerologyChart {
  system: NumerologySystem;
  birthName: string;
  currentName: string | null;
  lifePath: NumberResult;
  expression: NumberResult;
  soulUrge: NumberResult;
  personality: NumberResult;
  birthday: NumberResult;
  maturity: NumberResult;
  attitude: NumberResult;
  currentNameExpression: NumberResult | null;
  karmicLessons: number[];
  hiddenPassion: number[];
  karmicDebts: { number: number; source: string }[];
  pinnacles: Period[];
  challenges: Period[];
  personalYear: number;
  personalMonth: number;
  personalDay: number;
  universalYear: number;
  loShu: { counts: Record<number, number>; arrowsOfStrength: string[]; missingArrows: string[] };
  luckyNumbers: number[];
}

const MASTER = new Set([11, 22, 33]);
const KARMIC = new Set([13, 14, 16, 19]);

const CHALDEAN: Record<string, number> = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1, B: 2, K: 2, R: 2, C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4, E: 5, H: 5, N: 5, X: 5, U: 6, V: 6, W: 6, O: 7, Z: 7, F: 8, P: 8,
};

function letterValue(ch: string, system: NumerologySystem): number {
  if (system === "chaldean") return CHALDEAN[ch] ?? 0;
  return ((ch.charCodeAt(0) - 65) % 9) + 1;
}

/** Uppercase A–Z only; accents are stripped (é → E), other characters dropped. */
export function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
}

const digitSum = (n: number) => String(n).split("").reduce((a, d) => a + Number(d), 0);

/** Reduce to a single digit, keeping master numbers; records the reduction chain. */
export function reduce(n: number, keepMaster = true): { value: number; chain: number[]; karmicDebt: number | null } {
  const chain = [n];
  let karmicDebt: number | null = KARMIC.has(n) ? n : null;
  while (n > 9 && !(keepMaster && MASTER.has(n))) {
    n = digitSum(n);
    chain.push(n);
    if (KARMIC.has(n) && karmicDebt === null) karmicDebt = n;
  }
  return { value: n, chain, karmicDebt };
}

const single = (n: number) => reduce(n, false).value;

function isVowel(letters: string, i: number): boolean {
  const c = letters[i];
  if ("AEIOU".includes(c)) return true;
  if (c !== "Y") return false;
  // Y is a vowel when it is not next to another vowel (e.g. "Lynn", "Mary").
  const prev = letters[i - 1], next = letters[i + 1];
  return !("AEIOU".includes(prev ?? "") || "AEIOU".includes(next ?? ""));
}

function nameNumber(name: string, system: NumerologySystem, filter: "all" | "vowels" | "consonants"): NumberResult {
  // Each name part is reduced on its own, then the parts are added (traditional method).
  const parts = name.split(/[\s-]+/).map(normalizeName).filter(Boolean);
  const partSums: { part: string; total: number; reduced: number }[] = [];
  let karmic: number | null = null;
  for (const part of parts) {
    let total = 0;
    for (let i = 0; i < part.length; i++) {
      const v = isVowel(part, i);
      if (filter === "vowels" && !v) continue;
      if (filter === "consonants" && v) continue;
      total += letterValue(part[i], system);
    }
    if (total === 0) continue;
    const r = reduce(total);
    karmic ??= r.karmicDebt;
    partSums.push({ part, total, reduced: r.value });
  }
  const sum = partSums.reduce((a, p) => a + p.reduced, 0);
  const final = reduce(sum);
  karmic ??= final.karmicDebt;
  const steps =
    partSums.map((p) => `${p.part} = ${p.total}${p.total !== p.reduced ? ` → ${p.reduced}` : ""}`).join(" · ") +
    (partSums.length ? ` ⇒ ${final.chain.join(" → ")}` : "—");
  return { value: final.value, steps, karmicDebt: karmic };
}

function lifePathNumber(y: number, m: number, d: number): NumberResult {
  const rm = reduce(m), rd = reduce(d), ry = reduce(digitSum(y) > 0 ? y : 0);
  const yearChain = [y, ...reduce(digitSum(y)).chain];
  const total = rm.value + rd.value + ry.value;
  const final = reduce(total);
  const karmicDebt = rd.karmicDebt ?? final.karmicDebt ?? (KARMIC.has(total) ? total : null);
  return {
    value: final.value,
    steps: `Month ${m} → ${rm.value} · Day ${d} → ${rd.value} · Year ${yearChain.join(" → ")} ⇒ ${rm.value} + ${rd.value} + ${ry.value} = ${final.chain.join(" → ")}`,
    karmicDebt,
  };
}

export function personalYear(m: number, d: number, year: number) {
  return reduce(single(m) + single(d) + single(year)).value;
}

// Lo Shu square:  4 9 2 / 3 5 7 / 8 1 6
const ARROWS: { name: string; cells: number[] }[] = [
  { name: "Intellect (4-9-2)", cells: [4, 9, 2] },
  { name: "Emotional balance (3-5-7)", cells: [3, 5, 7] },
  { name: "Practicality (8-1-6)", cells: [8, 1, 6] },
  { name: "Planning (4-3-8)", cells: [4, 3, 8] },
  { name: "Willpower (9-5-1)", cells: [9, 5, 1] },
  { name: "Action (2-7-6)", cells: [2, 7, 6] },
  { name: "Determination (4-5-6)", cells: [4, 5, 6] },
  { name: "Compassion (2-5-8)", cells: [2, 5, 8] },
];

function loShu(y: number, m: number, d: number) {
  const digits = `${d}${m}${y}`.split("").map(Number).filter((n) => n > 0);
  const counts: Record<number, number> = {};
  for (let i = 1; i <= 9; i++) counts[i] = 0;
  for (const n of digits) counts[n]++;
  return {
    counts,
    arrowsOfStrength: ARROWS.filter((a) => a.cells.every((c) => counts[c] > 0)).map((a) => a.name),
    missingArrows: ARROWS.filter((a) => a.cells.every((c) => counts[c] === 0)).map((a) => a.name),
  };
}

export function computeNumerology(
  birthName: string,
  currentName: string | null,
  y: number, m: number, d: number,
  today: Date,
  system: NumerologySystem = "pythagorean",
): NumerologyChart {
  const lifePath = lifePathNumber(y, m, d);
  const expression = nameNumber(birthName, system, "all");
  const soulUrge = nameNumber(birthName, system, "vowels");
  const personality = nameNumber(birthName, system, "consonants");
  const bd = reduce(d);
  const birthday: NumberResult = { value: bd.value, steps: `Day ${bd.chain.join(" → ")}`, karmicDebt: KARMIC.has(d) ? d : null };
  const mat = reduce(lifePath.value + expression.value);
  const maturity: NumberResult = { value: mat.value, steps: `Life Path ${lifePath.value} + Expression ${expression.value} = ${mat.chain.join(" → ")}`, karmicDebt: null };
  const att = reduce(m + d);
  const attitude: NumberResult = { value: att.value, steps: `Month ${m} + Day ${d} = ${att.chain.join(" → ")}`, karmicDebt: null };

  const letters = normalizeName(birthName).split("");
  const freq: Record<number, number> = {};
  for (let i = 1; i <= 9; i++) freq[i] = 0;
  for (const ch of letters) freq[letterValue(ch, system)]++;
  const karmicLessons = Object.entries(freq).filter(([, c]) => c === 0).map(([n]) => Number(n));
  const maxF = Math.max(...Object.values(freq));
  const hiddenPassion = Object.entries(freq).filter(([, c]) => c === maxF && c > 0).map(([n]) => Number(n));

  const karmicDebts: { number: number; source: string }[] = [];
  for (const [label, r] of [["Life Path", lifePath], ["Expression", expression], ["Soul Urge", soulUrge], ["Personality", personality], ["Birthday", birthday]] as const) {
    if (r.karmicDebt) karmicDebts.push({ number: r.karmicDebt, source: label });
  }

  // Pinnacles & challenges
  const sm = single(m), sd = single(d), sy = single(y);
  const p1 = reduce(sm + sd).value, p2 = reduce(sd + sy).value;
  const p3 = reduce(p1 + p2).value, p4 = reduce(sm + sy).value;
  const firstEnd = 36 - single(lifePath.value);
  const pinnacles: Period[] = [
    { number: p1, fromAge: 0, toAge: firstEnd },
    { number: p2, fromAge: firstEnd + 1, toAge: firstEnd + 9 },
    { number: p3, fromAge: firstEnd + 10, toAge: firstEnd + 18 },
    { number: p4, fromAge: firstEnd + 19, toAge: null },
  ];
  const c1 = Math.abs(sm - sd), c2 = Math.abs(sd - sy);
  const challenges: Period[] = [
    { number: c1, fromAge: 0, toAge: firstEnd },
    { number: c2, fromAge: firstEnd + 1, toAge: firstEnd + 9 },
    { number: Math.abs(c1 - c2), fromAge: firstEnd + 10, toAge: firstEnd + 18 },
    { number: Math.abs(sm - sy), fromAge: firstEnd + 19, toAge: null },
  ];

  const ty = today.getFullYear(), tm = today.getMonth() + 1, td = today.getDate();
  // The personal year runs from birthday to birthday.
  const hadBirthday = tm > m || (tm === m && td >= d);
  const py = personalYear(m, d, hadBirthday ? ty : ty - 1);
  const pm = reduce(py + tm).value;
  const pd = reduce(pm + td).value;

  const lucky = [...new Set([lifePath.value, expression.value, birthday.value, soulUrge.value])];

  return {
    system,
    birthName,
    currentName: currentName && currentName.trim() && currentName.trim() !== birthName.trim() ? currentName : null,
    lifePath, expression, soulUrge, personality, birthday, maturity, attitude,
    currentNameExpression: currentName && currentName.trim() && currentName.trim() !== birthName.trim() ? nameNumber(currentName, system, "all") : null,
    karmicLessons, hiddenPassion, karmicDebts, pinnacles, challenges,
    personalYear: py, personalMonth: pm, personalDay: pd,
    universalYear: single(ty),
    loShu: loShu(y, m, d),
    luckyNumbers: lucky,
  };
}
