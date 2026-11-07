import { PartyLogo } from "@/components/election-party-logo";
import { partyColour } from "@/lib/result-colours";
import { loadCandidateRaces } from "@/lib/candidate-results";

const number = new Intl.NumberFormat("en-NZ");
function name(text: string) {
  const [surname, given] = text.split(", ");
  return given ? given + " " + surname.toLocaleLowerCase("en-NZ").replace(/(^|[ -])\p{L}/gu, letter => letter.toLocaleUpperCase("en-NZ")) : text;
}

export async function CompletedCounts() {
  const races = await loadCandidateRaces();
  const completed = races.filter(r => r.countComplete && r.validVotes > 0).sort((a,b) => a.name.localeCompare(b.name,"en-NZ"));
  return (
    <aside className="mb-8 self-start overflow-hidden rounded-2xl border border-teal-200 bg-white min-[1600px]:sticky min-[1600px]:top-5" aria-labelledby="completed-counts-title">
      <div className="border-b border-teal-100 bg-[#eaf5f2] p-5">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#00776f]"><span className="h-2 w-2 rounded-full bg-[#009f83]" aria-hidden />Live electorate status</p>
        <div className="mt-2 flex items-center justify-between gap-3"><h2 id="completed-counts-title" className="text-lg font-bold">Completed counts</h2><strong className="text-3xl tabular-nums text-[#00776f]">{completed.length}</strong></div>
        <p className="mt-1 text-xs leading-5 text-slate-600">All voting places reporting in these electorates. Updates every 60 seconds.</p>
      </div>
      <p className="border-b border-slate-100 px-5 py-3 text-[11px] leading-5 text-slate-500"><strong className="text-slate-700">Preliminary, not officially declared.</strong> Special votes and checks can change the result.</p>
      <div className="max-h-[560px] overflow-y-auto overscroll-contain" tabIndex={0} role="region" aria-label="Electorates with completed preliminary counts">
        {completed.map(race => {
          const [leader,runner] = race.candidates;
          const margin = leader.votes - (runner?.votes ?? 0);
          return <article key={race.id} className="border-b border-slate-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">{race.name}</h3><span className="rounded-full bg-teal-50 px-2 py-1 text-[9px] font-bold text-[#00776f]">100% reporting</span></div>
            <div className="mt-3 flex items-center gap-2"><PartyLogo name={leader.party} compact /><div className="min-w-0"><p className="text-sm font-bold">{name(leader.name)}</p><p className="text-[10px] font-semibold" style={{color:partyColour(leader.party)}}>{leader.party}</p></div></div>
            <p className="mt-2 text-xs text-slate-600">{runner && margin === 0 ? "Joint lead" : "Leading"} · <strong>{number.format(leader.votes)}</strong> votes{runner && margin > 0 ? " · " + number.format(margin) + " vote margin" : ""}</p>
            <p className="mt-1 text-[10px] font-semibold text-[#00776f]">Preliminary count complete</p>
            <a className="mt-2 inline-block text-[10px] font-semibold text-slate-500 underline" href={"https://electionresults.govt.nz/ge2026/electorate-details-" + race.id.padStart(2,"0") + ".html"} target="_blank" rel="noopener noreferrer">View Commission result</a>
          </article>;
        })}
        {!completed.length && <p className="p-5 text-xs leading-5 text-slate-500">{races.length ? "Completed preliminary counts will appear here as electorates finish reporting." : "Electorate results are temporarily unavailable. Checking again automatically."}</p>}
      </div>
      <a href="https://electionresults.govt.nz/ge2026/electorate-status.html" target="_blank" rel="noopener noreferrer" className="block bg-slate-50 px-5 py-3 text-[10px] font-semibold text-[#00776f] underline">Source Electoral Commission</a>
    </aside>
  );
}
