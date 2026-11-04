"use client";

import { useState } from "react";
import PlaceSearch from "./PlaceSearch";
import type { BirthInput, Place, TimeAccuracy } from "@/lib/profile";
import type { HouseSystem } from "@/lib/astro/western";
import type { NumerologySystem } from "@/lib/numerology";

const FOCUS = ["Love", "Career", "Money", "Wellbeing", "Spirituality", "Family", "Purpose", "Creativity"];

const STEPS = [
  { title: "Your name", why: "Numerology reads the vibration of the full name on your birth certificate. Your current name shows how you've grown into it." },
  { title: "Your birth moment", why: "The date sets your planets and numbers. The exact time sets your Rising sign, houses, and Moon degree — the most personal part of the chart." },
  { title: "Your birthplace", why: "Latitude and longitude orient the sky above you, and the historical timezone (including daylight saving at the time) converts your clock time precisely." },
  { title: "What matters to you", why: "Your reading gives extra depth to the areas you choose, and speaks to what's on your mind right now." },
];

export default function BirthForm({ initial, onSubmit, onCancel }: { initial?: BirthInput; onSubmit: (b: BirthInput) => void; onCancel?: () => void }) {
  const [step, setStep] = useState(0);
  const [birthName, setBirthName] = useState(initial?.birthName ?? "");
  const [currentName, setCurrentName] = useState(initial?.currentName ?? "");
  const [pronouns, setPronouns] = useState(initial?.pronouns ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [accuracy, setAccuracy] = useState<TimeAccuracy>(initial?.timeAccuracy ?? "exact");
  const [place, setPlace] = useState<Place | null>(initial?.place ?? null);
  const [currentPlace, setCurrentPlace] = useState<Place | null>(initial?.currentPlace ?? null);
  const [focus, setFocus] = useState<string[]>(initial?.focus ?? []);
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [houseSystem, setHouseSystem] = useState<HouseSystem>(initial?.houseSystem ?? "placidus");
  const [numSystem, setNumSystem] = useState<NumerologySystem>(initial?.numerologySystem ?? "pythagorean");

  const valid = [
    birthName.trim().split(/\s+/).length >= 1 && /[a-zA-ZÀ-ÿ]/.test(birthName),
    /^\d{4}-\d{2}-\d{2}$/.test(date) && (accuracy === "unknown" || /^\d{2}:\d{2}$/.test(time)),
    !!place,
    true,
  ];

  const submit = () =>
    onSubmit({
      birthName: birthName.trim(),
      currentName: currentName.trim() || undefined,
      pronouns: pronouns.trim() || undefined,
      date,
      time: accuracy === "unknown" ? undefined : time,
      timeAccuracy: accuracy,
      place: place!,
      currentPlace: currentPlace ?? undefined,
      focus,
      question: question.trim() || undefined,
      houseSystem,
      numerologySystem: numSystem,
    });

  return (
    <div className="card mx-auto w-full max-w-xl p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((_, i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? "var(--accent)" : "var(--border)" }} />
        ))}
      </div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Step {step + 1} of {STEPS.length}</p>
      <h2 className="mt-1 text-3xl font-semibold">{STEPS[step].title}</h2>
      <p className="mt-2 text-sm text-muted">{STEPS[step].why}</p>

      <div className="mt-6 space-y-4">
        {step === 0 && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Full birth name <span className="text-hard">*</span></span>
              <input className="input" value={birthName} onChange={(e) => setBirthName(e.target.value)} placeholder="Exactly as on your birth certificate" autoFocus />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Name you use now <span className="text-muted">(optional)</span></span>
              <input className="input" value={currentName} onChange={(e) => setCurrentName(e.target.value)} placeholder="Married name, nickname, or professional name" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Pronouns <span className="text-muted">(optional, for wording only)</span></span>
              <input className="input" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="e.g. she/her, he/him, they/them" />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Date of birth <span className="text-hard">*</span></span>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} min="1800-01-01" max="2100-12-31" />
            </label>
            <div>
              <span className="mb-2 block text-sm font-medium">How sure are you of the birth time?</span>
              <div className="flex flex-wrap gap-2">
                {([["exact", "Exact (birth certificate)"], ["approximate", "Approximate (±1 hour)"], ["unknown", "I don't know"]] as const).map(([v, l]) => (
                  <button type="button" key={v} className="chip" data-on={accuracy === v} onClick={() => setAccuracy(v)}>{l}</button>
                ))}
              </div>
            </div>
            {accuracy !== "unknown" ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Time of birth (local clock time)</span>
                <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            ) : (
              <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
                No problem. We&apos;ll use a noon chart: your planets, aspects, numerology, and Chinese year are still accurate,
                but your Rising sign, houses, and exact Moon degree will be left out. Tip: a birth certificate or hospital record often lists the time.
              </p>
            )}
          </>
        )}

        {step === 2 && <PlaceSearch value={place} onChange={setPlace} />}

        {step === 3 && (
          <>
            <div>
              <span className="mb-2 block text-sm font-medium">Focus areas</span>
              <div className="flex flex-wrap gap-2">
                {FOCUS.map((f) => (
                  <button type="button" key={f} className="chip" data-on={focus.includes(f)} onClick={() => setFocus(focus.includes(f) ? focus.filter((x) => x !== f) : [...focus, f])}>{f}</button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">What&apos;s on your mind? <span className="text-muted">(optional)</span></span>
              <textarea className="input min-h-24" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Should I change careers this year? What am I here to learn in relationships?" />
            </label>
            <div>
              <span className="mb-1 block text-sm font-medium">Where did you spend your last birthday? <span className="text-muted">(optional, for your Solar Return)</span></span>
              <PlaceSearch value={currentPlace} onChange={setCurrentPlace} />
            </div>
            <details className="rounded-xl bg-surface-2 p-3 text-sm">
              <summary className="cursor-pointer font-medium">Advanced settings</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-muted">House system</span>
                  <select className="input" value={houseSystem} onChange={(e) => setHouseSystem(e.target.value as HouseSystem)}>
                    <option value="placidus">Placidus (default)</option>
                    <option value="whole-sign">Whole Sign</option>
                    <option value="equal">Equal</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-muted">Numerology system</span>
                  <select className="input" value={numSystem} onChange={(e) => setNumSystem(e.target.value as NumerologySystem)}>
                    <option value="pythagorean">Pythagorean (default)</option>
                    <option value="chaldean">Chaldean</option>
                  </select>
                </label>
              </div>
            </details>
          </>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>
        ) : onCancel ? (
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        ) : <span />}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary" disabled={!valid[step]} onClick={() => setStep(step + 1)}>Continue</button>
        ) : (
          <button type="button" className="btn-primary" disabled={!valid.every(Boolean)} onClick={submit}>Reveal my reading ✦</button>
        )}
      </div>
    </div>
  );
}
