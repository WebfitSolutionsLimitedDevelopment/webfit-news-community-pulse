import { PartyLogo } from "@/components/election-party-logo";
import { partyColour } from "@/lib/result-colours";
import type { OfficialResults } from "@/lib/official-results";

function SeatChamber({ results }: { results: OfficialResults }) {
  const order = ["NAT", "ACT", "NZF", "OPP", "LAB", "GP", "TPMAO"];
  const parties = [...results.parties].sort((a, b) => {
    const ai = order.indexOf(a.abbrev);
    const bi = order.indexOf(b.abbrev);
    return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi);
  });
  const seats = parties.flatMap((party) => Array.from({ length: party.seats }, () => party));
  const radii = [70, 94, 118, 142, 166, 190];
  const totalRadius = radii.reduce((sum, radius) => sum + radius, 0);
  const counts = radii.map((radius) => Math.floor(seats.length * radius / totalRadius));
  for (let remaining = seats.length - counts.reduce((sum, count) => sum + count, 0), i = counts.length - 1; remaining > 0; remaining--, i = (i + counts.length - 1) % counts.length) counts[i]++;
  const points = radii.flatMap((radius, row) => Array.from({ length: counts[row] }, (_, i) => {
    const angle = counts[row] === 1 ? Math.PI / 2 : Math.PI - (i / (counts[row] - 1)) * Math.PI;
    return { angle, row, x: 210 + Math.cos(angle) * radius, y: 205 - Math.sin(angle) * radius };
  })).sort((a, b) => b.angle - a.angle || a.row - b.row);

  return (
    <figure className="relative mx-auto w-full max-w-[500px]">
      <svg viewBox="0 0 420 235" role="img" aria-label={results.totalSeats + " projected parliamentary seats. Each dot represents one seat."} className="w-full">
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={5.4} fill={partyColour(seats[index].abbrev)} stroke="#ffffff" strokeOpacity="0.16" strokeWidth="0.8">
            <title>{seats[index].name} · projected seat</title>
          </circle>
        ))}
        <text x="210" y="183" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="38" fontWeight="700">{results.majority}</text>
        <text x="210" y="204" textAnchor="middle" fill="#b6c8d9" fontFamily="Arial, sans-serif" fontSize="11">seats for a majority</text>
      </svg>
      <figcaption className="text-center text-[11px] text-slate-400">One dot = one projected seat · {results.totalSeats} seats currently projected</figcaption>
    </figure>
  );
}

export function NationalResults({ results }: { results: OfficialResults }) {
  const sorted = [...results.parties].sort((a, b) => b.percent - a.percent || b.seats - a.seats);
  const main = sorted.filter((party) => party.seats > 0 || party.percent >= 1);
  const others = sorted.filter((party) => party.seats === 0 && party.percent < 1);
  const government = results.blocs.government.seats;
  const opposition = results.blocs.opposition.seats;
  const headline = government >= results.majority
    ? "Government parties hold a projected majority"
    : opposition >= results.majority
      ? "Opposition parties hold a projected majority"
      : "No bloc has a projected majority";
  const percent = (value: number) => value.toFixed(1) + "%";

  function rows(parties: OfficialResults["parties"]) {
    return parties.map((party) => (
      <li key={party.abbrev} className="group grid grid-cols-[40px_minmax(0,1fr)_62px_40px] items-center gap-x-3 rounded-lg border-b border-slate-100 px-1 py-3 transition-colors hover:bg-slate-50 sm:grid-cols-[52px_minmax(0,1fr)_74px_58px]">
        <PartyLogo name={party.name} compact />
        <div className="min-w-0">
          <p className="text-sm font-bold leading-5 text-[#172b40]">{party.name}</p>
          <div className="mt-2 h-2.5 rounded-full bg-slate-100" aria-hidden>
            <div className="h-full rounded-full" style={{ width: percent(party.percent), background: partyColour(party.abbrev) }} />
          </div>
        </div>
        <p className="text-right text-xl font-bold tabular-nums tracking-tight text-[#172b40] sm:text-2xl">{percent(party.percent)}</p>
        <div className="text-right">
          <p className="text-2xl font-bold leading-none tabular-nums text-[#172b40]">{party.seats}</p>
          <p className="mt-1 hidden whitespace-nowrap text-[9px] leading-3 text-slate-500 sm:block">{party.electorateSeats} local + {party.listSeats} list</p>
        </div>
      </li>
    ));
  }

  return (
    <section id="party-results" className="mb-8 grid scroll-mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,35,55,0.07)] lg:grid-cols-[0.9fr_1.1fr]" aria-label="National results">
      <div className="relative flex flex-col bg-[radial-gradient(ellipse_at_top_left,#1c4653_0%,#102536_65%)] px-6 py-7 text-white sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8dddd7]">The shape of Parliament</p>
          <span className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-semibold text-slate-300">Projected seats</span>
        </div>
        <h2 className="mt-4 max-w-lg text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{headline}</h2>
        <div className="mt-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold text-[#b6d9dd]">Majority watch</p>
            <p className="text-sm font-bold">{results.majority} seats needed</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-300">{government >= results.majority
            ? "Government grouping is " + (government - results.majority) + " seat" + (government - results.majority === 1 ? "" : "s") + " above the majority threshold."
            : "Government grouping needs " + (results.majority - government) + " more seat" + (results.majority - government === 1 ? "" : "s") + " to reach a majority."}</p>
          <div className="relative mt-3 h-2 rounded-full bg-white/10" aria-hidden>
            <div className="h-full rounded-full bg-[#8dddd7]" style={{width: Math.min(100, government / Math.max(1, results.totalSeats) * 100) + "%"}} />
            <span className="absolute -top-1 h-4 w-0.5 bg-white" style={{left: results.majority / Math.max(1, results.totalSeats) * 100 + "%"}} />
          </div>
        </div>
        <div className="my-auto py-5"><SeatChamber results={results} /></div>
        <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
          {[
            { label: "Government", seats: government, colour: "#79afff", parties: "National · ACT · NZ First" },
            { label: "Other parties", seats: results.blocs.other.seats, colour: "#8dddd7", parties: "Outside these groupings" },
            { label: "Opposition", seats: opposition, colour: "#ffa4b4", parties: "Labour · Green · Te Pāti Māori" },
          ].map((bloc) => (
            <div key={bloc.label}>
              <p className="text-[11px] text-slate-300">{bloc.label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums" style={{color: bloc.colour}}>{bloc.seats}</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">{bloc.parties}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00776f]">Nationwide party vote</p>
            <h2 className="mt-1 text-xl font-bold text-[#172b40]">How the parties stand</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-500">Sorted by vote share</span>
        </div>
        <div className="mt-5 grid grid-cols-[48px_minmax(0,1fr)_62px_46px] gap-x-3 border-b border-slate-200 pb-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:grid-cols-[52px_minmax(0,1fr)_74px_58px]">
          <span className="col-span-2 text-left">Party</span><span>Vote share</span><span>Seats</span>
        </div>
        <ul>{rows(main)}</ul>
        {others.length > 0 && <details className="mt-3">
          <summary className="cursor-pointer py-2 text-xs font-bold text-[#00776f]">All other parties ({others.length})</summary>
          <ul>{rows(others)}</ul>
        </details>}
        <p className="mt-3 text-[10px] leading-4 text-slate-400">Preliminary Electoral Commission results · Leads and projected seats can change.</p>
      </div>
    </section>
  );
}
