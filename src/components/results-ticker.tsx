"use client";

import { useState } from "react";

export function ResultsTicker({ items, updated, label = "Latest results" }: { items: string[]; updated: string | null; label?: string }) {
  const [paused, setPaused] = useState(false);
  if (!items.length) return null;
  return (
    <section className="webfit-results-ticker mb-5 flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[#172b40]" aria-label={label}>
      <p className="shrink-0 rounded-md bg-[#e3f4f0] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00776f]">{label}</p>
      <p className="sr-only">{updated ? "Commission feed updated " + updated.replace("T", " ") + " NZ time" : "Awaiting feed timestamp"}. Refreshes every 60 seconds.</p>
      <div className="webfit-ticker-window min-w-0 flex-1 overflow-hidden" tabIndex={0} aria-label="Scrolling results. Focus or hover to pause.">
        <div className="webfit-ticker-track flex w-max" style={{ animationPlayState: paused ? "paused" : "running" }}>
          {[false, true].map((duplicate) => (
            <ul key={String(duplicate)} aria-hidden={duplicate || undefined} className="flex shrink-0 items-center">
              {items.map((item, index) => <li key={index} className="flex shrink-0 items-center gap-4 pr-7 text-xs font-medium"><span className="text-[#008577]" aria-hidden>●</span>{item}</li>)}
            </ul>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? "Resume scrolling" : "Pause scrolling"} className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#00776f]">{paused ? "Resume" : "Pause"}</button>
      <style>{`
        @keyframes webfit-results-scroll { to { transform: translateX(-50%); } }
        .webfit-ticker-track { animation: webfit-results-scroll 90s linear infinite; }
        .webfit-ticker-window:hover .webfit-ticker-track,
        .webfit-ticker-window:focus-within .webfit-ticker-track { animation-play-state: paused !important; }
        @media (prefers-reduced-motion: reduce) {
          .webfit-ticker-track { animation: none; width: auto; }
          .webfit-ticker-track ul { flex-wrap: wrap; gap: 12px; }
          .webfit-ticker-track ul[aria-hidden="true"] { display: none; }
        }
      `}</style>
    </section>
  );
}
