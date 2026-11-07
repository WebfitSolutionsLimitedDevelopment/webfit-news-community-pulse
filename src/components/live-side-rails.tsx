"use client";
import { useEffect, useState } from "react";
import { PartyLogo } from "@/components/election-party-logo";
import { partyColour } from "@/lib/result-colours";
import type { ElectorateRace } from "@/lib/candidate-results";

const number = new Intl.NumberFormat("en-NZ");
function displayName(text: string) {
  const [surname,given] = text.split(", ");
  return given ? given + " " + surname.toLocaleLowerCase("en-NZ").replace(/(^|[ -])\p{L}/gu,l => l.toLocaleUpperCase("en-NZ")) : text;
}


function Spotlight({ races, complete }: { races: ElectorateRace[]; complete: boolean }) {
  const [index,setIndex]=useState(0);
  const [paused,setPaused]=useState(false);
  useEffect(()=>{
    if(paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer=window.setInterval(()=>{if(!document.hidden)setIndex(i=>i+1);},14000);
    return ()=>window.clearInterval(timer);
  },[paused]);
  const modes=complete ? ["Biggest vote leads","Strongest candidate shares","Completed count spotlight"] : ["On a knife edge","Almost through the count","Local contest spotlight"];
  const mode=index%3;
  const ranked=[...races].filter(r=>r.candidates.length>1).sort((a,b)=>{
    const margin=(r: ElectorateRace)=>r.candidates[0].votes-r.candidates[1].votes;
    if(mode===0) return complete ? margin(b)-margin(a) : margin(a)-margin(b);
    if(mode===1) return complete ? b.candidates[0].votes/b.validVotes-a.candidates[0].votes/a.validVotes : b.reporting-a.reporting;
    return a.name.localeCompare(b.name,"en-NZ");
  });
  const race=ranked[Math.floor(index/3)%Math.min(ranked.length,5)];
  if(!race) return null;
  const [leader,runner]=race.candidates;
  const margin=leader.votes-runner.votes;
  return <section className="rail-spotlight border-b border-blue-200 bg-gradient-to-br from-[#eef8ff] to-white p-4" aria-label={modes[mode]} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={()=>setPaused(false)}>
    <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-widest text-[#005bb5]">{modes[mode]}</p><span className="rounded-full bg-white px-2 py-1 text-[9px] text-blue-700">{mode+1} / 3</span></div>
    <div key={race.id+mode} className="spotlight-reveal">
      <h3 className="mt-2 text-xl font-bold text-[#063c78]">{race.name}</h3>
      <div className="mt-3 flex items-end justify-between gap-2"><div><strong className="text-3xl tabular-nums text-[#005bb5]">{number.format(margin)}</strong><p className="text-[10px] font-bold text-slate-600">{margin===0 ? "votes separate the joint leaders" : "votes separate the top two"}</p></div><span className="text-right text-[10px] text-slate-500">{race.reporting.toFixed(1)}%<br/>places reporting</span></div>
      <div className="mt-3 space-y-3">{[leader,runner].map((candidate,i)=><div key={candidate.id}>
        <div className="flex items-center justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2"><PartyLogo name={candidate.party} compact/><strong>{displayName(candidate.name)}</strong></span><strong className="shrink-0 tabular-nums">{(candidate.votes/race.validVotes*100).toFixed(1)}%</strong></div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full transition-[width] duration-1000" style={{width:candidate.votes/race.validVotes*100+"%",background:partyColour(candidate.party)}}/></div>
        <p className="mt-1 text-[10px] text-slate-500">{number.format(candidate.votes)} votes · {i===0 ? margin===0 ? "Joint leader" : "Leading" : "Challenger"}</p>
      </div>)}</div>
    </div>
    <div className="mt-3 flex items-center justify-between gap-2"><p className="text-[9px] text-slate-500">Preliminary · Live Commission feed</p><button type="button" onClick={()=>setIndex(i=>i+1)} className="rounded-md border border-blue-200 bg-white px-2 py-1 text-[10px] font-bold text-[#005bb5]">Next insight →</button></div>
  </section>;
}

function Rail({ races, complete }: { races: ElectorateRace[]; complete: boolean }) {
  const [paused,setPaused] = useState(false);
  const id = complete ? "complete-rail-title" : "counting-rail-title";
  const cards = (copy: boolean) => <div className={copy ? "rail-copy" : ""} aria-hidden={copy || undefined}>{races.map(race => {
    const [leader,runner] = race.candidates;
    const margin = leader.votes - (runner?.votes ?? 0);
    return <article key={race.id} className="border-b border-slate-100 bg-white p-4">
      <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold">{race.name}</h3><span className="shrink-0 text-[10px] font-bold text-[#005bb5]">{race.reporting.toFixed(1)}%</span></div>
      <div className="mt-3 flex items-center gap-2"><PartyLogo name={leader.party} compact /><div className="min-w-0"><p className="text-xs font-bold">{displayName(leader.name)}</p><p className="mt-0.5 text-[10px] font-semibold" style={{color:partyColour(leader.party)}}>{leader.party}</p></div></div>
      <p className="mt-2 text-xs text-slate-600"><strong>{number.format(leader.votes)}</strong> votes · {runner && margin === 0 ? "Joint lead" : number.format(margin) + " vote lead"}</p>
      <progress value={race.reporting} max={100} aria-label={race.name + " voting places reporting"} className="mt-2 block h-1 w-full" />
      <p className="mt-2 text-[10px] font-semibold text-[#005bb5]">{complete ? "Preliminary count complete" : "Counting in progress"}</p>
    </article>;
  })}</div>;
  return <aside className={"live-side-rail " + (complete ? "live-side-right" : "live-side-left")} aria-labelledby={id}>
    <div className="border-b border-blue-100 bg-[#e8f3ff] px-4 py-4">
      <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#005bb5]"><span className="h-2 w-2 rounded-full bg-[#009f83] motion-safe:animate-pulse" aria-hidden />Live electorate status</p>
      <div className="mt-2 flex items-center justify-between gap-2"><h2 id={id} className="text-base font-bold">{complete ? "Completed counts" : "Still counting"}</h2><strong className="text-2xl tabular-nums text-[#005bb5]">{races.length}</strong></div>
      <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-slate-500">Refreshes every 60s</span><button type="button" onClick={()=>setPaused(p=>!p)} aria-pressed={paused} className="rounded-md border border-blue-200 bg-white px-2 py-1 text-[10px] font-bold text-[#005bb5]">{paused ? "Resume" : "Pause"}</button></div>
    </div>
    <Spotlight races={races} complete={complete} />
    <p className="border-b border-slate-100 px-4 py-2 text-[10px] leading-4 text-slate-500">{complete ? "All voting places reporting. Results remain preliminary." : "Electorates nearest to completing their count."}</p>
    <div className={"side-rail-window " + (paused ? "rail-paused" : "")} tabIndex={0} role="region" aria-label={(complete ? "Completed preliminary counts" : "Counts in progress") + ". Hover or focus to pause scrolling."}>
      {races.length ? <div className="side-rail-track" style={{animationDuration:Math.max(30,races.length*9)+"s",animationPlayState:paused?"paused":undefined}}>{cards(false)}{cards(true)}</div> : <p className="p-4 text-xs leading-5 text-slate-500">{complete ? "Completed preliminary counts appear here as electorates finish reporting." : "No counts in progress available."}</p>}
    </div>
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-[10px] leading-4 text-slate-500"><p>Hover to pause · Special votes still to come</p><a href="https://electionresults.govt.nz/ge2026/electorate-status.html" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-[#005bb5] underline">Source Electoral Commission</a></div>
  </aside>;
}

export function LiveSideRails({ races }: { races: ElectorateRace[] }) {
  const valid=races.filter(r=>r.validVotes>0 && r.candidates.length);
  return <>
    <Rail complete={false} races={valid.filter(r=>!r.countComplete).sort((a,b)=>b.reporting-a.reporting || a.name.localeCompare(b.name))} />
    <Rail complete races={valid.filter(r=>r.countComplete).sort((a,b)=>a.name.localeCompare(b.name))} />
    <style>{`
      .live-side-rail { display:flex; flex-direction:column; overflow:hidden; border:1px solid #b8d6f5; border-radius:16px; background:white; box-shadow:0 8px 28px #005bb514; }
      .live-side-left { display:none; }
      .live-side-right { margin-bottom:24px; }
      .side-rail-window { max-height:480px; overflow-y:auto; scrollbar-width:thin; }
      @media(min-width:1600px) {
        .election-night main { max-width:1280px; width:calc(100% - 536px); padding-left:16px; padding-right:16px; }
        .live-side-rail { position:fixed; top:126px; bottom:24px; width:calc((100vw - min(1280px, 100vw - 536px)) / 2 - 24px); z-index:20; margin:0; }
        .live-side-left { display:flex; left:16px; }
        .live-side-right { right:16px; }
        .side-rail-window { flex:1; min-height:0; max-height:none; overflow:hidden; }
        .side-rail-track { animation:side-rail-rise linear infinite; }
        .side-rail-window:hover .side-rail-track,.side-rail-window:focus-within .side-rail-track { animation-play-state:paused!important; }
        .side-rail-window.rail-paused { overflow-y:auto; }
      }
      .rail-spotlight { flex-shrink:0; }
      .spotlight-reveal { animation:spotlight-enter .5s ease-out; }
      @keyframes spotlight-enter { from { opacity:.35; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      @media(min-width:1600px) and (max-height:850px) { .rail-spotlight { padding:12px; } .rail-spotlight h3 { font-size:16px; } .rail-spotlight .text-3xl { font-size:24px; } }
      @media(prefers-reduced-motion:reduce) { .spotlight-reveal { animation:none; } }
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
