"use client";

import { useState } from "react";
import { SIGNS, formatDegree, type Sign } from "@/lib/astro/math";
import type { GrahaPosition, VedicChart } from "@/lib/astro/vedic";
import { DASHA_MEANING } from "@/lib/meanings";

const ABBR: Record<GrahaPosition["name"], string> = {
  Lagna: "As", Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};

// South Indian chart: signs are fixed in a 4×4 frame, Pisces top-left, running clockwise.
const SOUTH_CELLS: [Sign, number, number][] = [
  ["Pisces", 0, 0], ["Aries", 1, 0], ["Taurus", 2, 0], ["Gemini", 3, 0],
  ["Aquarius", 0, 1], ["Cancer", 3, 1],
  ["Capricorn", 0, 2], ["Leo", 3, 2],
  ["Sagittarius", 0, 3], ["Scorpio", 1, 3], ["Libra", 2, 3], ["Virgo", 3, 3],
];

// North Indian chart: houses are fixed (1st at top centre, counter-clockwise), signs rotate.
const NORTH_LABELS: [number, number][] = [
  [200, 105], [100, 45], [45, 100], [105, 200], [45, 300], [100, 355],
  [200, 295], [300, 355], [355, 300], [295, 200], [355, 100], [300, 45],
];

type Point = { name: GrahaPosition["name"]; sign: Sign; retrograde: boolean };

function SouthChart({ points, lagnaSign }: { points: Point[]; lagnaSign: Sign | null }) {
  const s = 100;
  return (
    <svg viewBox="0 0 400 400" className="mx-auto w-full max-w-[400px]" role="img" aria-label="South Indian chart">
      {SOUTH_CELLS.map(([sign, x, y]) => {
        const here = points.filter((p) => p.sign === sign);
        return (
          <g key={sign}>
            <rect x={x * s} y={y * s} width={s} height={s} fill={sign === lagnaSign ? "var(--accent-soft)" : "var(--surface)"} stroke="var(--border)" />
            <text x={x * s + 6} y={y * s + 14} fontSize="10" fill="var(--muted)">{sign.slice(0, 3)}</text>
            {sign === lagnaSign && <line x1={x * s} y1={y * s + 22} x2={x * s + 22} y2={y * s} stroke="var(--accent)" strokeWidth="2" />}
            {here.filter((p) => p.name !== "Lagna").map((p, i) => (
              <text key={p.name} x={x * s + 12 + (i % 3) * 28} y={y * s + 40 + Math.floor(i / 3) * 22} fontSize="15" fontWeight="600" fill="var(--text)">
                {ABBR[p.name]}{p.retrograde && !["Rahu", "Ketu"].includes(p.name) ? "ᴿ" : ""}
              </text>
            ))}
          </g>
        );
      })}
      <text x="200" y="200" textAnchor="middle" dominantBaseline="central" fontSize="16" fill="var(--muted)" className="font-serif">Rāśi</text>
    </svg>
  );
}

function NorthChart({ points, lagnaSign }: { points: Point[]; lagnaSign: Sign }) {
  const first = SIGNS.indexOf(lagnaSign);
  return (
    <svg viewBox="0 0 400 400" className="mx-auto w-full max-w-[400px]" role="img" aria-label="North Indian chart">
      <rect x="0" y="0" width="400" height="400" fill="var(--surface)" stroke="var(--border)" />
      <line x1="0" y1="0" x2="400" y2="400" stroke="var(--border)" />
      <line x1="400" y1="0" x2="0" y2="400" stroke="var(--border)" />
      <polygon points="200,0 400,200 200,400 0,200" fill="none" stroke="var(--border)" />
      {NORTH_LABELS.map(([x, y], i) => {
        const sign = SIGNS[(first + i) % 12];
        const here = points.filter((p) => p.sign === sign && p.name !== "Lagna");
        return (
          <g key={i}>
            <text x={x} y={y - 16} textAnchor="middle" fontSize="11" fill={i === 0 ? "var(--accent)" : "var(--muted)"}>{SIGNS.indexOf(sign) + 1}</text>
            <text x={x} y={y + 4} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--text)">
              {here.map((p) => ABBR[p.name] + (p.retrograde && !["Rahu", "Ketu"].includes(p.name) ? "ᴿ" : "")).join(" ")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function VedicTab({ vedic, Section }: { vedic: VedicChart; Section: React.ComponentType<{ title: string; subtitle?: string; children: React.ReactNode }> }) {
  const [style, setStyle] = useState<"south" | "north">("south");
  const [division, setDivision] = useState<"D1" | "D9">("D1");
  const [open, setOpen] = useState<string | null>(vedic.currentDasha?.maha ?? null);
  const all = [...(vedic.lagna ? [vedic.lagna] : []), ...vedic.grahas];
  const points: Point[] = all.map((g) => ({ name: g.name, sign: division === "D1" ? g.sign : g.navamsa, retrograde: g.retrograde }));
  const lagnaSign = vedic.lagna ? (division === "D1" ? vedic.lagna.sign : vedic.lagna.navamsa) : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Section title="Vedic Birth Chart (Jyotiṣa)" subtitle={`Sidereal zodiac · ${vedic.ayanamsaName} ayanāṁśa ${formatDegree(vedic.ayanamsa).split(" ")[0]} · whole-sign houses`}>
        <div className="no-print mb-4 flex flex-wrap gap-2">
          <button className="chip" data-on={division === "D1"} onClick={() => setDivision("D1")}>Rāśi (D1)</button>
          <button className="chip" data-on={division === "D9"} onClick={() => setDivision("D9")}>Navāṁśa (D9)</button>
          <span className="mx-1 w-px bg-line" />
          <button className="chip" data-on={style === "south"} onClick={() => setStyle("south")}>South Indian</button>
          <button className="chip" data-on={style === "north"} onClick={() => setStyle("north")} disabled={!lagnaSign}>North Indian</button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {style === "north" && lagnaSign ? <NorthChart points={points} lagnaSign={lagnaSign} /> : <SouthChart points={points} lagnaSign={lagnaSign} />}
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-muted">Moon nakshatra (janma nakshatra)</p>
              <p className="font-serif text-2xl font-bold">{vedic.moonNakshatra.name}</p>
              <p>Pada {vedic.moonNakshatra.pada} · ruled by {vedic.moonNakshatra.lord}</p>
            </div>
            {vedic.lagna && vedic.lagnaNakshatra ? (
              <div className="rounded-xl bg-surface-2 p-3">
                <p className="text-muted">Lagna (ascendant)</p>
                <p className="font-serif text-2xl font-bold">{vedic.lagna.sign}</p>
                <p>{formatDegree(vedic.lagna.lon)} · {vedic.lagnaNakshatra.name} pada {vedic.lagnaNakshatra.pada}</p>
              </div>
            ) : <p className="rounded-xl bg-surface-2 p-3 text-muted">Add a birth time to see your Lagna and houses.</p>}
            <p className="text-xs text-muted">{division === "D9" ? "The Navāṁśa shows the inner strength of each planet and is central to marriage and dharma." : "Note: Vedic signs are about 24° behind Western signs, so your Vedic Sun is often one sign earlier."}</p>
          </div>
        </div>
      </Section>

      <Section title="Grahas">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted"><tr><th className="py-2 pr-3">Graha</th><th className="pr-3">Sidereal position</th><th className="pr-3">House</th><th className="pr-3">Nakshatra</th><th className="pr-3">D9</th><th>Dignity</th></tr></thead>
            <tbody>
              {all.map((g) => (
                <tr key={g.name} className="border-t border-line">
                  <td className="py-2 pr-3 font-medium">{g.name}{g.retrograde && !["Rahu", "Ketu"].includes(g.name) ? " ℞" : ""}</td>
                  <td className="pr-3 whitespace-nowrap">{formatDegree(g.lon)}</td>
                  <td className="pr-3">{g.house ?? "—"}</td>
                  <td className="pr-3 whitespace-nowrap">{g.nakshatra} {g.pada} <span className="text-muted">({g.nakshatraLord})</span></td>
                  <td className="pr-3">{g.navamsa}</td>
                  <td className="text-muted">{g.dignity ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Vimśottarī Daśā" subtitle={vedic.currentDasha ? `Now: ${vedic.currentDasha.maha} mahādaśā / ${vedic.currentDasha.antar} antardaśā (until ${vedic.currentDasha.antarEnds})` : "Planetary periods from birth"}>
        <ul className="space-y-2">
          {vedic.dashas.map((d) => {
            const current = d.start <= today && today < d.end;
            return (
              <li key={d.start} className="rounded-xl border p-3" style={{ borderColor: current ? "var(--accent)" : "var(--border)", background: current ? "var(--accent-soft)" : "transparent" }}>
                <button className="flex w-full flex-wrap items-baseline justify-between gap-2 text-left" onClick={() => setOpen(open === d.lord ? null : d.lord)}>
                  <span><b>{d.lord}</b> mahādaśā{current ? " · now" : ""}</span>
                  <span className="text-sm text-muted">{d.start} → {d.end}</span>
                </button>
                <p className="mt-1 text-sm text-muted">{DASHA_MEANING[d.lord]}</p>
                {open === d.lord && (
                  <div className="mt-3 grid gap-1 text-xs sm:grid-cols-3">
                    {d.antardashas!.map((a) => {
                      const now = a.start <= today && today < a.end;
                      return <div key={a.start} className={`rounded-lg px-2 py-1 ${now ? "bg-accent text-accent-ink" : "bg-surface-2"}`}>{d.lord}/{a.lord}: {a.start} → {a.end}</div>;
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Yogas">
          {vedic.yogas.length ? (
            <ul className="space-y-2 text-sm">{vedic.yogas.map((y) => <li key={y.name}><b>{y.name}</b>: {y.description}</li>)}</ul>
          ) : <p className="text-sm text-muted">None of the major classical yogas we check for are formed.</p>}
        </Section>
        <Section title="Doshas & Sade Sati">
          <p className="text-sm">
            <b>Mangal Dosha:</b>{" "}
            {vedic.mangalDosha.present
              ? `present (Mars in house ${[vedic.mangalDosha.fromLagna && `${vedic.mangalDosha.marsHouseFromLagna} from Lagna`, vedic.mangalDosha.fromMoon && `${vedic.mangalDosha.marsHouseFromMoon} from the Moon`].filter(Boolean).join(" and ")}). Traditionally balanced by a partner with the same placement; many classical cancellations exist.`
              : "not present."}
          </p>
          <p className="mt-3 text-sm">
            <b>Sade Sati:</b>{" "}
            {vedic.sadeSati.active
              ? `active, ${vedic.sadeSati.phase}. Saturn is transiting ${vedic.sadeSati.saturnSign} relative to your Moon in ${vedic.sadeSati.moonSign}: a 7½-year period of maturity, responsibility, and inner restructuring.`
              : `not active (Saturn in ${vedic.sadeSati.saturnSign}, Moon in ${vedic.sadeSati.moonSign}).`}
          </p>
        </Section>
      </div>
    </div>
  );
}
