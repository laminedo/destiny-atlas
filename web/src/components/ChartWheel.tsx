"use client";

import { useState } from "react";
import { SIGNS, SIGN_GLYPHS, cosd, formatDegree, norm360, sind } from "@/lib/astro/math";
import { ELEMENT_OF, ordinal, type AspectType, type PointName, type WesternChart } from "@/lib/astro/western";
import { HOUSE_MEANING, POINT_MEANING, SIGN_MEANING } from "@/lib/meanings";

export const GLYPH: Record<PointName, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄",
  Uranus: "♅", Neptune: "♆", Pluto: "♇", "North Node": "☊", "South Node": "☋", Lilith: "⚸",
  Ascendant: "AC", Midheaven: "MC", "Part of Fortune": "⊗",
};

const ASPECT_COLOR: Record<AspectType, string> = {
  conjunction: "var(--accent)", trine: "var(--water)", sextile: "var(--good)",
  square: "var(--hard)", opposition: "var(--hard)", quincunx: "var(--muted)",
};

const ELEMENT_VAR = { Fire: "var(--fire)", Earth: "var(--earth)", Air: "var(--air)", Water: "var(--water)" };

export default function ChartWheel({ chart }: { chart: WesternChart }) {
  const [selected, setSelected] = useState<PointName | null>(null);
  const size = 600, c = size / 2;
  const R = { outer: 290, sign: 250, house: 205, planet: 178, inner: 130 };
  const asc = chart.hasBirthTime ? chart.points.find((p) => p.name === "Ascendant")!.lon : 0;
  // Ascendant sits at 9 o'clock; zodiac runs counter-clockwise.
  const xy = (lon: number, r: number) => {
    const a = 180 + (lon - asc);
    return [c + r * cosd(a), c - r * sind(a)] as const;
  };

  // Spread planet glyphs that would overlap.
  const bodies = chart.points.filter((p) => !["Ascendant", "Midheaven", "South Node"].includes(p.name)).sort((a, b) => a.lon - b.lon);
  const placed = bodies.map((p) => ({ ...p, disp: p.lon }));
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < placed.length; i++) {
      const a = placed[i], b = placed[(i + 1) % placed.length];
      const gap = norm360(b.disp - a.disp);
      if (gap < 7 && placed.length > 1) {
        const push = (7 - gap) / 2;
        a.disp -= push;
        b.disp += push;
      }
    }
  }

  const aspects = chart.aspects.filter((a) => {
    const names = ["Ascendant", "Midheaven", "North Node", "Lilith"];
    return !names.includes(a.a) && !names.includes(a.b) && a.type !== "quincunx";
  });
  const sel = selected ? chart.points.find((p) => p.name === selected) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[600px]" role="img" aria-label="Natal chart wheel">
        <circle cx={c} cy={c} r={R.outer} fill="var(--surface)" stroke="var(--border)" />
        {SIGNS.map((s, i) => {
          const start = i * 30;
          const [x1, y1] = xy(start, R.outer);
          const [x2, y2] = xy(start, R.sign);
          const [gx, gy] = xy(start + 15, (R.outer + R.sign) / 2);
          return (
            <g key={s}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" />
              <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central" fontSize="22" fill={ELEMENT_VAR[ELEMENT_OF[s]]} style={{ fontVariantEmoji: "text" } as React.CSSProperties}>
                <title>{`${s}: ${SIGN_MEANING[s].keywords}`}</title>
                {SIGN_GLYPHS[i]}{"︎"}
              </text>
            </g>
          );
        })}
        <circle cx={c} cy={c} r={R.sign} fill="none" stroke="var(--border)" />
        <circle cx={c} cy={c} r={R.house} fill="none" stroke="var(--border)" strokeDasharray="2 4" />
        <circle cx={c} cy={c} r={R.inner} fill="var(--surface-2)" stroke="var(--border)" />

        {/* degree ticks */}
        {Array.from({ length: 72 }, (_, i) => {
          const [x1, y1] = xy(i * 5, R.sign);
          const [x2, y2] = xy(i * 5, R.sign - (i % 2 ? 4 : 8));
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" />;
        })}

        {chart.hasBirthTime && chart.houses.map((h, i) => {
          const angular = i % 3 === 0;
          const [x1, y1] = xy(h, R.sign);
          const [x2, y2] = xy(h, R.inner);
          const next = chart.houses[(i + 1) % 12];
          const mid = h + norm360(next - h) / 2;
          const [hx, hy] = xy(mid, R.inner + 14);
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={angular ? "var(--accent)" : "var(--border)"} strokeWidth={angular ? 2 : 1} />
              <text x={hx} y={hy} textAnchor="middle" dominantBaseline="central" fontSize="11" fill="var(--muted)">{i + 1}</text>
            </g>
          );
        })}
        {chart.hasBirthTime && (["Ascendant", "Midheaven"] as const).map((n) => {
          const p = chart.points.find((x) => x.name === n)!;
          const [x, y] = xy(p.lon, R.outer + 0);
          const [lx, ly] = xy(p.lon, R.sign - 18);
          return (
            <g key={n} onClick={() => setSelected(n)} className="cursor-pointer">
              <circle cx={x} cy={y} r="3" fill="var(--accent)" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700" fill="var(--accent)">{GLYPH[n]}</text>
            </g>
          );
        })}

        {aspects.map((a, i) => {
          const pa = chart.points.find((p) => p.name === a.a)!;
          const pb = chart.points.find((p) => p.name === a.b)!;
          if (a.type === "conjunction") return null;
          const [x1, y1] = xy(pa.lon, R.inner);
          const [x2, y2] = xy(pb.lon, R.inner);
          const dim = selected && a.a !== selected && a.b !== selected;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ASPECT_COLOR[a.type]} strokeWidth={a.orb < 2 ? 1.8 : 1} opacity={dim ? 0.08 : a.orb < 3 ? 0.85 : 0.45} />;
        })}

        {placed.map((p) => {
          const [x, y] = xy(p.disp, R.planet);
          const [tx, ty] = xy(p.lon, R.house);
          const [ix, iy] = xy(p.lon, R.inner);
          const isSel = selected === p.name;
          return (
            <g key={p.name} onClick={() => setSelected(isSel ? null : p.name)} className="cursor-pointer">
              <line x1={tx} y1={ty} x2={tx + (ix - tx) * 0.05} y2={ty + (iy - ty) * 0.05} stroke="var(--muted)" />
              <circle cx={x} cy={y} r="15" fill={isSel ? "var(--accent-soft)" : "var(--surface)"} stroke={isSel ? "var(--accent)" : "transparent"} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={p.name === "Part of Fortune" ? 16 : 20} fill="var(--text)" style={{ fontVariantEmoji: "text" } as React.CSSProperties}>
                <title>{`${p.name} ${formatDegree(p.lon)}${p.retrograde ? " ℞" : ""}`}</title>
                {GLYPH[p.name]}{"︎"}
              </text>
              {p.retrograde && <text x={x + 13} y={y + 10} fontSize="9" fill="var(--hard)">℞</text>}
            </g>
          );
        })}
      </svg>

      <aside className="card h-fit p-5 text-sm">
        {sel ? (
          <>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{GLYPH[sel.name]}{"︎"}</span>
              <div>
                <h3 className="text-xl font-semibold">{sel.name}</h3>
                <p className="text-muted">{formatDegree(sel.lon)}{sel.house ? ` · ${ordinal(sel.house)} house` : ""}{sel.retrograde ? " · retrograde" : ""}</p>
              </div>
            </div>
            <p className="mt-3">{sel.name} represents <b>{POINT_MEANING[sel.name]}</b>.</p>
            <p className="mt-2">In <b>{sel.sign}</b> it expresses through {SIGN_MEANING[sel.sign].keywords}.</p>
            {sel.house && <p className="mt-2">In the {ordinal(sel.house)} house, it plays out in matters of {HOUSE_MEANING[sel.house]}.</p>}
            {sel.dignity && <p className="mt-2 text-muted">Dignity: {sel.dignity}.</p>}
            <ul className="mt-3 space-y-1">
              {chart.aspects.filter((a) => a.a === sel.name || a.b === sel.name).slice(0, 8).map((a, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{a.type} {a.a === sel.name ? a.b : a.a}</span>
                  <span className="text-muted">{a.orb}°</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold">Explore your chart</h3>
            <p className="mt-2 text-muted">Tap any planet to see what it means for you and the aspects it makes.</p>
            <div className="mt-4 space-y-1.5">
              {(["trine", "sextile", "square", "opposition"] as const).map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="inline-block h-0.5 w-6" style={{ background: ASPECT_COLOR[t] }} /> <span className="capitalize">{t}</span>
                </div>
              ))}
            </div>
            {!chart.hasBirthTime && <p className="mt-4 rounded-lg bg-surface-2 p-2 text-muted">Birth time unknown: the wheel starts at 0° Aries and houses are hidden.</p>}
          </>
        )}
      </aside>
    </div>
  );
}
