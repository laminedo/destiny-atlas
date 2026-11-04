"use client";

import { useEffect, useState } from "react";
import { GeminiModel, GeminiSettings, listGeminiModels } from "@/lib/gemini";

export default function GeminiKeyDialog({ initial, onSave, onClose }: {
  initial: GeminiSettings | null;
  onSave: (s: GeminiSettings) => void;
  onClose: () => void;
}) {
  const [key, setKey] = useState(initial?.key ?? "");
  const [remember, setRemember] = useState(initial?.remember ?? true);
  const [models, setModels] = useState<GeminiModel[] | null>(null);
  const [model, setModel] = useState(initial?.model ?? "");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Checking the key also fetches the models it can use.
  const check = async () => {
    setChecking(true);
    setError(null);
    try {
      const list = await listGeminiModels(key.trim());
      if (!list.length) throw new Error("This key has no Gemini text models available.");
      setModels(list);
      setModel((m) => (list.some((x) => x.id === m) ? m : list[0].id));
    } catch (e) {
      setModels(null);
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label="Connect your Gemini key">
      <div className="card w-full max-w-lg p-6 text-left" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">Connect Gemini</h2>
            <p className="mt-1 text-sm text-muted">Your reading is written by Google Gemini using your own free API key.</p>
          </div>
          <button className="btn-ghost px-3 py-1 text-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <ol className="mt-5 list-decimal space-y-1 pl-5 text-sm">
          <li>
            Open{" "}
            <a className="text-accent underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio → API keys</a>{" "}
            and sign in with your Google account.
          </li>
          <li>Click <b>Create API key</b> and copy it.</li>
          <li>Paste it below.</li>
        </ol>

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (models && model) onSave({ key: key.trim(), model, remember });
            else if (key.trim()) check();
          }}
        >
          <input
            className="input font-mono"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="Paste your Gemini API key"
            value={key}
            onChange={(e) => { setKey(e.target.value); setModels(null); }}
            aria-label="Gemini API key"
          />
          {models && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Model</span>
              <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
                {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <span className="mt-1 block text-xs text-muted">Pro models write the richest readings; Flash models are faster and have higher free limits.</span>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember my key on this device
          </label>
          {error && <p className="text-sm text-hard" role="alert">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            {models ? (
              <button type="submit" className="btn-primary" disabled={!model}>Save &amp; continue</button>
            ) : (
              <button type="submit" className="btn-primary" disabled={!key.trim() || checking}>{checking ? "Checking…" : "Check key"}</button>
            )}
          </div>
        </form>

        <p className="mt-5 rounded-xl bg-surface-2 p-3 text-xs text-muted">
          🔒 Your key is stored only in this browser{remember ? "" : " tab"} and is sent only to Google, never to us.
          Your chart data goes to Google to write the reading. On Google&apos;s free tier, Google may use prompts to improve its
          products; a billed key keeps them private. You can forget the key at any time.
        </p>
      </div>
    </div>
  );
}
