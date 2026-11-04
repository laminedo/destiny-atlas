"use client";

import { useEffect, useMemo, useState } from "react";
import BirthForm from "@/components/BirthForm";
import Reading from "@/components/Reading";
import { buildProfile, type BirthInput } from "@/lib/profile";

interface Saved { id: string; input: BirthInput }

const STORE = "destiny-atlas:profiles";
const idFor = (b: BirthInput) => [b.birthName, b.date, b.time ?? "", b.place.lat.toFixed(3), b.place.lon.toFixed(3), b.houseSystem, b.numerologySystem].join("|");

function loadSaved(): Saved[] {
  try { return JSON.parse(localStorage.getItem(STORE) ?? "[]"); } catch { return []; }
}
function storeSaved(s: Saved[]) {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

export default function Home() {
  const [saved, setSaved] = useState<Saved[]>([]);
  const [input, setInput] = useState<BirthInput | null>(null);
  const [mode, setMode] = useState<"home" | "form" | "reading">("home");

  useEffect(() => setSaved(loadSaved()), []);

  const { profile, error } = useMemo(() => {
    if (!input) return { profile: null, error: null };
    try {
      return { profile: buildProfile(input), error: null };
    } catch (e) {
      return { profile: null, error: (e as Error).message };
    }
  }, [input]);

  const submit = (b: BirthInput) => {
    const id = idFor(b);
    const next = [{ id, input: b }, ...saved.filter((s) => s.id !== id)].slice(0, 12);
    setSaved(next);
    storeSaved(next);
    setInput(b);
    setMode("reading");
    window.scrollTo({ top: 0 });
  };

  // Saves another person (e.g. a partner) without leaving the current reading.
  const addPerson = (b: BirthInput) => {
    const id = idFor(b);
    if (saved.some((s) => s.id === id)) return;
    const next = [...saved, { id, input: b }].slice(-24);
    setSaved(next);
    storeSaved(next);
  };

  const remove = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    storeSaved(next);
  };

  return (
    <main className="px-4 py-8 sm:py-12">
      {mode !== "reading" && (
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="twinkle text-2xl text-accent">✦</p>
          <h1 className="mt-2 text-5xl font-bold sm:text-6xl">Destiny Atlas</h1>
          <p className="mt-4 text-lg text-muted">
            Your complete birth chart, numerology, and Chinese astrology, calculated with astronomical precision
            and woven into one deeply personal reading of your life&apos;s path.
          </p>
        </div>
      )}

      {mode === "home" && (
        <div className="mx-auto max-w-xl space-y-6">
          <div className="text-center">
            <button className="btn-primary text-lg" onClick={() => { setInput(null); setMode("form"); }}>Begin my reading ✦</button>
          </div>
          <div className="grid gap-3 text-center text-sm text-muted sm:grid-cols-3">
            <div className="card p-4"><p className="text-2xl">☉</p>Western natal chart with houses, aspects &amp; patterns</div>
            <div className="card p-4"><p className="font-serif text-2xl">7</p>Life Path, Destiny, Soul Urge, Pinnacles &amp; more</div>
            <div className="card p-4"><p className="text-2xl">龍</p>Chinese zodiac &amp; Four Pillars of Destiny</div>
          </div>
          {saved.length > 0 && (
            <div className="card p-5">
              <h2 className="text-xl font-semibold">Saved readings</h2>
              <p className="text-xs text-muted">Stored only in this browser.</p>
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {saved.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <button className="text-left" onClick={() => { setInput(s.input); setMode("reading"); }}>
                      <span className="font-medium">{s.input.currentName || s.input.birthName}</span>
                      <span className="block text-xs text-muted">{s.input.date} · {s.input.place.name}</span>
                    </button>
                    <button className="text-xs text-muted hover:text-hard" onClick={() => remove(s.id)} aria-label={`Delete ${s.input.birthName}`}>Delete</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-center text-xs text-muted">
            Your birth details stay on your device. They are only sent to the AI service when you ask for a Full Reading.
          </p>
        </div>
      )}

      {mode === "form" && (
        <BirthForm key={input ? idFor(input) : "new"} initial={input ?? undefined} onSubmit={submit} onCancel={() => setMode(input ? "reading" : "home")} />
      )}

      {mode === "reading" && error && (
        <div className="card mx-auto max-w-xl p-6 text-center">
          <p className="text-hard">{error}</p>
          <button className="btn-ghost mt-4" onClick={() => setMode("form")}>Fix my details</button>
        </div>
      )}

      {mode === "reading" && profile && input && (
        <Reading
          profile={profile}
          cacheKey={idFor(input)}
          onEdit={() => setMode("form")}
          onNew={() => { setInput(null); setMode("home"); }}
          people={saved.map((s) => s.input)}
          onAddPerson={addPerson}
        />
      )}
    </main>
  );
}
