"use client";

import { useEffect, useRef, useState } from "react";
import type { OfficialResults } from "@/lib/official-results";

type Snapshot = { updated: string; reporting: number; parties: { abbrev: string; name: string; seats: number; percent: number }[] };
const KEY = "webfit:results-2026:previous-update:v1";

function validSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as Snapshot;
  return typeof s.updated === "string" && Number.isFinite(s.reporting) && Array.isArray(s.parties) && s.parties.every(p =>
    p && typeof p.abbrev === "string" && typeof p.name === "string" && Number.isFinite(p.seats) && Number.isFinite(p.percent));
}

export function ElectionUpdate({ results }: { results: OfficialResults }) {
  const previous = useRef<Snapshot | null>(null);
  const [update, setUpdate] = useState<{ compared: string | null; items: string[] }>({ compared: null, items: [] });

  useEffect(() => {
    if (!results.ok || !results.hasResults || !results.updated) return;
    const current: Snapshot = {
      updated: results.updated,
      reporting: results.percentPlacesCounted,
      parties: results.parties.map(({ abbrev, name, seats, percent }) => ({ abbrev, name, seats, percent })),
    };
    let prior = previous.current;
    if (!prior) {
      try {
        const stored: unknown = JSON.parse(sessionStorage.getItem(KEY) || "null");
        if (validSnapshot(stored)) prior = stored;
      } catch { /* Compare in memory when browser storage is unavailable. */ }
    }
    if (prior && current.updated <= prior.updated) {
      previous.current = prior;
      return;
    }
    const items: string[] = [];
    if (prior) {
      for (const p of current.parties) {
        const old = prior.parties.find(o => o.abbrev === p.abbrev);
        if (!old) continue;
        const seats = p.seats - old.seats;
        if (seats !== 0) items.push(p.name + " " + (seats > 0 ? "+" : "−") + Math.abs(seats) + " projected seat" + (Math.abs(seats) === 1 ? "" : "s"));
      }
      const movements = current.parties.map(p => {
        const old = prior.parties.find(o => o.abbrev === p.abbrev);
        return { name: p.name, delta: old ? Math.round((p.percent - old.percent) * 10) / 10 : 0 };
      }).filter(p => p.delta !== 0).sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta));
      for (const p of movements.slice(0, 2)) items.push(p.name + " vote share " + (p.delta > 0 ? "+" : "−") + Math.abs(p.delta).toFixed(1) + " percentage points");
      const reporting = Math.round((current.reporting - prior.reporting) * 10) / 10;
      if (reporting > 0) items.push("Voting places reporting +" + reporting.toFixed(1) + " percentage points");
      if (!items.length) items.push("New feed received. Projected seats and displayed vote shares are unchanged.");
    }
    setUpdate({ compared: prior?.updated ?? null, items: items.slice(0, 5) });
    previous.current = current;
    try { sessionStorage.setItem(KEY, JSON.stringify(current)); } catch { /* Memory comparison remains available. */ }
  }, [results]);

  return (
    <section className="mb-5 flex flex-col gap-3 rounded-xl border border-teal-100 bg-[#eaf5f2] px-4 py-3 sm:flex-row sm:items-center sm:gap-5" aria-labelledby="election-update-title">
      <div className="shrink-0">
        <h2 id="election-update-title" className="text-xs font-bold text-[#00685f]">Changed since your last update</h2>
        <p className="mt-1 text-[10px] text-slate-500">{update.compared ? "Compared with " + update.compared.replace("T", " ") + " NZ time" : "Tracking changes while you watch"}</p>
      </div>
      <div className="min-w-0" aria-live="polite" aria-atomic="true">
        {update.items.length ? <ul className="flex flex-wrap gap-2">{update.items.map(item => <li key={item} className="rounded-md border border-teal-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#172b40]">{item}</li>)}</ul> :
          <p className="text-xs text-slate-600">Your first snapshot is saved when the feed connects. Changes appear after the next fresh update.</p>}
      </div>
    </section>
  );
}
