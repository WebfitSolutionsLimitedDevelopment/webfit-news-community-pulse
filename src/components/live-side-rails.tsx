"use client";
import { useState } from "react";
import { PartyLogo } from "@/components/election-party-logo";
import { partyColour } from "@/lib/result-colours";
import type { ElectorateRace } from "@/lib/candidate-results";

const number = new Intl.NumberFormat("en-NZ");
function displayName(text: string) {
  const [surname,given] = text.split(", ");
  return given ? given + " " + surname.toLocaleLowerCase("en-NZ").replace(/(^|[ -])\p{L}/gu,l => l.toLocaleUpperCase("en-NZ")) : text;
}

function Rail({ races, complete }: { races: ElectorateRace[]; complete: boolean }) {
  const [paused,setPaused] = useState(false);
  const id = complete ? "complete-rail-title" : "counting-rail-title";
  const cards = (copy: boolean) => <div className={copy ? "rail-copy" : ""} aria-hidden={copy || undefined}>{races.map(race => {
    const [leader,runner] = race.candidates;
    const margin = leader.votes - (runner?.votes ?? 0);
    return <article key={race.id} className="border-b border-slate-100 bg-white p-4">
      <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold">{race.name}</h3><span className="shrink-0 text-[10px] font-bold text-[#00776f]">{race.reporting.toFixed(1)}%</span></div>
      <div className="mt-3 flex items-center gap-2"><PartyLogo name={leader.party} compact /><div className="min-w-0"><p className="text-xs font-bold">{displayName(leader.name)}</p><p className="mt-0.5 text-[10px] font-semibold" style={{color:partyColour(leader.party)}}>{leader.party}</p></div></div>
      <p className="mt-2 text-xs text-slate-600"><strong>{number.format(leader.votes)}</strong> votes · {runner && margin === 0 ? "Joint lead" : number.format(margin) + " vote lead"}</p>
      <progress value={race.reporting} max={100} aria-label={race.name + " voting places reporting"} className="mt-2 block h-1 w-full" />
      <p className="mt-2 text-[10px] font-semibold text-[#00776f]">{complete ? "Preliminary count complete" : "Counting in progress"}</p>
    </article>;
  })}</div>;
  return <aside className={"live-side-rail " + (complete ? "live-side-right" : "live-side-left")} aria-labelledby={id}>
    <div className="border-b border-teal-100 bg-[#eaf5f2] px-4 py-4">
      <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#00776f]"><span className="h-2 w-2 rounded-full bg-[#009f83] motion-safe:animate-pulse" aria-hidden />Live electorate status</p>
      <div className="mt-2 flex items-center justify-between gap-2"><h2 id={id} className="text-base font-bold">{complete ? "Completed counts" : "Still counting"}</h2><strong className="text-2xl tabular-nums text-[#00776f]">{races.length}</strong></div>
      <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-slate-500">Refreshes every 60s</span><button type="button" onClick={()=>setPaused(p=>!p)} aria-pressed={paused} className="rounded-md border border-teal-200 bg-white px-2 py-1 text-[10px] font-bold text-[#00776f]">{paused ? "Resume" : "Pause"}</button></div>
    </div>
    <p className="border-b border-slate-100 px-4 py-2 text-[10px] leading-4 text-slate-500">{complete ? "All voting places reporting. Results remain preliminary." : "Electorates nearest to completing their count."}</p>
    <div className={"side-rail-window " + (paused ? "rail-paused" : "")} tabIndex={0} role="region" aria-label={(complete ? "Completed preliminary counts" : "Counts in progress") + ". Hover or focus to pause scrolling."}>
      {races.length ? <div className="side-rail-track" style={{animationDuration:Math.max(30,races.length*9)+"s",animationPlayState:paused?"paused":undefined}}>{cards(false)}{cards(true)}</div> : <p className="p-4 text-xs leading-5 text-slate-500">{complete ? "Completed preliminary counts appear here as electorates finish reporting." : "No counts in progress available."}</p>}
    </div>
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-[10px] leading-4 text-slate-500"><p>Hover to pause · Special votes still to come</p><a href="https://electionresults.govt.nz/ge2026/electorate-status.html" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-[#00776f] underline">Source Electoral Commission</a></div>
  </aside>;
}

export function LiveSideRails({ races }: { races: ElectorateRace[] }) {
  const valid=races.filter(r=>r.validVotes>0 && r.candidates.length);
  return <>
    <Rail complete={false} races={valid.filter(r=>!r.countComplete).sort((a,b)=>b.reporting-a.reporting || a.name.localeCompare(b.name))} />
    <Rail complete races={valid.filter(r=>r.countComplete).sort((a,b)=>a.name.localeCompare(b.name))} />
    <style>{`
      .live-side-rail { display:flex; flex-direction:column; overflow:hidden; border:1px solid #cce5df; border-radius:16px; background:white; box-shadow:0 8px 28px #1025360a; }
      .live-side-left { display:none; }
      .live-side-right { margin-bottom:24px; }
      .side-rail-window { max-height:480px; overflow-y:auto; scrollbar-width:thin; }
      @media(min-width:1600px) {
        .election-night main { max-width:1280px; width:calc(100% - 536px); padding-left:16px; padding-right:16px; }
        .live-side-rail { position:fixed; top:126px; bottom:24px; width:236px; z-index:20; margin:0; }
        .live-side-left { display:flex; left:16px; }
        .live-side-right { right:16px; }
        .side-rail-window { flex:1; min-height:0; max-height:none; overflow:hidden; }
        .side-rail-track { animation:side-rail-rise linear infinite; }
        .side-rail-window:hover .side-rail-track,.side-rail-window:focus-within .side-rail-track { animation-play-state:paused!important; }
        .side-rail-window.rail-paused { overflow-y:auto; }
      }
      @keyframes side-rail-rise { to { transform:translateY(-50%); } }
      @media(max-width:1599px) { .rail-copy { display:none; } }
      @media(prefers-reduced-motion:reduce) {
        .side-rail-track { animation:none; }
        .side-rail-window { overflow-y:auto; }
        .rail-copy { display:none; }
      }
    `}</style>
  </>;
}
