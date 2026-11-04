"use client";

import { useEffect, useRef, useState } from "react";
import type { Place } from "@/lib/profile";

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  admin1?: string;
}

export default function PlaceSearch({ value, onChange }: { value: Place | null; onChange: (p: Place | null) => void }) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [manualPlace, setManualPlace] = useState({ name: "", lat: "", lon: "", timezone: "" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2 || q === value?.name) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.split(",")[0])}&count=8&language=en&format=json`,
        );
        const data = await res.json();
        setResults(data.results ?? []);
        if (!data.results?.length) setError("No places found. Try a nearby larger city, or enter coordinates manually.");
      } catch {
        setError("Place search is unavailable. You can enter coordinates manually.");
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, value?.name]);

  const label = (r: GeoResult) => [r.name, r.admin1, r.country].filter(Boolean).join(", ");

  if (manual) {
    const ok = manualPlace.name && !isNaN(+manualPlace.lat) && !isNaN(+manualPlace.lon) && manualPlace.timezone.includes("/");
    return (
      <div className="space-y-3">
        <input className="input" placeholder="Place name" value={manualPlace.name} onChange={(e) => setManualPlace({ ...manualPlace, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Latitude (e.g. 14.69)" value={manualPlace.lat} onChange={(e) => setManualPlace({ ...manualPlace, lat: e.target.value })} />
          <input className="input" placeholder="Longitude (e.g. -17.44)" value={manualPlace.lon} onChange={(e) => setManualPlace({ ...manualPlace, lon: e.target.value })} />
        </div>
        <input className="input" placeholder="IANA timezone (e.g. Africa/Dakar)" value={manualPlace.timezone} onChange={(e) => setManualPlace({ ...manualPlace, timezone: e.target.value })} />
        <div className="flex gap-2">
          <button type="button" className="btn-primary" disabled={!ok} onClick={() => onChange({ name: manualPlace.name, lat: +manualPlace.lat, lon: +manualPlace.lon, timezone: manualPlace.timezone.trim() })}>
            Use these coordinates
          </button>
          <button type="button" className="btn-ghost" onClick={() => setManual(false)}>Search instead</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        className="input"
        placeholder="Start typing a city… (e.g. Conakry, Paris, New York)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange(null);
        }}
        autoComplete="off"
      />
      {loading && <p className="mt-2 text-sm text-muted">Searching the atlas…</p>}
      {results.length > 0 && (
        <ul className="card absolute z-20 mt-2 max-h-72 w-full overflow-auto p-1 shadow-xl">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface-2"
                onClick={() => {
                  const p = { name: label(r), lat: r.latitude, lon: r.longitude, timezone: r.timezone };
                  setQuery(p.name);
                  setResults([]);
                  onChange(p);
                }}
              >
                <div className="font-medium">{label(r)}</div>
                <div className="text-xs text-muted">
                  {r.latitude.toFixed(2)}°, {r.longitude.toFixed(2)}° · {r.timezone}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && (
        <p className="mt-2 text-sm text-good">
          ✓ {value.lat.toFixed(3)}°, {value.lon.toFixed(3)}° · timezone {value.timezone}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-hard">{error}</p>}
      <button type="button" className="mt-2 text-sm text-muted underline" onClick={() => setManual(true)}>
        Enter coordinates manually
      </button>
    </div>
  );
}
