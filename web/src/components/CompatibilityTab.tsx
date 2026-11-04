"use client";

import { useMemo, useState } from "react";
import AiReading from "./AiReading";
import PlaceSearch from "./PlaceSearch";
import { buildProfile, type BirthInput, type Place, type Profile } from "@/lib/profile";
import { computeCompatibility, type Dimension } from "@/lib/astro/synastry";
import { summarizeProfile } from "@/lib/summary";
import { formatDegree } from "@/lib/astro/math";
import { ASPECT_MEANING } from "@/lib/meanings";

type SectionType = React.ComponentType<{ title: string; subtitle?: string; children: React.ReactNode }>;

const DIM_NOTE: Record<Dimension, string> = {
  Romance: "Affection, tenderness, and feeling loved",
  Communication: "Understanding, conversation, and shared ideas",
  Values: "Shared beliefs, generosity, and life philosophy",
  Stability: "Commitment, security, and staying power",
  Chemistry: "Attraction, passion, and spark",
};

function PartnerForm({ onSubmit }: { onSubmit: (b: BirthInput) => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [unknown, setUnknown] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const ok = name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(date) && (unknown || /^\d{2}:\d{2}$/.test(time)) && place;
  return (
    <div className="space-y-3">
      <input className="input" placeholder="Their full birth name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Their date of birth" />
        <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} disabled={unknown} aria-label="Their time of birth" />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} /> Birth time unknown
      </label>
      <PlaceSearch value={place} onChange={setPlace} />
      <button
        className="btn-primary"
        disabled={!ok}
        onClick={() => onSubmit({
          birthName: name.trim(), date, time: unknown ? undefined : time, timeAccuracy: unknown ? "unknown" : "exact",
          place: place!, houseSystem: "placidus", numerologySystem: "pythagorean", focus: [],
        })}
      >
        Compare our charts ✦
      </button>
    </div>
  );
}

export default function CompatibilityTab({ profile, people, onAddPerson, Section }: {
  profile: Profile;
  people: BirthInput[];
  onAddPerson: (b: BirthInput) => void;
  Section: SectionType;
}) {
  const [partner, setPartner] = useState<BirthInput | null>(null);
  const others = people.filter((p) => !(p.birthName === profile.input.birthName && p.date === profile.input.date));

  const result = useMemo(() => {
    if (!partner) return null;
    try {
      const b: Profile = buildProfile(partner);
      return { b, compat: computeCompatibility(profile, b), error: null };
    } catch (e) {
      return { b: null, compat: null, error: (e as Error).message };
    }
  }, [partner, profile]);

  if (!partner || !result) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Relationship Compatibility" subtitle="Compare your chart with a partner, friend, family member, or colleague.">
          <PartnerForm onSubmit={(b) => { onAddPerson(b); setPartner(b); }} />
        </Section>
        {others.length > 0 && (
          <Section title="Or choose someone saved">
            <ul className="divide-y divide-[var(--border)]">
              {others.map((p) => (
                <li key={p.birthName + p.date}>
                  <button className="w-full py-2 text-left" onClick={() => setPartner(p)}>
                    <span className="font-medium">{p.currentName || p.birthName}</span>
                    <span className="block text-xs text-muted">{p.date} · {p.place.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    );
  }

  if (result.error || !result.compat || !result.b) {
    return <Section title="Something went wrong"><p className="text-hard">{result.error}</p><button className="btn-ghost mt-3" onClick={() => setPartner(null)}>Try again</button></Section>;
  }

  const { compat: c, b } = result;
  const aspectRows = c.aspects.filter((x) => !["Midheaven", "North Node"].includes(x.a) && !["Midheaven", "North Node"].includes(x.b)).slice(0, 16);
  const aiChart = {
    personA: summarizeProfile(profile),
    personB: summarizeProfile(b),
    synastry: {
      overallScore: c.overall,
      dimensionScores: c.scores,
      keyDrivers: c.drivers,
      interAspects: c.aspects.slice(0, 30).map((x) => `A's ${x.a} ${x.type} B's ${x.b} (orb ${x.orb}°)`),
      composite: c.composite.map((x) => `${x.name}: ${formatDegree(x.lon)}`),
      numerology: c.numerology,
      chinese: c.chinese,
      elementBlend: c.elementBlend,
    },
  };

  return (
    <div className="space-y-6">
      <Section title={`${c.aName} & ${c.bName}`} subtitle="Synastry, composite chart, numerology, and Chinese zodiac combined.">
        <div className="grid items-center gap-6 sm:grid-cols-[160px_1fr]">
          <div className="mx-auto flex h-36 w-36 flex-col items-center justify-center rounded-full border-4" style={{ borderColor: "var(--accent)" }}>
            <span className="font-serif text-5xl font-bold">{c.overall}</span>
            <span className="text-xs uppercase tracking-[0.15em] text-muted">overall</span>
          </div>
          <div className="space-y-3">
            {(Object.keys(c.scores) as Dimension[]).map((d) => (
              <div key={d}>
                <div className="flex justify-between text-sm"><span><b>{d}</b> <span className="text-muted">· {DIM_NOTE[d]}</span></span><span>{c.scores[d]}</span></div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${c.scores[d]}%` }} /></div>
                {c.drivers[d].length > 0 && <p className="mt-1 text-xs text-muted">{c.drivers[d].join(" · ")}</p>}
              </div>
            ))}
          </div>
        </div>
        <button className="btn-ghost no-print mt-5 text-sm" onClick={() => setPartner(null)}>Compare with someone else</button>
      </Section>

      <div className="grid gap-6 md:grid-cols-3">
        <Section title="Numerology">
          <p className="font-serif text-3xl font-bold">{c.numerology.a} + {c.numerology.b}</p>
          <p className="text-sm text-muted">Life Paths · {c.numerology.score}/100</p>
          <p className="mt-2 text-sm">{c.numerology.note}</p>
        </Section>
        <Section title="Chinese Zodiac">
          <p className="font-serif text-2xl font-bold">{c.chinese.a} + {c.chinese.b}</p>
          <p className="mt-2 text-sm">{c.chinese.relation}.</p>
        </Section>
        <Section title="Elements">
          <p className="text-sm">{c.elementBlend}</p>
        </Section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Key Synastry Aspects" subtitle={`${c.aName.split(" ")[0]}'s planet → ${c.bName.split(" ")[0]}'s planet`}>
          <ul className="space-y-2 text-sm">
            {aspectRows.map((x, i) => (
              <li key={i} className="rounded-xl bg-surface-2 px-3 py-2">
                <div className="flex justify-between gap-2"><b>{x.a} {x.type} {x.b}</b><span className="text-muted">{x.orb}°</span></div>
                <p className="text-xs text-muted">{ASPECT_MEANING[x.type]}</p>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Composite Chart" subtitle="The relationship as its own entity (midpoints).">
          <ul className="space-y-1 text-sm">
            {c.composite.map((x) => <li key={x.name} className="flex justify-between"><span>{x.name}</span><span className="text-muted">{formatDegree(x.lon)}</span></li>)}
          </ul>
        </Section>
      </div>

      <AiReading
        key={c.bName + (partner?.date ?? "")}
        chart={aiChart}
        cacheKey={`compat:${profile.input.birthName}|${profile.input.date}|${partner.birthName}|${partner.date}`}
        title="Your Compatibility Reading"
        blurb={`A personal reading of the bond between ${c.aName} and ${c.bName}: attraction, communication, challenges, long-term potential, and advice for both of you.`}
        firstRequest="Please write our compatibility reading."
        suggestions={["What will we argue about, and how do we resolve it?", "Is this a long-term match?", "What does each of us need from the other?", "What is the purpose of this relationship?"]}
      />
    </div>
  );
}
