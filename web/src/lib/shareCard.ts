import type { Profile } from "./profile";
import { SIGN_GLYPHS, SIGNS, cosd, sind } from "./astro/math";
import { NUMBER_MEANING, SIGN_MEANING } from "./meanings";

export type CardFormat = "square" | "story";
export type CardTheme = "night" | "dawn";

export interface CardOptions {
  format: CardFormat;
  theme: CardTheme;
  nameMode: "full" | "first" | "hidden";
  showBirthDate: boolean;
}

export const CARD_SIZE: Record<CardFormat, [number, number]> = { square: [1080, 1080], story: [1080, 1920] };

const THEMES: Record<CardTheme, { bg: [string, string]; ink: string; muted: string; accent: string; ring: string; star: string }> = {
  night: { bg: ["#0b0a1d", "#2a2366"], ink: "#efeaff", muted: "#a39dc7", accent: "#e4b95b", ring: "rgba(228,185,91,0.35)", star: "rgba(255,255,255,0.8)" },
  dawn: { bg: ["#fbf3e4", "#f1d9c4"], ink: "#1d1a2e", muted: "#6b6580", accent: "#a77b1f", ring: "rgba(167,123,31,0.35)", star: "rgba(59,53,119,0.35)" },
};

const GLYPH: Record<string, string> = { Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇" };
const T = "︎"; // text presentation, so glyphs never render as emoji
const SERIF = '"Cormorant Garamond", Georgia, serif';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';

/** Deterministic pseudo-random stars so the same person always gets the same sky. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function cardTitle(profile: Profile, opts: CardOptions): string | null {
  const name = profile.input.currentName || profile.input.birthName;
  if (opts.nameMode === "hidden") return null;
  return opts.nameMode === "first" ? name.split(/\s+/)[0] : name;
}

export function cardText(profile: Profile): string {
  const w = profile.western;
  const p = (n: string) => w.points.find((x) => x.name === n);
  const asc = p("Ascendant");
  return [
    `☉ ${p("Sun")!.sign} · ☽ ${p("Moon")!.sign}${asc ? ` · ↑ ${asc.sign}` : ""}`,
    `Life Path ${profile.numerology.lifePath.value} · ${profile.chinese.element} ${profile.chinese.animal} · ${profile.vedic.moonNakshatra.name} nakshatra`,
    "My Destiny Atlas ✦",
  ].join("\n");
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawCard(canvas: HTMLCanvasElement, profile: Profile, opts: CardOptions) {
  try {
    await Promise.all([document.fonts.load(`700 80px ${SERIF}`), document.fonts.load(`500 30px ${SANS}`)]);
  } catch { /* fall back to system fonts */ }

  const [W, H] = CARD_SIZE[opts.format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const th = THEMES[opts.theme];
  const story = opts.format === "story";

  // Background, stars, and frame
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
  g.addColorStop(0, th.bg[0]);
  g.addColorStop(1, th.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rand = seeded(profile.input.birthName + profile.input.date);
  ctx.fillStyle = th.star;
  for (let i = 0; i < (story ? 220 : 140); i++) {
    ctx.globalAlpha = 0.25 + rand() * 0.75;
    ctx.beginPath();
    ctx.arc(rand() * W, rand() * H, rand() * 1.8 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = th.ring;
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  const w = profile.western;
  const pt = (n: string) => w.points.find((x) => x.name === n);
  const sun = pt("Sun")!, moon = pt("Moon")!, asc = pt("Ascendant");
  const n = profile.numerology, c = profile.chinese;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Header
  let y = story ? 190 : 120;
  ctx.fillStyle = th.accent;
  ctx.font = `600 ${story ? 30 : 26}px ${SANS}`;
  ctx.fillText("✦  D E S T I N Y   A T L A S  ✦", W / 2, y);
  const title = cardTitle(profile, opts);
  if (title) {
    ctx.fillStyle = th.ink;
    let size = story ? 104 : 86;
    ctx.font = `700 ${size}px ${SERIF}`;
    while (ctx.measureText(title).width > W - 180 && size > 48) ctx.font = `700 ${(size -= 4)}px ${SERIF}`;
    y += story ? 130 : 105;
    ctx.fillText(title, W / 2, y);
  }
  if (opts.showBirthDate) {
    ctx.fillStyle = th.muted;
    ctx.font = `500 ${story ? 32 : 28}px ${SANS}`;
    y += story ? 60 : 50;
    ctx.fillText(new Date(profile.input.date + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), W / 2, y);
  }

  // Zodiac wheel with the person's planets
  const R = story ? 310 : 235;
  const cx = W / 2, cy = story ? y + 120 + R : y + 50 + R;
  const ascLon = asc ? asc.lon : 0;
  const xy = (lon: number, r: number) => { const a = 180 + (lon - ascLon); return [cx + r * cosd(a), cy - r * sind(a)] as const; };
  ctx.strokeStyle = th.ring;
  ctx.lineWidth = 2;
  for (const r of [R, R * 0.8, R * 0.42]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.textBaseline = "middle";
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = xy(i * 30, R), [x2, y2] = xy(i * 30, R * 0.8);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const [gx, gy] = xy(i * 30 + 15, R * 0.9);
    const isMine = [sun.sign, moon.sign, asc?.sign].includes(SIGNS[i]);
    ctx.fillStyle = isMine ? th.accent : th.muted;
    ctx.font = `${isMine ? 700 : 400} ${R * 0.12}px ${SANS}`;
    ctx.fillText(SIGN_GLYPHS[i] + T, gx, gy);
  }
  // planets, nudged apart where they crowd
  const planets = w.points.filter((p) => GLYPH[p.name]).map((p) => ({ name: p.name, lon: p.lon, d: p.lon })).sort((a, b) => a.lon - b.lon);
  for (let pass = 0; pass < 6; pass++) for (let i = 0; i < planets.length; i++) {
    const a = planets[i], b = planets[(i + 1) % planets.length];
    const gap = (((b.d - a.d) % 360) + 360) % 360;
    if (gap < 11) { a.d -= (11 - gap) / 2; b.d += (11 - gap) / 2; }
  }
  for (const p of planets) {
    const [x, y2] = xy(p.d, R * 0.61);
    const big = p.name === "Sun" || p.name === "Moon";
    ctx.fillStyle = big ? th.accent : th.ink;
    ctx.font = `${big ? 700 : 500} ${R * (big ? 0.15 : 0.12)}px ${SANS}`;
    ctx.fillText(GLYPH[p.name] + T, x, y2);
  }
  ctx.fillStyle = th.accent;
  ctx.font = `700 ${R * 0.22}px ${SERIF}`;
  ctx.fillText(String(n.lifePath.value), cx, cy - R * 0.04);
  ctx.fillStyle = th.muted;
  ctx.font = `600 ${R * 0.055}px ${SANS}`;
  ctx.fillText("LIFE PATH", cx, cy + R * 0.16);

  // Big Three
  y = cy + R + (story ? 110 : 75);
  const trio: [string, string][] = [["SUN", sun.sign], ["MOON", moon.sign], ...(asc ? [["RISING", asc.sign] as [string, string]] : [])];
  const colW = (W - 160) / trio.length;
  trio.forEach(([label, sign], i) => {
    const x = 80 + colW * (i + 0.5);
    ctx.fillStyle = th.muted;
    ctx.font = `600 ${story ? 26 : 22}px ${SANS}`;
    ctx.fillText(label, x, y);
    ctx.fillStyle = th.ink;
    ctx.font = `700 ${story ? 62 : 50}px ${SERIF}`;
    ctx.fillText(sign, x, y + (story ? 58 : 48));
  });

  // Other systems
  y += story ? 150 : 115;
  ctx.fillStyle = th.ink;
  ctx.font = `500 ${story ? 32 : 27}px ${SANS}`;
  ctx.fillText(`${c.element} ${c.animal}  ·  ${profile.vedic.moonNakshatra.name}  ·  ${NUMBER_MEANING[n.lifePath.value]?.title.replace(/ \(Master \d+\)/, "") ?? ""}`, W / 2, y);

  // Essence line (story format has room for it)
  if (story) {
    y += 110;
    ctx.fillStyle = th.muted;
    ctx.font = `italic 500 44px ${SERIF}`;
    const essence = `“The gift of ${SIGN_MEANING[sun.sign].gift}, guided by a heart that needs ${SIGN_MEANING[moon.sign].keywords}.”`;
    for (const line of wrap(ctx, essence, W - 240)) { ctx.fillText(line, W / 2, y); y += 58; }
  }

  // Footer
  ctx.fillStyle = th.accent;
  ctx.font = `600 ${story ? 26 : 22}px ${SANS}`;
  ctx.fillText("Discover yours at Destiny Atlas", W / 2, H - (story ? 110 : 80));
}
