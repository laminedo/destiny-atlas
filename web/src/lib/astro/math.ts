export const DEG = Math.PI / 180;

export const norm360 = (x: number) => ((x % 360) + 360) % 360;

export const sind = (x: number) => Math.sin(x * DEG);
export const cosd = (x: number) => Math.cos(x * DEG);
export const tand = (x: number) => Math.tan(x * DEG);
export const asind = (x: number) => Math.asin(Math.max(-1, Math.min(1, x))) / DEG;
export const atan2d = (y: number, x: number) => Math.atan2(y, x) / DEG;

/** Smallest angular distance between two longitudes, 0..180. */
export function angDist(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
}

export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;
export type Sign = (typeof SIGNS)[number];

export const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

export function signOf(lon: number): Sign {
  return SIGNS[Math.floor(norm360(lon) / 30)];
}

export function formatDegree(lon: number): string {
  const l = norm360(lon);
  const inSign = l % 30;
  let d = Math.floor(inSign);
  let m = Math.round((inSign - d) * 60);
  if (m === 60) {
    d += 1;
    m = 0;
  }
  return `${d}°${String(m).padStart(2, "0")}′ ${signOf(l)}`;
}
