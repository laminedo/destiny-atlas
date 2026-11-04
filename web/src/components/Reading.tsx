"use client";

import { useState } from "react";
import ChartWheel, { GLYPH } from "./ChartWheel";
import AiReading from "./AiReading";
import VedicTab from "./VedicTab";
import ForecastTab from "./ForecastTab";
import CompatibilityTab from "./CompatibilityTab";
import ShareCard from "./ShareCard";
import { summarizeProfile } from "@/lib/summary";
import type { BirthInput, Profile } from "@/lib/profile";
import { formatDegree } from "@/lib/astro/math";
import { ordinal, type ChartPoint } from "@/lib/astro/western";
import {
  ANIMAL_MEANING, ASPECT_MEANING, ELEMENT_MEANING, FIVE_ELEMENT_MEANING, HOUSE_MEANING, KARMIC_DEBT,
  NUMBER_MEANING, PERSONAL_YEAR_MEANING, POINT_MEANING, SIGN_MEANING,
} from "@/lib/meanings";

const TABS = ["Overview", "Birth Chart", "Vedic", "Numerology", "Chinese", "Timeline", "Forecast", "Compatibility", "Full Reading"] as const;
type Tab = (typeof TABS)[number];

const num = (n: number) => NUMBER_MEANING[n] ?? NUMBER_MEANING[0];

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h3 className="text-2xl font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Bars({ data, colors }: { data: Record<string, number>; colors: Record<string, string> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="grid grid-cols-[80px_1fr_44px] items-center gap-3 text-sm">
          <span>{k}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${(v / total) * 100}%`, background: colors[k] ?? "var(--accent)" }} />
          </div>
          <span className="text-right text-muted">{Math.round((v / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

function NumberCard({ label, value, steps, note }: { label: string; value: number; steps?: string; note?: string }) {
  const m = num(value);
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.15em] text-muted">{label}</span>
        <span className="font-serif text-4xl font-bold text-accent">{value}</span>
      </div>
      <p className="mt-1 font-medium">{m.title}</p>
      <p className="mt-1 text-sm text-muted">{m.essence}</p>
      {note && <p className="mt-2 text-sm">{note}</p>}
      {steps && (
        <details className="mt-2 text-xs text-muted">
          <summary className="cursor-pointer">How it&apos;s calculated</summary>
          <p className="mt-1 break-words font-mono">{steps}</p>
        </details>
      )}
    </div>
  );
}

const ELEMENT_COLORS = { Fire: "var(--fire)", Earth: "var(--earth)", Air: "var(--air)", Water: "var(--water)", Wood: "var(--wood)", Metal: "var(--metal)" };

export default function Reading({ profile, cacheKey, onEdit, onNew, people, onAddPerson }: {
  profile: Profile;
  cacheKey: string;
  onEdit: () => void;
  onNew: () => void;
  people: BirthInput[];
  onAddPerson: (b: BirthInput) => void;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [sharing, setSharing] = useState(false);
  const w = profile.western, n = profile.numerology, c = profile.chinese;
  const pt = (name: ChartPoint["name"]) => w.points.find((p) => p.name === name);
  const sun = pt("Sun")!, moon = pt("Moon")!, asc = pt("Ascendant");
  const firstName = profile.input.birthName.split(/\s+/)[0];
  const domElement = (Object.entries(w.elements).sort((a, b) => b[1] - a[1])[0][0]) as keyof typeof ELEMENT_MEANING;
  const lowElement = (Object.entries(w.elements).sort((a, b) => a[1] - b[1])[0][0]) as keyof typeof ELEMENT_MEANING;
  const age = Math.floor((Date.parse(profile.computedAt) - Date.parse(profile.utc)) / (365.25 * 86400000));
  const currentPinnacle = n.pinnacles.find((p) => age >= p.fromAge && (p.toAge === null || age <= p.toAge))!;
  const upcoming = profile.lifeCycles.filter((e) => e.dates[e.dates.length - 1] >= profile.computedAt.slice(0, 10)).slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">The Destiny Atlas of</p>
          <h1 className="text-4xl font-bold sm:text-5xl">{profile.input.currentName || profile.input.birthName}</h1>
          <p className="mt-1 text-sm text-muted">
            {new Date(profile.input.date + "T00:00").toLocaleDateString(undefined, { dateStyle: "long" })}
            {profile.input.timeAccuracy !== "unknown" && profile.input.time ? ` · ${profile.input.time}${profile.input.timeAccuracy === "approximate" ? " (approx.)" : ""}` : " · time unknown"}
            {" · "}{profile.input.place.name} · UTC{profile.utcOffset}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button className="btn-primary text-sm" onClick={() => setSharing(true)}>Share card ✦</button>
          <button className="btn-ghost text-sm" onClick={onEdit}>Edit details</button>
          <button className="btn-ghost text-sm" onClick={onNew}>New reading</button>
        </div>
      </header>

      <nav className="no-print -mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
        {TABS.map((t) => (
          <button key={t} className="chip whitespace-nowrap" data-on={tab === t} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>

      {tab === "Overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[{ label: "Sun", p: sun, sub: "Who you are" }, { label: "Moon", p: moon, sub: "What you need" }, ...(asc ? [{ label: "Rising", p: asc, sub: "How you meet the world" }] : [])].map(({ label, p, sub }) => (
              <div key={label} className="card p-5">
                <p className="text-xs uppercase tracking-[0.15em] text-muted">{label} · {sub}</p>
                <p className="mt-2 font-serif text-3xl font-bold">{p.name === "Ascendant" ? "↑" : GLYPH[p.name]}{"︎"} {p.sign}</p>
                <p className="text-sm text-muted">{formatDegree(p.lon)}{p.house ? ` · ${ordinal(p.house)} house` : ""}</p>
                <p className="mt-2 text-sm">{SIGN_MEANING[p.sign].keywords}</p>
              </div>
            ))}
            {!asc && (
              <div className="card p-5 text-sm text-muted">
                <p className="text-xs uppercase tracking-[0.15em]">Rising</p>
                <p className="mt-2">Add your birth time to reveal your Rising sign and houses.</p>
                <button className="btn-ghost mt-3" onClick={onEdit}>Add birth time</button>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberCard label="Life Path" value={n.lifePath.value} steps={n.lifePath.steps} />
            <NumberCard label="Expression" value={n.expression.value} steps={n.expression.steps} />
            <div className="rounded-2xl border border-line bg-surface-2 p-4">
              <span className="text-xs uppercase tracking-[0.15em] text-muted">Chinese Zodiac</span>
              <p className="mt-2 font-serif text-3xl font-bold">{c.element} {c.animal}</p>
              <p className="text-sm text-muted">{c.polarity} · lunar year {c.lunarYear}</p>
              <p className="mt-2 text-sm">{ANIMAL_MEANING[c.animal]}</p>
            </div>
          </div>
          <Section title="Your Cosmic Essence" subtitle="An instant snapshot. Generate the Full Reading for a deep, personalized interpretation.">
            <div className="prose-reading">
              <p>
                {firstName}, your Sun in <b>{sun.sign}</b> gives you a core of {SIGN_MEANING[sun.sign].keywords}; your gift is {SIGN_MEANING[sun.sign].gift}.
                Emotionally, your Moon in <b>{moon.sign}</b> needs {SIGN_MEANING[moon.sign].keywords}.
                {asc && <> You meet the world as a <b>{asc.sign}</b> Rising, so others first see {SIGN_MEANING[asc.sign].keywords}.</>}
              </p>
              <p>
                Your Life Path <b>{n.lifePath.value}</b> ({num(n.lifePath.value).title}) points your destiny toward {num(n.lifePath.value).essence}, while your
                Expression <b>{n.expression.value}</b> shows the talents you bring: {num(n.expression.value).essence}. Deep down, your Soul Urge <b>{n.soulUrge.value}</b> longs for {num(n.soulUrge.value).essence}.
              </p>
              <p>
                Your chart is strongest in <b>{domElement}</b> ({ELEMENT_MEANING[domElement]}) and lightest in <b>{lowElement}</b>, which is an invitation to consciously develop {ELEMENT_MEANING[lowElement]}.
                As a <b>{c.element} {c.animal}</b>, you are {ANIMAL_MEANING[c.animal]}, with a {c.dayMaster.element} Day Master ({FIVE_ELEMENT_MEANING[c.dayMaster.element]}).
              </p>
              <p>
                Right now you&apos;re in a <b>Personal Year {n.personalYear}</b>: {PERSONAL_YEAR_MEANING[n.personalYear]} You are living your Pinnacle <b>{currentPinnacle.number}</b> chapter ({num(currentPinnacle.number).essence}).
              </p>
            </div>
            <button className="btn-primary no-print mt-4" onClick={() => setTab("Full Reading")}>Get my Complete Life Reading ✦</button>
          </Section>
        </div>
      )}

      {tab === "Birth Chart" && (
        <div className="space-y-6">
          <Section title="Natal Chart" subtitle={`Tropical zodiac · ${w.hasBirthTime ? `${w.houseSystemUsed} houses` : "no houses (birth time unknown)"} · ${w.isDayChart ? "day" : "night"} chart · chart ruler ${w.chartRuler}`}>
            <ChartWheel chart={w} />
          </Section>
          <Section title="Placements">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted">
                  <tr><th className="py-2 pr-3">Point</th><th className="pr-3">Position</th><th className="pr-3">House</th><th className="pr-3">Notes</th><th>Meaning</th></tr>
                </thead>
                <tbody>
                  {w.points.map((p) => (
                    <tr key={p.name} className="border-t border-line align-top">
                      <td className="py-2 pr-3 font-medium whitespace-nowrap">{GLYPH[p.name]}{"︎"} {p.name}</td>
                      <td className="pr-3 whitespace-nowrap">{formatDegree(p.lon)}</td>
                      <td className="pr-3">{p.house ?? "—"}</td>
                      <td className="pr-3 whitespace-nowrap text-muted">{[p.retrograde && "℞ retrograde", p.dignity].filter(Boolean).join(", ")}</td>
                      <td className="text-muted">{POINT_MEANING[p.name]}{p.house ? ` · ${HOUSE_MEANING[p.house]}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
          <div className="grid gap-6 md:grid-cols-2">
            <Section title="Elements">
              <Bars data={w.elements} colors={ELEMENT_COLORS} />
            </Section>
            <Section title="Modalities">
              <Bars data={w.modalities} colors={{ Cardinal: "var(--fire)", Fixed: "var(--indigo)", Mutable: "var(--air)" }} />
              <p className="mt-4 text-sm text-muted">Dominant planet: <b className="text-ink">{w.dominantPlanet}</b> · Dominant sign: <b className="text-ink">{w.dominantSign}</b></p>
            </Section>
          </div>
          {w.patterns.length > 0 && (
            <Section title="Chart Patterns">
              <ul className="space-y-2 text-sm">
                {w.patterns.map((p, i) => (
                  <li key={i}><b>{p.type}</b>: {p.points.join(", ")} {p.detail && <span className="text-muted">— {p.detail}</span>}</li>
                ))}
              </ul>
            </Section>
          )}
          <Section title="Aspects" subtitle="Sorted by tightness; the tightest aspects are the most powerful.">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {w.aspects.slice(0, 24).map((a, i) => (
                <div key={i} className="rounded-xl bg-surface-2 px-3 py-2">
                  <div className="flex justify-between gap-2"><b>{a.a} {a.type} {a.b}</b><span className="text-muted">{a.orb}°</span></div>
                  <p className="text-xs text-muted">{ASPECT_MEANING[a.type]}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {tab === "Numerology" && (
        <div className="space-y-6">
          <Section title="Core Numbers" subtitle={`${n.system === "pythagorean" ? "Pythagorean" : "Chaldean"} system · master numbers 11, 22, 33 preserved`}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NumberCard label="Life Path" value={n.lifePath.value} steps={n.lifePath.steps} note="Your destiny road and life lessons." />
              <NumberCard label="Expression / Destiny" value={n.expression.value} steps={n.expression.steps} note="Your natural talents and potential." />
              <NumberCard label="Soul Urge" value={n.soulUrge.value} steps={n.soulUrge.steps} note="Your heart's deepest desire." />
              <NumberCard label="Personality" value={n.personality.value} steps={n.personality.steps} note="The face you show the world." />
              <NumberCard label="Birthday" value={n.birthday.value} steps={n.birthday.steps} note="A special gift you were born with." />
              <NumberCard label="Maturity" value={n.maturity.value} steps={n.maturity.steps} note="Who you grow into after ~35–40." />
              <NumberCard label="Attitude" value={n.attitude.value} steps={n.attitude.steps} note="Your first reaction to life." />
              {n.currentNameExpression && <NumberCard label="Current Name" value={n.currentNameExpression.value} steps={n.currentNameExpression.steps} note={`The energy of "${n.currentName}".`} />}
            </div>
          </Section>
          <div className="grid gap-6 md:grid-cols-2">
            <Section title="Karmic Numbers">
              {n.karmicDebts.length ? (
                <ul className="space-y-2 text-sm">{n.karmicDebts.map((k, i) => <li key={i}><b>Karmic Debt {k.number}</b> ({k.source}): {KARMIC_DEBT[k.number]}</li>)}</ul>
              ) : <p className="text-sm text-muted">No karmic debt numbers in your core chart.</p>}
              <p className="mt-4 text-sm"><b>Karmic Lessons</b> (numbers missing from your name): {n.karmicLessons.length ? n.karmicLessons.join(", ") : "none, a well-rounded name"}.</p>
              <p className="mt-2 text-sm"><b>Hidden Passion</b>: {n.hiddenPassion.map((h) => `${h} (${num(h).essence})`).join("; ")}</p>
            </Section>
            <Section title="Lo Shu Grid" subtitle="The digits of your birth date in the magic square.">
              <div className="mx-auto grid w-48 grid-cols-3 gap-1.5">
                {[4, 9, 2, 3, 5, 7, 8, 1, 6].map((d) => (
                  <div key={d} className="flex aspect-square items-center justify-center rounded-lg border border-line text-lg" style={{ background: n.loShu.counts[d] ? "var(--accent-soft)" : "transparent" }}>
                    {n.loShu.counts[d] ? String(d).repeat(n.loShu.counts[d]) : <span className="text-muted opacity-40">{d}</span>}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm"><b>Arrows of strength:</b> {n.loShu.arrowsOfStrength.join(", ") || "none"}</p>
              <p className="mt-1 text-sm"><b>Missing arrows:</b> {n.loShu.missingArrows.join(", ") || "none"}</p>
            </Section>
          </div>
          <Section title="Pinnacles & Challenges" subtitle="The four great chapters of your life.">
            <div className="grid gap-3 sm:grid-cols-4">
              {n.pinnacles.map((p, i) => {
                const now = p === currentPinnacle;
                return (
                  <div key={i} className="rounded-2xl border p-4" style={{ borderColor: now ? "var(--accent)" : "var(--border)", background: now ? "var(--accent-soft)" : "transparent" }}>
                    <p className="text-xs uppercase tracking-[0.15em] text-muted">Chapter {i + 1}{now ? " · now" : ""}</p>
                    <p className="text-sm text-muted">Age {p.fromAge}–{p.toAge ?? "∞"}</p>
                    <p className="mt-1"><span className="font-serif text-3xl font-bold text-accent">{p.number}</span> <span className="text-sm">{num(p.number).title}</span></p>
                    <p className="mt-1 text-xs text-muted">Challenge {n.challenges[i].number}: {num(n.challenges[i].number).challenge}</p>
                  </div>
                );
              })}
            </div>
          </Section>
          <Section title="Your Cycles Right Now">
            <div className="grid gap-3 sm:grid-cols-4 text-sm">
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-muted">Personal Year</p><p className="font-serif text-3xl font-bold">{n.personalYear}</p><p>{PERSONAL_YEAR_MEANING[n.personalYear]}</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-muted">Personal Month</p><p className="font-serif text-3xl font-bold">{n.personalMonth}</p><p>{num(n.personalMonth).essence}</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-muted">Personal Day</p><p className="font-serif text-3xl font-bold">{n.personalDay}</p><p>{num(n.personalDay).essence}</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-muted">Universal Year</p><p className="font-serif text-3xl font-bold">{n.universalYear}</p><p>The collective theme for everyone.</p></div>
            </div>
            <p className="mt-4 text-sm text-muted">Lucky numbers: {n.luckyNumbers.join(", ")}</p>
          </Section>
        </div>
      )}

      {tab === "Chinese" && (
        <div className="space-y-6">
          <Section title={`${c.polarity} ${c.element} ${c.animal}`} subtitle={`Lunar year ${c.lunarYear}, beginning ${c.lunarNewYear}`}>
            <p>{ANIMAL_MEANING[c.animal]}. Your {c.element} element adds {FIVE_ELEMENT_MEANING[c.element]}.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-muted">Inner animal (month)</p><p className="text-lg font-semibold">{c.innerAnimal}</p><p className="text-muted">How you love and feel</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-muted">True animal (day)</p><p className="text-lg font-semibold">{c.trueAnimal}</p><p className="text-muted">Your true self</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-muted">Secret animal (hour)</p><p className="text-lg font-semibold">{c.secretAnimal ?? "Needs birth time"}</p><p className="text-muted">Your hidden self</p></div>
            </div>
          </Section>
          <Section title="Four Pillars (BaZi)" subtitle="Year and month pillars follow the solar terms (Li Chun); the day pillar follows the 60-day cycle.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {c.pillars.map((p) => (
                <div key={p.label} className="rounded-2xl border border-line p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted">{p.label}</p>
                  <p className="mt-2 font-serif text-2xl font-bold" style={{ color: ELEMENT_COLORS[p.element] }}>{p.stem}</p>
                  <p className="text-sm text-muted">{p.polarity} {p.element}</p>
                  <p className="mt-2 font-serif text-2xl font-bold">{p.branch}</p>
                  <p className="text-sm text-muted">{p.animal}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm"><b>Day Master:</b> {c.dayMaster.polarity} {c.dayMaster.element}, the element that represents <i>you</i>: {FIVE_ELEMENT_MEANING[c.dayMaster.element]}.</p>
          </Section>
          <div className="grid gap-6 md:grid-cols-2">
            <Section title="Five Element Balance">
              <Bars data={c.elementBalance} colors={ELEMENT_COLORS} />
            </Section>
            <Section title="Compatibility & This Year">
              <p className="text-sm"><b>Best matches:</b> {c.bestMatches.join(", ")}</p>
              <p className="mt-2 text-sm"><b>Clash:</b> {c.clash}</p>
              <p className="mt-4 text-sm"><b>{c.currentYear.element} {c.currentYear.animal} year ({c.currentYear.year}):</b> {c.currentYear.relation}.</p>
            </Section>
          </div>
        </div>
      )}

      {tab === "Timeline" && (
        <div className="space-y-6">
          <Section title="Current Transits" subtitle="Slow-moving planets aspecting your birth chart right now: the big themes of this season.">
            {profile.transits.length ? (
              <ul className="space-y-2 text-sm">
                {profile.transits.slice(0, 10).map((t, i) => (
                  <li key={i} className="rounded-xl bg-surface-2 px-3 py-2">
                    <b>{t.transiting} {t.type} your {t.natal}</b> <span className="text-muted">· orb {t.orb}° · {t.applying ? "building" : "easing"}</span>
                    <p className="text-xs text-muted">{POINT_MEANING[t.transiting]} meets your {POINT_MEANING[t.natal]}: {ASPECT_MEANING[t.type]}.</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">A quiet sky: no major slow-planet transits are exact right now.</p>}
          </Section>
          <Section title="Life Timeline" subtitle="Major astrological life cycles, calculated from your chart, with your numerology chapters.">
            <ol className="relative space-y-4 border-l border-line pl-6">
              {[...profile.lifeCycles.map((e) => ({ kind: "astro" as const, date: e.dates[0], age: e.age, title: e.label, text: e.description, extra: e.dates.length > 1 ? `Exact on ${e.dates.join(", ")}` : `Exact on ${e.dates[0]}` })),
                ...n.pinnacles.slice(1).map((p, i) => ({ kind: "num" as const, date: `${Number(profile.input.date.slice(0, 4)) + p.fromAge}`, age: p.fromAge, title: `Pinnacle ${i + 2} begins: ${p.number}`, text: num(p.number).essence, extra: "" }))]
                .sort((a, b) => a.age - b.age)
                .map((e, i) => {
                  const past = e.age < age, now = Math.abs(e.age - age) <= 1;
                  return (
                    <li key={i} className={past && !now ? "opacity-60" : ""}>
                      <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full" style={{ background: now ? "var(--accent)" : e.kind === "num" ? "var(--indigo)" : "var(--border)" }} />
                      <p className="text-xs uppercase tracking-[0.15em] text-muted">Age {e.age} · {e.date.slice(0, 4)}{now ? " · now" : ""}</p>
                      <p className="font-medium">{e.title}</p>
                      <p className="text-sm text-muted">{e.text}</p>
                      {e.extra && <p className="text-xs text-muted">{e.extra}</p>}
                    </li>
                  );
                })}
            </ol>
          </Section>
          {upcoming.length > 0 && (
            <Section title="Coming Up">
              <ul className="space-y-1 text-sm">{upcoming.map((e, i) => <li key={i}><b>{e.label}</b>: {e.dates.join(", ")}</li>)}</ul>
            </Section>
          )}
        </div>
      )}

      {sharing && <ShareCard profile={profile} onClose={() => setSharing(false)} />}

      {tab === "Vedic" && <VedicTab vedic={profile.vedic} Section={Section} />}

      {tab === "Forecast" && <ForecastTab profile={profile} Section={Section} onChangeLocation={onEdit} />}

      {tab === "Compatibility" && <CompatibilityTab profile={profile} people={people} onAddPerson={onAddPerson} Section={Section} />}

      {tab === "Full Reading" && <AiReading chart={summarizeProfile(profile)} cacheKey={cacheKey} />}

      <p className="pb-8 text-center text-xs text-muted">
        Positions calculated with Astronomy Engine (tropical zodiac, true ecliptic of date). Readings are for self-reflection and entertainment and are not medical, legal, financial, or psychological advice.
      </p>
    </div>
  );
}
