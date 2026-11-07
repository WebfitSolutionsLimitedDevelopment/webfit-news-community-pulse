"use client";
import { useEffect, useRef, useState } from "react";
import type { OfficialResults } from "@/lib/official-results";
import type { ElectorateRace } from "@/lib/candidate-results";

function person(text: string) {
  const [surname,given] = text.split(", ");
  return given ? given + " " + surname.toLocaleLowerCase("en-NZ").replace(/(^|[ -])\p{L}/gu,l=>l.toLocaleUpperCase("en-NZ")) : text;
}
function voiceScore(voice: SpeechSynthesisVoice) {
  const name=voice.name.toLowerCase();
  return (/natural|neural|premium|enhanced|siri/.test(name) ? 100 : 0)
    + (!voice.localService ? 40 : 0)
    + (/google|microsoft.*online/.test(name) ? 35 : 0)
    + (voice.lang==="en-NZ" ? 25 : voice.lang==="en-AU" ? 20 : voice.lang==="en-GB" ? 15 : 5)
    - (/compact|espeak|festival/.test(name) ? 80 : 0);
}
const numbers = new Intl.NumberFormat("en-NZ");
function raceLine(race: ElectorateRace) {
  const [leader,runner] = race.candidates;
  const margin = leader.votes - (runner?.votes ?? 0);
  return "In " + race.name + ", " + person(leader.name) + " of " + leader.party + " " +
    (runner && margin === 0 ? "is tied with " + person(runner.name) : "leads" + (runner ? " " + person(runner.name) + " by " + numbers.format(margin) + (margin === 1 ? " vote" : " votes") : "")) +
    ". So far, " + race.reporting.toFixed(1) + " percent of voting places have reported.";
}
export function ElectionVoice({ results, races }: { results: OfficialResults; races: ElectorateRace[] }) {
  const [enabled,setEnabled] = useState(false);
  const [supported,setSupported] = useState(false);
  const [failed,setFailed] = useState(false);
  const [caption,setCaption] = useState("");
  const [voices,setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceId,setVoiceId] = useState("");
  const chosenVoice = useRef("");
  const speaking = useRef<SpeechSynthesisUtterance | null>(null);
  const playback = useRef(0);
  const data = useRef({results,races});
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursor = useRef(0);
  const raceCursor = useRef(0);
  const completedSeen = useRef(new Set<string>());
  const pending = useRef<string | null>(null);
  const previous = useRef<OfficialResults | null>(null);

  function stop() {
    playback.current++;
    speaking.current=null;
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
      return "Let’s bring you up to date. We now have results from " + r.percentPlacesCounted.toFixed(1) + " percent of voting places. " +
        parties.slice(0,2).map(p=>p.name+" is on "+p.seats+" projected seats.").join(" ") + " Across the other parties, " + parties.slice(2).map(p=>p.name+" is on "+p.seats).join(", ")+". That puts the government grouping on "+r.blocs.government.seats+" seats, with "+r.majority+" needed for a majority. This is still the preliminary picture.";
    }
    if (segment===1 && valid.length) {
      const close=[...valid].sort((a,b)=>(a.candidates[0].votes-a.candidates[1].votes)-(b.candidates[0].votes-b.candidates[1].votes));
      return "Let’s turn to the seats keeping everyone watching. " + close.slice(0,2).map(raceLine).join(" ") + " There’s still very little between the front runners. Neither result is a declared win.";
    }
    if (segment===2 && complete.length) {
      const race=newlyComplete || complete[raceCursor.current++ % complete.length];
      completedSeen.current.add(race.id);
      return (newlyComplete ? "Another preliminary count to bring you. " : "A look at a completed preliminary count. ") +
        raceLine(race) + " All voting places in this electorate have reported. Special votes and official checks are still to come.";
    }
    const counting=valid.filter(race=>!race.countComplete).sort((a,b)=>b.reporting-a.reporting);
    if (counting.length) return "Let’s check a contest where counting is continuing. " + raceLine(counting[raceCursor.current++ % counting.length]) + " We will keep following this contest.";
    const small=r.parties.filter(p=>p.seats>0).sort((a,b)=>b.percent-a.percent).slice(4);
    return "Looking across Parliament. " + small.map(p=>p.name+" has "+p.seats+" projected seats.").join(" ") + r.majority + " seats are needed for a majority. All results remain preliminary.";
  }
  function play(text: string) {
    if (!active.current || document.hidden) return;
    if (timer.current) clearTimeout(timer.current);
    setCaption(text);
    const generation=++playback.current;
    // Short sentences give browser voices breathing room and avoid long-utterance stalls.
    const sentences=text.match(/[^.!?]+(?:[.!?](?=\s|$)|$)/g) || [text];
    const available=window.speechSynthesis.getVoices().filter(v=>v.lang.startsWith("en")).sort((a,b)=>voiceScore(b)-voiceScore(a));
    const voice=available.find(v=>v.voiceURI===chosenVoice.current) || available[0];
    let position=0;
    const next=()=>{
      if(!active.current || document.hidden || generation!==playback.current) return;
      if(position>=sentences.length) {
        speaking.current=null;
        timer.current=setTimeout(()=>play(bulletin()),10000);
        return;
      }
      const utterance=new SpeechSynthesisUtterance(sentences[position++].trim());
      utterance.lang=voice?.lang || "en-NZ";
      utterance.rate=1; utterance.pitch=1; utterance.volume=0.85;
      if(voice) utterance.voice=voice;
      speaking.current=utterance;
      utterance.onend=()=>{
        if(generation===playback.current && active.current) timer.current=setTimeout(next,position===1 ? 400 : 280);
      };
      utterance.onerror=event=>{
        if(generation!==playback.current || event.error==="canceled" || event.error==="interrupted") return;
        active.current=false; setEnabled(false); setFailed(true); speaking.current=null;
      };
      window.speechSynthesis.speak(utterance);
    };
    next();
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
    const refreshVoices=()=>{
      const list=window.speechSynthesis.getVoices().filter(v=>v.lang.startsWith("en")).sort((a,b)=>voiceScore(b)-voiceScore(a));
      setVoices(list);
    };
    if("speechSynthesis" in window) { refreshVoices(); window.speechSynthesis.addEventListener("voiceschanged",refreshVoices); }
    const visibility=()=>{ stop(); if(active.current && !document.hidden) timer.current=setTimeout(()=>play(bulletin()),1500); };
    document.addEventListener("visibilitychange",visibility);
    return ()=>{active.current=false;stop();document.removeEventListener("visibilitychange",visibility);if("speechSynthesis" in window)window.speechSynthesis.removeEventListener("voiceschanged",refreshVoices);};
  },[]);
  const toggle=()=>{
    if(active.current){active.current=false;setEnabled(false);stop();return;}
    stop();active.current=true;setEnabled(true);setFailed(false);pending.current=null;cursor.current=0;
    play("Welcome to Webfit News live election coverage. "+bulletin());
  };
  return <span className="inline-flex items-center gap-1">
    <button type="button" disabled={!supported} aria-pressed={enabled} onClick={toggle}
      title="Rolling commentary on the national result, closest races and completed preliminary counts. Pauses when this tab is hidden."
      className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-semibold normal-case tracking-normal text-[#005bb5] disabled:opacity-50">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M11 5 6 9H3v6h3l5 4V5Z"/>{enabled ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/> : <path d="m16 9 6 6m0-6-6 6"/>}</svg>
      {failed ? "Retry commentary" : enabled ? "Mute commentary" : supported ? "Listen live" : "Voice unavailable"}
    </button>
    {supported && voices.length>0 && <select aria-label="Commentary voice" title="Choose the voice that sounds most natural on this device" value={voiceId} onChange={event=>{
      chosenVoice.current=event.target.value; setVoiceId(event.target.value);
      if(active.current){stop();play("You’re listening to Webfit News. "+bulletin());}
    }} className="max-w-[150px] rounded-full border border-blue-200 bg-white px-2 py-1 text-[10px] font-semibold normal-case tracking-normal text-[#005bb5]">
      <option value="">Best available voice</option>
      {voices.map(voice=><option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
    </select>}
    <span className="sr-only" aria-live="off">{caption}</span>
  </span>;
}
