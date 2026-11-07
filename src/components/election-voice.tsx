"use client";

import { useEffect, useRef, useState } from "react";
import type { OfficialResults } from "@/lib/official-results";

type VoiceSnapshot = { updated: string; majority: number; government: number; opposition: number; parties: { abbrev: string; name: string; seats: number }[] };

function snapshot(results: OfficialResults): VoiceSnapshot | null {
  return results.ok && results.hasResults && results.updated ? {
    updated: results.updated, majority: results.majority,
    government: results.blocs.government.seats, opposition: results.blocs.opposition.seats,
    parties: results.parties.map(({abbrev,name,seats}) => ({abbrev,name,seats})),
  } : null;
}

export function ElectionVoice({ results }: { results: OfficialResults }) {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const [failed, setFailed] = useState(false);
  const previous = useRef<VoiceSnapshot | null>(null);
  const active = useRef(false);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-NZ";
    utterance.rate = 0.97;
    utterance.volume = 0.65;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === "en-NZ") || voices.find(v => v.lang === "en-AU");
    if (voice) utterance.voice = voice;
    utterance.onerror = event => {
      if (event.error !== "canceled" && event.error !== "interrupted") {
        active.current = false;
        setEnabled(false);
        setFailed(true);
      }
    };
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    const onVisibility = () => { if (document.hidden && "speechSynthesis" in window) window.speechSynthesis.cancel(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const current = snapshot(results);
    if (!current) return;
    const prior = previous.current;
    if (prior && current.updated <= prior.updated) return;
    previous.current = current;
    if (!active.current || !prior || document.hidden) return;
    const changes: string[] = [];
    if ((prior.government >= prior.majority) !== (current.government >= current.majority))
      changes.push(current.government >= current.majority ? "The government grouping now has a projected majority." : "The government grouping no longer has a projected majority.");
    if ((prior.opposition >= prior.majority) !== (current.opposition >= current.majority))
      changes.push(current.opposition >= current.majority ? "The opposition grouping now has a projected majority." : "The opposition grouping no longer has a projected majority.");
    for (const party of current.parties) {
      const old = prior.parties.find(p => p.abbrev === party.abbrev);
      if (!old || old.seats === party.seats) continue;
      changes.push(party.name + " moves from " + old.seats + " to " + party.seats + " projected seats.");
    }
    if (changes.length) speak("Webfit News election update. " + changes.slice(0,4).join(" ") + " Results remain preliminary.");
  }, [results]);

  const toggle = () => {
    if (enabled) {
      active.current = false;
      setEnabled(false);
      window.speechSynthesis.cancel();
      return;
    }
    setFailed(false);
    previous.current = snapshot(results);
    active.current = true;
    setEnabled(true);
    speak("Welcome to Webfit News election coverage. Voice alerts are on for major projected seat changes. Results are preliminary.");
  };

  return (
    <button type="button" onClick={toggle} disabled={!supported} aria-pressed={enabled}
      title="Spoken welcome and alerts for projected seat changes and majority changes. Plays while this page is visible. Click to mute."
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold normal-case tracking-normal text-[#00776f] disabled:opacity-50">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M11 5 6 9H3v6h3l5 4V5Z"/>{enabled ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/> : <path d="m16 9 6 6m0-6-6 6"/>}</svg>
      {failed ? "Retry voice" : enabled ? "Mute voice" : supported ? "Enable voice" : "Voice unavailable"}
    </button>
  );
}
