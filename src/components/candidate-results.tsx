"use client";

import { useState } from "react";
import { PartyLogo } from "@/components/election-party-logo";
import { partyColour } from "@/lib/result-colours";
import { ResultsTicker } from "@/components/results-ticker";
import type { ElectorateRace } from "@/lib/candidate-results";

const FEATURED = ["SEYMOUR, David", "LUXON, Christopher", "HIPKINS, Chris", "SWARBRICK, Chlöe", "NGAREWA-PACKER, Debbie", "WAITITI, Rawiri"];
const number = new Intl.NumberFormat("en-NZ");
function displayName(name: string) {
  const [surname, given] = name.split(", ");
  return given ? given + " " + surname.toLocaleLowerCase("en-NZ").replace(/(^|[ -])\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-NZ")) : name;
}

export function CandidateResults({ races }: { races: ElectorateRace[] }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const normalise = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const search = normalise(query.trim());
  const visible = races.filter((race) => {
    if (search) return normalise(race.name + " " + race.candidates.map((candidate) => candidate.name).join(" ")).includes(search);
    return showAll || race.candidates.some((candidate) => FEATURED.includes(candidate.name));
  });

  return (
    <section className="rounded-2xl border border-[#dce4ef] bg-white p-4 shadow-sm sm:p-6" aria-labelledby="candidate-races-title">
      <p className="text-xs font-bold uppercase tracking-widest text-[#1d4ed8]">Electorate watch</p>
      <h2 id="candidate-races-title" className="mt-1 text-2xl font-bold tracking-tight">Candidates and key races</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">Preliminary candidate votes, current margins and voting places reporting. Expand a race for every candidate.</p>
      <div className="mt-4">
        <ResultsTicker
          label="Key races"
          updated={races.map((race) => race.updated).filter((time): time is string => Boolean(time)).sort().at(-1) ?? null}
          items={races.filter((race) => race.validVotes > 0 && race.candidates.some((candidate) => FEATURED.includes(candidate.name))).map((race) => {
            const leader = race.candidates[0];
            const margin = leader.votes - (race.candidates[1]?.votes ?? 0);
            return race.name + " · " + displayName(leader.name) + " · " + number.format(leader.votes) + " votes · " + (margin > 0 ? "lead " + number.format(margin) : "tied");
          })}
        />
      </div>
      <label className="mt-4 block text-sm font-semibold" htmlFor="candidate-search">Find a candidate or electorate</label>
      <input id="candidate-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Seymour, Epsom or your electorate" className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm placeholder:text-slate-500 focus:bg-white focus:outline-2 focus:outline-[#1d4ed8]" />
      <button type="button" onClick={() => setShowAll(!showAll)} aria-pressed={showAll} className="my-3 rounded-full bg-[#1d4ed8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        {showAll ? "Show key races" : "Show all electorates"}
      </button>
      <p className="mb-2 text-xs text-neutral-500">{races.length} of 71 electorate feeds available</p>
      <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
        {visible.map((race) => {
          const leader = race.candidates[0];
          const runner = race.candidates[1];
          const margin = leader.votes - (runner?.votes ?? 0);
          const featured = race.candidates.find((candidate) => FEATURED.includes(candidate.name));
          const voted = race.validVotes > 0;
          const tied = voted && runner && margin === 0;
          return (
            <details key={race.id} className="group overflow-hidden rounded-xl border border-slate-200 border-l-4 bg-white shadow-sm transition-shadow hover:shadow-md" style={{ borderLeftColor: partyColour(leader.party) }}>
              <summary className="cursor-pointer list-none p-4 focus-visible:outline-2 focus-visible:outline-[#1d4ed8] [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">{race.name}</h3>
                  <span className="shrink-0 text-xs font-semibold text-[#1d4ed8]"><span className="group-open:hidden">View candidates +</span><span className="hidden group-open:inline">Hide candidates −</span></span>
                </div>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{voted ? (tied ? "Joint leader" : "Leading candidate") : "Count pending"}</p>
                    <p className="mt-1 text-xl font-bold tracking-tight text-[#10213b]">{voted ? displayName(leader.name) : "Awaiting candidate votes"}</p>
                    <div className="mt-2 flex items-center gap-2"><PartyLogo name={leader.party} /><p className="text-sm font-semibold" style={{ color: partyColour(leader.party) }}>{leader.party}</p></div>
                  </div>
                  {voted && <div className="text-right">
                    <p className="text-2xl font-bold tabular-nums text-[#10213b]">{number.format(leader.votes)}</p>
                    <p className="text-xs text-slate-500">votes · {((leader.votes / race.validVotes) * 100).toFixed(1)}%</p>
                  </div>}
                </div>
                {runner && voted && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{tied ? "Tied with " : "Ahead of "}{displayName(runner.name)}{!tied && <strong className="ml-1">by {number.format(margin)} votes</strong>}</p>}
                {featured && voted && featured.id !== leader.id && <p className="mt-2 text-sm font-semibold text-slate-700">{displayName(featured.name)} · {tied && featured.votes === leader.votes ? "Tied" : "Trailing"}</p>}
                <progress aria-label={race.name + " voting places reporting"} value={race.reporting} max={100} className="mt-3 block h-1.5 w-full accent-[#1d4ed8]" />
                <p className="mt-1 text-xs text-neutral-500">{race.reporting.toFixed(1)}% of voting places reporting</p>
              </summary>
              <div className="border-t border-[#dce4ef] px-4 pb-4">
                {race.candidates.map((candidate) => {
                  const share = voted ? candidate.votes / race.validVotes * 100 : 0;
                  return (
                    <div key={candidate.id} className="mt-3 text-sm">
                      <div className="flex justify-between gap-3"><span className="font-semibold">{displayName(candidate.name)}</span><span className="shrink-0 tabular-nums">{number.format(candidate.votes)} · {share.toFixed(1)}%</span></div>
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
      <p className="mt-3 text-xs leading-5 text-neutral-500">Winston Peters and Marama Davidson are list candidates only in the Commission feed, so they have no individual electorate vote total. Leads can change as counting continues.</p>
      <a href="https://electionresults.govt.nz/ge2026/electorate-status.html" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#1d4ed8] underline">Source Electoral Commission · All electorate results</a>
    </section>
  );
}
