/**
 * Browser-side Gemini client for "bring your own key" readings.
 * The visitor's key goes straight from their browser to Google; it never touches our servers.
 * Uses the Gemini REST API (generateContent family), which needs no SDK.
 */
import type { ChatMessage } from "./readingPrompt";

const API = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiModel {
  id: string; // e.g. "models/gemini-3.1-pro-preview"
  label: string;
}

export interface GeminiSettings {
  key: string;
  model: string;
  remember: boolean; // localStorage (this device) vs sessionStorage (this tab only)
}

const STORE = "destiny-atlas:gemini";

export function loadGeminiSettings(): GeminiSettings | null {
  for (const store of [() => localStorage, () => sessionStorage]) {
    try {
      const raw = store().getItem(STORE);
      if (raw) return JSON.parse(raw);
    } catch { /* storage unavailable */ }
  }
  return null;
}

export function saveGeminiSettings(s: GeminiSettings) {
  forgetGeminiSettings();
  try {
    (s.remember ? localStorage : sessionStorage).setItem(STORE, JSON.stringify(s));
  } catch { /* storage unavailable: the key lives only in memory for this visit */ }
}

export function forgetGeminiSettings() {
  try { localStorage.removeItem(STORE); } catch { /* ignore */ }
  try { sessionStorage.removeItem(STORE); } catch { /* ignore */ }
}

export class GeminiError extends Error {}

async function explain(res: Response): Promise<GeminiError> {
  let status = "", detail = "";
  try {
    const body = await res.json();
    status = body?.error?.status ?? "";
    detail = body?.error?.message ?? "";
  } catch { /* not JSON */ }
  if (res.status === 400 && /api key/i.test(detail)) return new GeminiError("That Gemini API key isn't valid. Check you copied the whole key from Google AI Studio.");
  if (res.status === 401 || res.status === 403 || status === "PERMISSION_DENIED") return new GeminiError("Google refused this key. Make sure the Gemini API is enabled for it in Google AI Studio.");
  if (res.status === 429 || status === "RESOURCE_EXHAUSTED") return new GeminiError("Your Gemini key has hit its usage limit. Wait a minute (free keys have per-minute limits) or choose a Flash model.");
  if (res.status === 404) return new GeminiError("That Gemini model isn't available to your key any more. Choose another model.");
  return new GeminiError(`Gemini returned an error (${res.status}${detail ? `: ${detail}` : ""}).`);
}

const headers = (key: string) => ({ "x-goog-api-key": key, "Content-Type": "application/json" });

/** Rank text models: newest version first, Pro before Flash before Flash-Lite, stable before preview. */
function rank(id: string): number {
  const version = Number(/gemini-(\d+(?:\.\d+)?)/.exec(id)?.[1] ?? 0);
  const tier = /-pro/.test(id) ? 3 : /flash-lite/.test(id) ? 1 : /flash/.test(id) ? 2 : 0;
  const stable = /preview|exp/.test(id) ? 0 : 0.5;
  return tier * 1000 + version * 10 + stable;
}

/** Lists the text models this key can use (also validates the key). */
export async function listGeminiModels(key: string): Promise<GeminiModel[]> {
  const res = await fetch(`${API}/models?pageSize=200`, { headers: headers(key) });
  if (!res.ok) throw await explain(res);
  const data: { models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[] } = await res.json();
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .filter((m) => /gemini-\d/.test(m.name) && !/image|tts|audio|live|embedding|robotics|computer-use|native/.test(m.name))
    .sort((a, b) => rank(b.name) - rank(a.name))
    .map((m) => ({ id: m.name, label: m.displayName ?? m.name.replace("models/", "") }));
}

interface StreamChunk {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/** Streams a reading from Gemini, calling onText with the full text so far. Returns the final text. */
export async function streamGeminiReading(opts: {
  settings: GeminiSettings;
  system: string;
  messages: ChatMessage[];
  onText: (text: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const { settings, system, messages, onText, signal } = opts;
  const res = await fetch(`${API}/${settings.model}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: headers(settings.key),
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 32768 },
    }),
  });
  if (!res.ok || !res.body) throw await explain(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", text = "", finish = "", blocked = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      let chunk: StreamChunk;
      try { chunk = JSON.parse(line.slice(5)); } catch { continue; }
      if (chunk.promptFeedback?.blockReason) blocked = chunk.promptFeedback.blockReason;
      const cand = chunk.candidates?.[0];
      for (const part of cand?.content?.parts ?? []) {
        if (part.text && !part.thought) text += part.text;
      }
      if (cand?.finishReason) finish = cand.finishReason;
      onText(text);
    }
  }
  if (blocked || (!text && finish && finish !== "STOP")) {
    throw new GeminiError("Gemini declined to write this reading. Try rephrasing your question or choosing another model.");
  }
  if (finish === "MAX_TOKENS") text += "\n\n_The reading was cut short. Ask a follow-up question to continue._";
  onText(text);
  return text;
}
