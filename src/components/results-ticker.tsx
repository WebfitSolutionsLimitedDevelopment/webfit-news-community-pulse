"use client";

import { useState } from "react";

export function ResultsTicker({ items, updated, label = "Results feed" }: { items: string[]; updated: string | null; label?: string }) {
  const [paused, setPaused] = useState(false);
  if (!items.length) return null;

  return (
    <section className="webfit-results-ticker mb-5 overflow-hidden rounded-xl border border-[#e3ded5] bg-[#381522] text-white" aria-label={label}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 px-4 py-2 text-xs">
        <p className="font-bold uppercase tracking-widest text-[#f2d58b]">{label}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-white/80">{updated ? "Feed updated " + updated.replace("T", " ") + " NZ time" : "Awaiting feed timestamp"} · Auto-refresh 60s</span>
          <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} className="rounded border border-white/50 px-2 py-1 font-semibold focus-visible:outline-2 focus-visible:outline-white">{paused ? "Resume scrolling" : "Pause scrolling"}</button>
        </div>
      </div>
      <div className="webfit-ticker-window overflow-hidden py-3" tabIndex={0} aria-label="Scrolling results. Focus or hover to pause.">
        <div className="webfit-ticker-track flex w-max" style={{ animationPlayState: paused ? "paused" : "running" }}>
          {[false, true].map((duplicate) => (
            <ul key={String(duplicate)} aria-hidden={duplicate || undefined} className="flex shrink-0 items-center">
              {items.map((item, index) => <li key={index} className="flex shrink-0 items-center gap-4 pr-8 text-sm"><span className="text-[#f2d58b]" aria-hidden>●</span>{item}</li>)}
            </ul>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes webfit-results-scroll { to { transform: translateX(-50%); } }
        .webfit-ticker-track { animation: webfit-results-scroll 90s linear infinite; }
        .webfit-ticker-window:hover .webfit-ticker-track,
        .webfit-ticker-window:focus-within .webfit-ticker-track { animation-play-state: paused !important; }
        @media (prefers-reduced-motion: reduce) {
          .webfit-ticker-track { animation: none; width: auto; }
          .webfit-ticker-track ul { flex-wrap: wrap; gap: 12px; }
          .webfit-ticker-track ul[aria-hidden="true"] { display: none; }
          .webfit-ticker-window { padding: 12px; }
        }
      `}</style>
    </section>
  );
}
