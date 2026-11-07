"use client";

import { useRef, useState } from "react";
import { PartyLogo } from "@/components/election-party-logo";
import { partyColour } from "@/lib/result-colours";
import type { ElectorateRace } from "@/lib/candidate-results";

const FEATURED = ["SEYMOUR, David", "LUXON, Christopher", "HIPKINS, Chris", "SWARBRICK, Chlöe", "NGAREWA-PACKER, Debbie", "WAITITI, Rawiri"];
const number = new Intl.NumberFormat("en-NZ");
function displayName(name: string) {
  const [surname, given] = name.split(", ");
  return given ? given + " " + surname.toLocaleLowerCase("en-NZ").replace(/(^|[ -])\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-NZ")) : name;
}


function ElectorateParade({ races }: { races: ElectorateRace[] }) {
  const [paused, setPaused] = useState(false);
  const ordered = [...races].sort((a, b) => a.name.localeCompare(b.name, "en-NZ", { sensitivity: "base" }));
  if (!ordered.length) return null;

  const cards = (duplicate: boolean) => (
    <div className={duplicate ? "electorate-parade-copy flex shrink-0 gap-4 pr-4" : "flex shrink-0 gap-4 pr-4"} aria-hidden={duplicate || undefined}>
      {ordered.map((race) => {
        const leader = race.candidates[0];
        if (!leader) return null;
        const runner = race.candidates[1];
        const margin = leader.votes - (runner?.votes ?? 0);
        const voted = race.validVotes > 0;
        return (
          <article key={race.id} className="w-[320px] shrink-0 rounded-xl border border-slate-200 border-t-[3px] bg-white p-4 sm:w-[360px]" style={{ borderTopColor: partyColour(leader.party) }}>
            <h3 className="text-sm font-bold text-[#172b40]">{race.name}</h3>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{voted ? (runner && margin === 0 ? "Joint leader" : "Leading candidate") : "Count pending"}</p>
                <p className="mt-1 text-base font-bold leading-snug tracking-tight text-[#10213b]">{voted ? displayName(leader.name) : "Awaiting candidate votes"}</p>
              </div>
              {voted && <div className="shrink-0 text-right"><p className="text-xl font-bold tabular-nums text-[#10213b]">{number.format(leader.votes)}</p><p className="text-[10px] text-slate-500">votes · {(leader.votes / race.validVotes * 100).toFixed(1)}%</p></div>}
            </div>
            <div className="mt-2 flex items-center gap-2"><PartyLogo name={leader.party} compact /><p className="text-[11px] font-semibold" style={{ color: partyColour(leader.party) }}>{leader.party}</p></div>
            <p className="mt-3 truncate rounded-lg bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-600">{voted && runner ? <>{margin === 0 ? "Tied with " : "Ahead of "}{displayName(runner.name)}{margin > 0 && <strong> by {number.format(margin)} votes</strong>}</> : "Awaiting further results"}</p>
            <progress aria-label={race.name + " voting places reporting"} value={race.reporting} max={100} className="mt-3 block h-1.5 w-full" />
            <p className="mt-1 text-[10px] text-slate-500">{race.reporting.toFixed(1)}% of voting places reporting</p>
          </article>
        );
      })}
    </div>
  );

  return (
    <section className="electorate-parade mb-6 min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-[#edf3f4] py-5" aria-labelledby="electorate-parade-title">
      <div className="mb-4 flex items-center justify-between gap-3 px-5 sm:px-7">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#00776f]">Around the electorates</p><h2 id="electorate-parade-title" className="mt-1 text-lg font-bold">Every race. A–Z.</h2><p className="mt-1 text-xs text-slate-500">{ordered.length} electorates · Latest preliminary results · Refreshes every 60s</p></div>
        <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)} className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#00776f] focus-visible:outline-2 focus-visible:outline-[#00776f]">{paused ? "Resume cards" : "Pause cards"}</button>
      </div>
      <div className="electorate-parade-window" tabIndex={0} role="region" aria-label="Electorate results moving from right to left in alphabetical order. Hover or focus to pause. Search all races below.">
        <div className="electorate-parade-track flex w-max" style={{ animationDuration: ordered.length * 10 + "s", animationPlayState: paused ? "paused" : undefined }}>
          {cards(false)}{cards(true)}
        </div>
      </div>
      <p className="mt-3 px-5 text-[10px] text-slate-500 sm:px-7">Hover to pause · Use the search below to explore any race · Source Electoral Commission</p>
      <style>{`
        .electorate-parade-window { overflow: hidden; }
        .electorate-parade-track { animation: electorate-parade-travel linear infinite; }
        .electorate-parade-window:hover .electorate-parade-track,
        .electorate-parade-window:focus-within .electorate-parade-track { animation-play-state: paused !important; }
        @keyframes electorate-parade-travel { to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) {
          .electorate-parade-window { overflow-x: auto; scrollbar-width: thin; }
          .electorate-parade-track { animation: none; }
          .electorate-parade-copy { display: none; }
        }
      `}</style>
    </section>
  );
}

export function CandidateResults({ races }: { races: ElectorateRace[] }) {
  const panel = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(0);
  const normalise = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const search = normalise(query.trim());
  const visible = races.filter((race) => {
    if (search) return normalise(race.name + " " + race.candidates.map((candidate) => candidate.name).join(" ")).includes(search);
    return showAll || race.candidates.some((candidate) => FEATURED.includes(candidate.name));
  });

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    panel.current?.scrollIntoView({ block: "start" });
  };
  const pageSize = 12;
  const lastPage = Math.max(0, Math.ceil(visible.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const pageRaces = visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <>
    <ElectorateParade races={races} />
    <section ref={panel} className="mb-6 scroll-mt-5 rounded-[24px] border border-slate-200 bg-white p-5 sm:p-7" aria-labelledby="candidate-races-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#00776f]">Every local contest</p>
          <h2 id="candidate-races-title" className="mt-1 scroll-mt-5 text-2xl font-bold tracking-tight">Follow the electorate races</h2>
          <p className="mt-1 text-xs text-slate-500">{races.length} of 71 feeds available · Preliminary</p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1" aria-label="Race view">
          <button type="button" onClick={() => { setShowAll(false); setPage(0); }} aria-pressed={!showAll} className={`rounded-md px-3 py-2 text-xs font-semibold ${!showAll ? "bg-white text-[#00776f] shadow-sm" : "text-slate-600 hover:text-[#00776f]"}`}>Key races</button>
          <button type="button" onClick={() => { setShowAll(true); setPage(0); }} aria-pressed={showAll} className={`rounded-md px-3 py-2 text-xs font-semibold ${showAll ? "bg-white text-[#00776f] shadow-sm" : "text-slate-600 hover:text-[#00776f]"}`}>All electorates</button>
        </div>
      </div>
      <label className="mt-4 block text-xs font-semibold text-slate-600" htmlFor="candidate-search">Find a candidate or electorate</label>
      <input id="candidate-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Search names or electorates…" className="mb-4 mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm placeholder:text-slate-500 focus:bg-white focus:outline-2 focus:outline-[#00776f]" />
      <div className={`grid items-start gap-4 ${pageRaces.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}>
        {pageRaces.map((race) => {
          const leader = race.candidates[0];
          const runner = race.candidates[1];
          const margin = leader.votes - (runner?.votes ?? 0);
          const featured = race.candidates.find((candidate) => FEATURED.includes(candidate.name));
          const voted = race.validVotes > 0;
          const tied = voted && runner && margin === 0;
          return (
            <details key={race.id} className="group overflow-hidden open:col-span-full rounded-xl border border-slate-200 border-t-[3px] bg-white transition-shadow hover:shadow-md" style={{ borderTopColor: partyColour(leader.party) }}>
              <summary className="cursor-pointer list-none p-4 focus-visible:outline-2 focus-visible:outline-[#1d4ed8] [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold">{race.name}</h3>
                  <span className="shrink-0 text-xs font-semibold text-[#1d4ed8]"><span className="group-open:hidden">Details +</span><span className="hidden group-open:inline">Close −</span></span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{voted ? (tied ? "Joint leader" : "Leading candidate") : "Count pending"}</p>
                    <p className="mt-1 text-base font-bold leading-snug tracking-tight text-[#10213b]">{voted ? displayName(leader.name) : "Awaiting candidate votes"}</p>
                    <div className="mt-2 flex items-center gap-2"><PartyLogo name={leader.party} compact /><p className="text-[11px] font-semibold leading-4" style={{ color: partyColour(leader.party) }}>{leader.party}</p></div>
                  </div>
                  {voted && <div className="shrink-0 text-right">
                    <p className="text-xl font-bold tabular-nums text-[#10213b]">{number.format(leader.votes)}</p>
                    <p className="text-[10px] text-slate-500">votes · {((leader.votes / race.validVotes) * 100).toFixed(1)}%</p>
                  </div>}
                </div>
                {runner && voted && <p className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-600">{tied ? "Tied with " : "Ahead of "}{displayName(runner.name)}{!tied && <strong> by {number.format(margin)} votes</strong>}</p>}
                {featured && voted && featured.id !== leader.id && <p className="mt-2 text-sm font-semibold text-slate-700">{displayName(featured.name)} · {tied && featured.votes === leader.votes ? "Tied" : "Trailing"}</p>}
                <progress aria-label={race.name + " voting places reporting"} value={race.reporting} max={100} className="mt-3 block h-1.5 w-full accent-[#1d4ed8]" />
                <p className="mt-1 text-[10px] text-slate-500">{race.reporting.toFixed(1)}% of voting places reporting</p>
              </summary>
              <div className="border-t border-[#dce4ef] px-4 pb-4">
                {race.candidates.map((candidate) => {
                  const share = voted ? candidate.votes / race.validVotes * 100 : 0;
                  return (
                    <div key={candidate.id} className="mt-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-1"><span className="font-semibold">{displayName(candidate.name)}</span><span className="shrink-0 tabular-nums">{number.format(candidate.votes)} · {share.toFixed(1)}%</span></div>
                      <p className="text-xs text-neutral-500">{candidate.party}</p>
                      <div className="mt-2 h-2 rounded-full bg-slate-100" aria-hidden><div className="h-full rounded-full" style={{width: share + "%", background: partyColour(candidate.party)}} /></div>
                    </div>
                  );
                })}
                <p className="mt-3 text-xs text-neutral-500">Percentages use valid candidate votes counted in this electorate.</p>
                {race.updated && <p className="mt-1 text-xs text-neutral-500">Feed updated {race.updated.replace("T", " ")} NZ time</p>}
                <a href={"https://electionresults.govt.nz/ge2026/electorate-details-" + race.id.padStart(2, "0") + ".html"} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#1d4ed8] underline">Source Electoral Commission</a>
              </div>
            </details>
          );
        })}
        {visible.length === 0 && <p className="py-4 text-sm text-neutral-600">{races.length ? "No matching electorate candidate found." : "Candidate feeds are temporarily unavailable. Updates will appear when the feed returns."}</p>}
      </div>
      {visible.length > pageSize && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500" aria-live="polite">Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, visible.length)} of {visible.length}</p>
          <div className="flex gap-2">
            <button type="button" disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-40">Previous</button>
            <button type="button" disabled={currentPage === lastPage} onClick={() => changePage(currentPage + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
      <p className="mt-4 text-[11px] leading-5 text-slate-500">Winston Peters and Marama Davidson are list candidates only in the Commission feed, so they have no individual electorate vote total. Leads can change as counting continues.</p>
      <a href="https://electionresults.govt.nz/ge2026/electorate-status.html" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#1d4ed8] underline">Source Electoral Commission · All electorate results</a>
    </section>
    </>
  );
}
