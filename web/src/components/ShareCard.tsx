"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/profile";
import { cardText, drawCard, type CardOptions } from "@/lib/shareCard";

export default function ShareCard({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [opts, setOpts] = useState<CardOptions>({ format: "square", theme: "night", nameMode: "first", showBirthDate: false });
  const [status, setStatus] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current, profile, opts);
  }, [profile, opts]);

  useEffect(() => {
    const probe = new File([""], "probe.png", { type: "image/png" });
    setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fileName = `destiny-atlas-${(profile.input.currentName || profile.input.birthName).split(/\s+/)[0].toLowerCase()}-${opts.format}.png`;
  const toBlob = () => new Promise<Blob>((resolve, reject) => canvasRef.current!.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create image"))), "image/png"));

  const download = async () => {
    const url = URL.createObjectURL(await toBlob());
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Image saved.");
  };

  const share = async () => {
    try {
      const file = new File([await toBlob()], fileName, { type: "image/png" });
      await navigator.share({ files: [file], text: cardText(profile) });
      setStatus("Shared!");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus("Sharing isn't available here. Try saving the image instead.");
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(cardText(profile));
      setStatus("Caption copied.");
    } catch {
      setStatus("Couldn't access the clipboard.");
    }
  };

  const set = <K extends keyof CardOptions>(k: K, v: CardOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));

  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label="Share your cosmic card">
      <div className="card w-full max-w-4xl p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">Your Cosmic Card</h2>
            <p className="text-sm text-muted">A shareable snapshot of your chart. Only what you choose is shown.</p>
          </div>
          <button className="btn-ghost px-3 py-1 text-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="flex items-center justify-center rounded-2xl bg-surface-2 p-3">
            <canvas ref={canvasRef} className="h-auto max-h-[70vh] w-auto max-w-full rounded-xl shadow-2xl" aria-label="Cosmic card preview" />
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-2 font-medium">Format</p>
              <div className="flex flex-wrap gap-2">
                <button className="chip" data-on={opts.format === "square"} onClick={() => set("format", "square")}>Post (1:1)</button>
                <button className="chip" data-on={opts.format === "story"} onClick={() => set("format", "story")}>Story (9:16)</button>
              </div>
            </div>
            <div>
              <p className="mb-2 font-medium">Style</p>
              <div className="flex flex-wrap gap-2">
                <button className="chip" data-on={opts.theme === "night"} onClick={() => set("theme", "night")}>Night sky</button>
                <button className="chip" data-on={opts.theme === "dawn"} onClick={() => set("theme", "dawn")}>Dawn</button>
              </div>
            </div>
            <div>
              <p className="mb-2 font-medium">Name</p>
              <div className="flex flex-wrap gap-2">
                <button className="chip" data-on={opts.nameMode === "first"} onClick={() => set("nameMode", "first")}>First name</button>
                <button className="chip" data-on={opts.nameMode === "full"} onClick={() => set("nameMode", "full")}>Full name</button>
                <button className="chip" data-on={opts.nameMode === "hidden"} onClick={() => set("nameMode", "hidden")}>Hide</button>
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={opts.showBirthDate} onChange={(e) => set("showBirthDate", e.target.checked)} />
              Show my birth date
            </label>
            <p className="text-xs text-muted">Your birth time and birthplace are never put on the card.</p>
            <div className="flex flex-col gap-2 pt-2">
              {canShareFiles && <button className="btn-primary" onClick={share}>Share…</button>}
              <button className={canShareFiles ? "btn-ghost" : "btn-primary"} onClick={download}>Download image</button>
              <button className="btn-ghost" onClick={copyText}>Copy caption</button>
            </div>
            {status && <p className="text-good" role="status">{status}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
