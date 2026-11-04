"use client";

import ChartWheel from "./ChartWheel";
import type { Profile } from "@/lib/profile";
import { formatDegree } from "@/lib/astro/math";
import { ordinal } from "@/lib/astro/western";
import { HOUSE_MEANING } from "@/lib/meanings";

type SectionType = React.ComponentType<{ title: string; subtitle?: string; children: React.ReactNode }>;

const RETRO_MEANING = {
  Mercury: "review contracts, back up data, reconnect with old contacts; good for editing, not launching",
  Venus: "re-evaluate love, money, and values; old flames and old desires resurface",
  Mars: "rethink strategy and conserve energy; revisit unfinished battles rather than starting new ones",
};

export default function ForecastTab({ profile, Section, onChangeLocation }: { profile: Profile; Section: SectionType; onChangeLocation: () => void }) {
  const { progressions: pr, solarReturn: sr, eclipses, retrogrades } = profile;
  const srDate = new Date(sr.moment);
  const nextYear = new Date(srDate.getTime() + 365.25 * 86400000);

  return (
    <div className="space-y-6">
      <Section title="Secondary Progressions" subtitle={`How you have evolved since birth · progressed chart for ${pr.progressedDate} (one day after birth = one year of life)`}>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-surface-2 p-3"><p className="text-muted">Progressed Sun</p><p className="font-serif text-2xl font-bold">{pr.sun.sign}</p><p>{formatDegree(pr.sun.lon)}</p><p className="mt-1 text-xs text-muted">Your evolving identity and life focus.</p></div>
          <div className="rounded-xl bg-surface-2 p-3"><p className="text-muted">Progressed Moon</p><p className="font-serif text-2xl font-bold">{pr.moon.sign}</p><p>{formatDegree(pr.moon.lon)}</p><p className="mt-1 text-xs text-muted">{pr.moon.nextSign ? `Moves into ${pr.moon.nextSign} around ${pr.moon.nextSignChange}.` : "Your current emotional climate (changes sign every ~2.5 years)."}</p></div>
          {pr.ascendant && <div className="rounded-xl bg-surface-2 p-3"><p className="text-muted">Progressed Ascendant</p><p className="font-serif text-2xl font-bold">{pr.ascendant.sign}</p><p>{formatDegree(pr.ascendant.lon)}</p><p className="mt-1 text-xs text-muted">Solar arc · how your persona has matured.</p></div>}
          {pr.midheaven && <div className="rounded-xl bg-surface-2 p-3"><p className="text-muted">Progressed Midheaven</p><p className="font-serif text-2xl font-bold">{pr.midheaven.sign}</p><p>{formatDegree(pr.midheaven.lon)}</p><p className="mt-1 text-xs text-muted">Solar arc · your evolving vocation.</p></div>}
        </div>
        <div className="mt-4 rounded-xl border border-line p-4">
          <p className="text-sm text-muted">Progressed lunar phase</p>
          <p className="font-serif text-2xl font-bold">{pr.lunarPhase.name}</p>
          <p className="text-sm">{pr.lunarPhase.meaning}</p>
        </div>
        {pr.signChanges.length > 0 && (
          <p className="mt-4 text-sm text-muted">
            Lifetime progressed sign changes: {pr.signChanges.map((c) => `${c.body} → ${c.sign} (${c.date})`).join(" · ")}
          </p>
        )}
      </Section>

      <Section
        title={`Solar Return ${srDate.getUTCFullYear()}–${nextYear.getUTCFullYear()}`}
        subtitle={`Your birthday chart for this year · Sun returned to its birth degree on ${srDate.toUTCString().slice(5, 22)} UTC · cast for ${sr.locationName}`}
      >
        <ul className="mb-4 space-y-1 text-sm">
          {sr.highlights.map((h, i) => <li key={i}>✦ {h}</li>)}
        </ul>
        {sr.chart.hasBirthTime && (() => {
          const sun = sr.chart.points.find((p) => p.name === "Sun")!;
          return sun.house ? <p className="mb-4 text-sm text-muted">The {ordinal(sun.house)} house is about {HOUSE_MEANING[sun.house]}.</p> : null;
        })()}
        <ChartWheel chart={sr.chart} />
        <button className="btn-ghost no-print mt-4 text-sm" onClick={onChangeLocation}>
          {profile.input.currentPlace ? "Change where you spent your birthday" : "Spent your birthday elsewhere? Set your location"}
        </button>
      </Section>

      <Section title="Eclipses in the Next 2 Years" subtitle="Eclipses that touch your natal points (within 3°) mark turning points in those areas of life.">
        <ul className="space-y-2 text-sm">
          {eclipses.map((e) => (
            <li key={e.date + e.kind} className="rounded-xl px-3 py-2" style={{ background: e.contacts.length ? "var(--accent-soft)" : "var(--surface-2)" }}>
              <div className="flex flex-wrap justify-between gap-2"><b>{e.kind}</b><span className="text-muted">{e.date}</span></div>
              <p>{formatDegree(e.lon)}{e.natalHouse ? ` · your ${ordinal(e.natalHouse)} house (${HOUSE_MEANING[e.natalHouse]})` : ""}</p>
              {e.contacts.length > 0 && <p className="text-xs font-medium">Personal hit: {e.contacts.join(", ")}</p>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Retrograde Calendar" subtitle="The next 12 months, and the area of your chart each retrograde moves through.">
        <ul className="space-y-2 text-sm">
          {retrogrades.map((r) => (
            <li key={r.planet + r.start} className="rounded-xl bg-surface-2 px-3 py-2">
              <div className="flex flex-wrap justify-between gap-2"><b>{r.planet} retrograde</b><span className="text-muted">{r.start} → {r.end}</span></div>
              <p>{r.fromSign === r.toSign ? r.fromSign : `${r.fromSign} → ${r.toSign}`}{r.natalHouses.length ? ` · your ${r.natalHouses.map(ordinal).join(" & ")} house` : ""}</p>
              <p className="text-xs text-muted">{RETRO_MEANING[r.planet]}{r.natalHouses.length ? `, especially around ${r.natalHouses.map((h) => HOUSE_MEANING[h]).join(" and ")}` : ""}.</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
