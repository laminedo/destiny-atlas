"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import GeminiKeyDialog from "./GeminiKeyDialog";
import { SYSTEM_PROMPT, withChart, type ChatMessage } from "@/lib/readingPrompt";
import {
  forgetGeminiSettings, loadGeminiSettings, saveGeminiSettings, streamGeminiReading, type GeminiSettings,
} from "@/lib/gemini";

type Msg = ChatMessage;

// GitHub Pages builds have no server, so readings there need the visitor's own Gemini key.
const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const LANGUAGES = ["English", "Français", "Español", "Português", "Deutsch", "Italiano", "العربية"];
const LIFE_SUGGESTIONS = [
  "What kind of partner is right for me?",
  "Which careers fit my chart best?",
  "What should I focus on this year?",
  "What is my biggest karmic lesson?",
];

interface Props {
  chart: unknown; // pre-computed, model-friendly data
  cacheKey: string;
  title?: string;
  blurb?: string;
  firstRequest?: string;
  suggestions?: string[];
}

export default function AiReading({
  chart,
  cacheKey,
  title = "Your Complete Life Reading",
  blurb = "A long, personal reading that brings your birth chart, numerology, and Chinese astrology together across 12 areas of life, including your life timeline and the year ahead.",
  firstRequest = "Please write my Complete Life Reading.",
  suggestions = LIFE_SUGGESTIONS,
}: Props) {
  const storageKey = `reading:${cacheKey}`;
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    } catch {
      return [];
    }
  });
  const [language, setLanguage] = useState("English");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const [gemini, setGemini] = useState<GeminiSettings | null>(null);
  const [keyDialog, setKeyDialog] = useState(false);
  // A request waiting for the visitor to connect a key; it runs once they save one.
  const pendingRef = useRef<{ content: string; base: Msg[] } | null>(null);

  useEffect(() => setGemini(loadGeminiSettings()), []);

  const save = (m: Msg[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify(m)); } catch { /* storage unavailable */ }
  };

  async function send(content: string, base: Msg[] = messages, geminiOverride?: GeminiSettings) {
    const useGemini = geminiOverride ?? gemini;
    if (!useGemini && STATIC_SITE) {
      pendingRef.current = { content, base };
      setKeyDialog(true);
      return;
    }
    setError(null);
    setBusy(true);
    const history: Msg[] = [...base, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    const controller = new AbortController();
    abortRef.current = controller;
    let text = "";
    try {
      if (useGemini) {
        text = await streamGeminiReading({
          settings: useGemini,
          system: SYSTEM_PROMPT,
          messages: withChart(chart, language, history),
          onText: (t) => setMessages([...history, { role: "assistant", content: t }]),
          signal: controller.signal,
        });
        if (text.trim()) save([...history, { role: "assistant", content: text }]);
        else setMessages(base);
        return;
      }
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chart, language, messages: history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error ?? `Request failed (${res.status})`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const errAt = text.indexOf("[[ERROR]]");
        if (errAt >= 0) {
          setError(text.slice(errAt + 9));
          text = text.slice(0, errAt).trim();
        }
        setMessages([...history, { role: "assistant", content: text }]);
      }
      if (text.trim()) save([...history, { role: "assistant", content: text }]);
      else setMessages(base);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
      if (!text.trim()) setMessages(base);
    } finally {
      setBusy(false);
    }
  }

  const saveKey = (s: GeminiSettings) => {
    saveGeminiSettings(s);
    setGemini(s);
    setKeyDialog(false);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) send(pending.content, pending.base, s);
  };

  const forgetKey = () => {
    forgetGeminiSettings();
    setGemini(null);
  };

  const dialog = keyDialog && (
    <GeminiKeyDialog initial={gemini} onSave={saveKey} onClose={() => { pendingRef.current = null; setKeyDialog(false); }} />
  );

  const engineLine = (
    <p className="no-print text-xs text-muted">
      {gemini ? (
        <>
          Written by Gemini ({gemini.model.replace("models/", "")}) with your key ·{" "}
          <button className="underline" onClick={() => setKeyDialog(true)}>change</button> ·{" "}
          <button className="underline" onClick={forgetKey}>forget key</button>
        </>
      ) : STATIC_SITE ? (
        <>Readings are written by Google Gemini using your own free API key. You&apos;ll be asked for it once.</>
      ) : (
        <>
          Written by Claude ·{" "}
          <button className="underline" onClick={() => setKeyDialog(true)}>use my own Gemini key instead</button>
        </>
      )}
    </p>
  );

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    save([]);
  };

  if (messages.length === 0) {
    return (
      <div className="card p-6 text-center sm:p-10">
        <div className="twinkle text-4xl text-accent">✦</div>
        <h2 className="mt-3 text-3xl font-semibold">{title}</h2>
        <p className="mx-auto mt-3 max-w-lg text-muted">{blurb}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <select className="input w-auto" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Reading language">
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
          <button className="btn-primary" onClick={() => send(firstRequest, [])} disabled={busy}>Generate my reading</button>
        </div>
        <div className="mt-4">{engineLine}</div>
        {error && <p className="mt-4 text-sm text-hard">{error}</p>}
        {dialog}
        <p className="mt-6 text-xs text-muted">Takes about 1–2 minutes. Readings are for self-reflection and entertainment, not medical, legal, or financial advice.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((m, i) =>
        m.role === "user" ? (
          i === 0 ? null : (
            <div key={i} className="ml-auto max-w-xl rounded-2xl bg-accent-soft px-4 py-3">{m.content}</div>
          )
        ) : (
          <div key={i} className="card p-6 sm:p-8">
            {m.content ? <Markdown source={m.content} /> : <p className="twinkle text-muted">Reading the stars…</p>}
          </div>
        ),
      )}
      {error && <p className="text-sm text-hard">{error}</p>}
      <div className="no-print card space-y-3 p-4">
        <p className="text-sm font-medium">Ask about your chart</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} className="chip" disabled={busy} onClick={() => send(s)}>{s}</button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim()) { send(question.trim()); setQuestion(""); }
          }}
        >
          <input className="input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask anything about your chart…" disabled={busy} />
          <button className="btn-primary" disabled={busy || !question.trim()}>Ask</button>
        </form>
        <div className="flex gap-2 text-sm">
          <button className="btn-ghost" onClick={() => window.print()} disabled={busy}>Save as PDF</button>
          <button className="btn-ghost" onClick={reset}>Start over</button>
        </div>
        {engineLine}
      </div>
      {dialog}
    </div>
  );
}
