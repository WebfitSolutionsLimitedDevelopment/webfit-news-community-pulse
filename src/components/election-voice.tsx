"use client";
import { useEffect, useRef, useState } from "react";
import type { OfficialResults } from "@/lib/official-results";
import type { ElectorateRace } from "@/lib/candidate-results";

function person(text: string) {
  const [surname,given] = text.split(", ");
  return given ? given + " " + surname.toLocaleLowerCase("en-NZ").replace(/(^|[ -])\p{L}/gu,l=>l.toLocaleUpperCase("en-NZ")) : text;
}
const numbers = new Intl.NumberFormat("en-NZ");
function raceLine(race: ElectorateRace) {
  const [leader,runner] = race.candidates;
  const margin = leader.votes - (runner?.votes ?? 0);
  return race.name + ". " + person(leader.name) + ", " + leader.party + ", " +
    (runner && margin === 0 ? "is tied with " + person(runner.name) : "leads" + (runner ? " " + person(runner.name) + " by " + numbers.format(margin) + (margin === 1 ? " vote" : " votes") : "")) +
    ". " + race.reporting.toFixed(1) + " percent of voting places reporting.";
}
export function ElectionVoice({ results, races }: { results: OfficialResults; races: ElectorateRace[] }) {
  const [enabled,setEnabled] = useState(false);
  const [supported,setSupported] = useState(false);
  const [failed,setFailed] = useState(false);
  const [caption,setCaption] = useState("");
  const data = useRef({results,races});
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursor = useRef(0);
  const raceCursor = useRef(0);
  const completedSeen = useRef(new Set<string>());
  const pending = useRef<string | null>(null);
  const previous = useRef<OfficialResults | null>(null);

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  function bulletin(): string {
    const {results:r,races:all} = data.current;
    if (!r.ok || !r.hasResults) return "We are waiting for the next available result from the Electoral Commission. Stay with Webfit News.";
    if (pending.current) { const message=pending.current; pending.current=null; return message; }
    const valid=all.filter(race=>race.validVotes>0 && race.candidates.length>1);
    const complete=valid.filter(race=>race.countComplete);
    const newlyComplete=complete.find(race=>!completedSeen.current.has(race.id));
    const segment=cursor.current++ % 4;
    if (segment===0) {
      const parties=[...r.parties].filter(p=>p.seats>0).sort((a,b)=>b.percent-a.percent);
      return "Here is the national picture. " + r.percentPlacesCounted.toFixed(1) + " percent of voting places are reporting. " +
        parties.slice(0,4).map(p=>p.name+" is projected to have "+p.seats+" seats.").join(" ") + " These projections can still change.";
    }
    if (segment===1 && valid.length) {
      const close=[...valid].sort((a,b)=>(a.candidates[0].votes-a.candidates[1].votes)-(b.candidates[0].votes-b.candidates[1].votes));
      return "Now to the closest contests. " + close.slice(0,2).map(raceLine).join(" ") + " These are leads, not declared wins.";
    }
    if (segment===2 && complete.length) {
      const race=newlyComplete || complete[raceCursor.current++ % complete.length];
      completedSeen.current.add(race.id);
      return (newlyComplete ? "Another preliminary count to bring you. " : "A look at a completed preliminary count. ") +
        raceLine(race) + " All voting places in this electorate have reported. Special votes and official checks are still to come.";
    }
    const counting=valid.filter(race=>!race.countComplete).sort((a,b)=>b.reporting-a.reporting);
    if (counting.length) return "Still counting in " + raceLine(counting[raceCursor.current++ % counting.length]) + " We will keep following this contest.";
    const small=r.parties.filter(p=>p.seats>0).sort((a,b)=>b.percent-a.percent).slice(4);
    return "Looking across Parliament. " + small.map(p=>p.name+" has "+p.seats+" projected seats.").join(" ") + r.majority + " seats are needed for a majority. All results remain preliminary.";
  }
  function play(text: string) {
    if (!active.current || document.hidden) return;
    if (timer.current) clearTimeout(timer.current);
    setCaption(text);
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.lang="en-NZ"; utterance.rate=0.96; utterance.volume=0.7;
    const voices=window.speechSynthesis.getVoices();
    const voice=voices.find(v=>v.lang==="en-NZ") || voices.find(v=>v.lang==="en-AU") || voices.find(v=>v.lang.startsWith("en"));
    if(voice) utterance.voice=voice;
    utterance.onend=()=>{ if(active.current && !document.hidden) timer.current=setTimeout(()=>play(bulletin()),10000); };
    utterance.onerror=event=>{
      if(event.error==="canceled" || event.error==="interrupted") return;
      active.current=false; setEnabled(false); setFailed(true);
    };
    window.speechSynthesis.speak(utterance);
  }
  useEffect(()=>{
    const prior=previous.current;
    data.current={results,races};
    if(results.ok && results.hasResults && results.updated && (!prior?.updated || results.updated>prior.updated)) {
      if(prior) {
        const changed=results.parties.filter(p=>{ const old=prior.parties.find(o=>o.abbrev===p.abbrev); return old && old.seats!==p.seats; });
        const majorityChanged=(prior.blocs.government.seats>=prior.majority)!==(results.blocs.government.seats>=results.majority);
        if(changed.length || majorityChanged) pending.current="An update to the projections. "+changed.slice(0,4).map(p=>p.name+" now has "+p.seats+" projected seats.").join(" ")+(majorityChanged ? " The government grouping "+(results.blocs.government.seats>=results.majority ? "now reaches" : "is now below")+" the projected majority threshold." : "")+" Results remain preliminary.";
      }
      previous.current=results;
    }
  },[results,races]);
  useEffect(()=>{
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    const visibility=()=>{ stop(); if(active.current && !document.hidden) timer.current=setTimeout(()=>play(bulletin()),1500); };
    document.addEventListener("visibilitychange",visibility);
    return ()=>{active.current=false;stop();document.removeEventListener("visibilitychange",visibility);};
  },[]);
  const toggle=()=>{
    if(active.current){active.current=false;setEnabled(false);stop();return;}
    stop();active.current=true;setEnabled(true);setFailed(false);pending.current=null;cursor.current=0;
    play("Welcome to Webfit News live election coverage. "+bulletin());
  };
  return <span className="inline-flex">
    <button type="button" disabled={!supported} aria-pressed={enabled} onClick={toggle}
      title="Rolling commentary on the national result, closest races and completed preliminary counts. Pauses when this tab is hidden."
      className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-semibold normal-case tracking-normal text-[#005bb5] disabled:opacity-50">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M11 5 6 9H3v6h3l5 4V5Z"/>{enabled ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/> : <path d="m16 9 6 6m0-6-6 6"/>}</svg>
      {failed ? "Retry commentary" : enabled ? "Mute commentary" : supported ? "Listen live" : "Voice unavailable"}
    </button>
    <span className="sr-only" aria-live="off">{caption}</span>
  </span>;
}
