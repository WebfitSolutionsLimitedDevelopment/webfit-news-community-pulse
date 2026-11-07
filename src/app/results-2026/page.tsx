import { PartyLogo } from "@/components/election-party-logo";
import { partyColour } from "@/lib/result-colours";
import { Suspense } from "react";
import { CandidateResults } from "@/components/candidate-results";
import { loadCandidateRaces } from "@/lib/candidate-results";
import { ResultsTicker } from "@/components/results-ticker";
import { ADVANCE_SOURCE, POLLS_CLOSE, loadAdvanceVoting } from "@/lib/advance-voting";
import { Clock, ExternalLink, Landmark } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { BrandHeader } from "@/components/brand-header";
import { SiteFooter } from "@/components/site-footer";
import { BLOC_META } from "@/components/coalition-charts";
import type { BlocKey } from "@/lib/coalition-data";
import { RESULTS_SOURCE_URL, loadOfficialResults, type OfficialResults } from "@/lib/official-results";

// Rebuild at most once a minute; the official feed itself updates as results are entered.
export const revalidate = 60;

export const metadata = {
  title: "2026 Election Results Live | Webfit News",
  description:
    "Live official results of the 2026 New Zealand General Election: party vote, seats and how close each bloc is to a majority.",
};

const RESULT_BLOCS = {
  government: { ...BLOC_META.government, colour: "#2266c7", heroColour: "#164894", soft: "#ffffff" },
  opposition: { ...BLOC_META.opposition, colour: "#c52c43", heroColour: "#a52439", soft: "#ffffff" },
  other: { ...BLOC_META.other, colour: "#64748b", heroColour: "#475569", soft: "#ffffff" },
};

const BLOC_ORDER: BlocKey[] = ["government", "other", "opposition"];
const pct = (v: number) => `${v.toFixed(1)}%`;

const votes = new Intl.NumberFormat("en-NZ");

function AdvanceVoting({ data }: { data: Awaited<ReturnType<typeof loadAdvanceVoting>> }) {
  const baseline = data.equivalent2023;
  const figures = [
    { label: "2023 · Same point", value: baseline, colour: "#94a3b8" },
    { label: "2023 · Full advance voting period", value: data.full2023, colour: "#64748b" },
    { label: "2026 · Through " + data.date, value: data.total, colour: "#2563eb" },
  ];
  const difference = data.total - baseline;
  const fullDifference = data.total - data.full2023;
  const change = (delta: number, reference: number) =>
    reference > 0 ? (delta > 0 ? "+" : "") + pct((delta / reference) * 100) : "—";
  const chartMax = Math.max(...figures.map(({ value }) => value), 1);

  return (
    <section id="advance-voting" className="scroll-mt-6 rounded-xl border border-[#dce4ef] bg-white" aria-labelledby="advance-title">
      <div className="px-5 py-5 sm:px-7">
        <h2 id="advance-title" className="text-lg font-bold">Advance voting</h2>
        <p className="mt-1 text-sm text-neutral-600">Through {data.date} · Excludes overseas votes</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-sm text-neutral-600">Advance votes issued</dt>
            <dd className="mt-1 text-4xl font-bold tracking-tight text-[#1d4ed8] tabular-nums">{votes.format(data.total)}</dd>
          </div>
          {[
            { label: "Same point in 2023", value: change(difference, baseline) },
            { label: "Full 2023 advance count", value: change(fullDifference, data.full2023) },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-sm text-neutral-600">vs {label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="border-t border-[#e2e8f0] px-5 py-4 sm:px-7">
        <h3 className="text-sm font-bold">Advance vote totals compared</h3>
        <ul className="mt-3 space-y-3">
          {figures.map(({ label, value, colour }) => (
            <li key={label}>
              <div className="flex justify-between gap-3 text-sm">
                <span>{label}</span>
                <strong className="shrink-0 tabular-nums">{votes.format(value)}</strong>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#edf2f7]" aria-hidden>
                <div className="h-full rounded-full" style={{ width: pct(value / chartMax * 100), background: colour }} />
              </div>
            </li>
          ))}
        </ul>
        <a href={ADVANCE_SOURCE} className="mt-4 inline-block text-xs font-semibold text-[#1d4ed8] underline">Source: Electoral Commission</a>
      </div>
    </section>
  );
}

function Holding({ feedOk, pollsClosed }: { feedOk: boolean; pollsClosed: boolean }) {
  return (
    <section aria-labelledby="count-status" className="rounded-lg border border-[#dce4ef] border-l-4 border-l-[#2563eb] bg-white px-4 py-3 sm:px-5">
      <h2 id="count-status" className="flex items-center gap-2 font-bold">
        <Clock size={16} className="shrink-0 text-[#2563eb]" aria-hidden />
        {pollsClosed ? "Awaiting the first preliminary results" : "Preliminary results from 7 pm · Saturday 7 November"}
      </h2>
      <p className="mt-1 text-sm leading-6 text-neutral-600">
        {pollsClosed && !feedOk ? (
          <>Feed temporarily unavailable. <a href={RESULTS_SOURCE_URL} className="font-semibold text-[#1d4ed8] underline">Check the Electoral Commission</a>.</>
        ) : (
          "This page refreshes automatically as the Electoral Commission releases results."
        )}
      </p>
    </section>
  );
}

/** Stacked seat bar with the majority line. */
function SeatBar({ results }: { results: OfficialResults }) {
  const total = Math.max(results.totalSeats, 1);
  const majorityAt = (results.majority / total) * 100;
  return (
    <div>
      <div className="relative">
        <div className="flex h-10 overflow-hidden rounded-xl bg-[#e2e8f0]">
          {BLOC_ORDER.map((bloc) => {
            const seats = results.blocs[bloc].seats;
            if (seats <= 0) return null;
            return (
              <div
                key={bloc}
                className="flex items-center justify-center text-sm font-bold text-white"
                style={{ width: `${(seats / total) * 100}%`, background: RESULT_BLOCS[bloc].colour }}
                title={`${RESULT_BLOCS[bloc].short}: ${seats} seats`}
              >
                {seats >= 6 ? seats : ""}
              </div>
            );
          })}
        </div>
        <div className="absolute -top-2 -bottom-2 w-0.5 bg-neutral-900" style={{ left: `${majorityAt}%` }} aria-hidden />
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-neutral-600">
        Line = {results.majority} seats needed to govern ({results.totalSeats} seats in total)
      </p>
    </div>
  );
}

function PartyTable({ parties }: { parties: OfficialResults["parties"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <th className="pb-3 pr-3">Party</th>
            <th className="pb-3 pr-3 text-right">Vote share</th>
            <th className="pb-3 text-right">Seats</th>
          </tr>
        </thead>
        <tbody>
          {parties.map((party) => (
            <tr key={party.abbrev} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
              <td className="py-4 pr-3">
                <div className="flex items-center gap-3">
                  <PartyLogo name={party.name} />
                  <div className="min-w-[100px] flex-1">
                    <p className="text-sm font-bold text-[#10213b] sm:text-base">{party.name}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                      <div className="h-full rounded-full" style={{ width: pct(party.percent), background: partyColour(party.abbrev) }} />
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-4 pr-3 text-right align-middle">
                <span className="text-lg font-bold tabular-nums text-[#10213b] sm:text-2xl">{pct(party.percent)}</span>
              </td>
              <td className="py-4 text-right align-middle">
                <span className="inline-flex min-w-10 justify-center rounded-lg bg-slate-100 px-2 py-1 text-xl font-bold tabular-nums text-[#10213b]">{party.seats}</span>
                <p className="mt-1 whitespace-nowrap text-[10px] text-slate-500">{party.electorateSeats} electorate · {party.listSeats} list</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Results({ results }: { results: OfficialResults }) {
  const gov = results.blocs.government.seats;
  const opp = results.blocs.opposition.seats;
  const headline =
    gov >= results.majority
      ? "Current government parties are projected to have a majority"
      : opp >= results.majority
        ? "Opposition parties are projected to have a majority"
        : "No bloc is projected to have a majority";
  const counting = results.percentPlacesCounted < 100;

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[#dce4ef] bg-white">
        <div className="p-5 sm:p-7">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#2563eb]">
            <Landmark size={15} /> {counting ? "Counting under way" : "Election-night count complete"} ·{" "}
            {pct(results.percentPlacesCounted)} of voting places counted
          </p>
          <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{headline}</h2>
          <progress className="mt-4 block h-2 w-full accent-[#2563eb]" max={100} value={results.percentPlacesCounted} aria-label="Voting places counted" />

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {BLOC_ORDER.map((bloc) => (
              <div key={bloc} className="rounded-xl border border-slate-200 border-t-4 p-2.5 shadow-sm sm:p-4" style={{ background: RESULT_BLOCS[bloc].soft, borderTopColor: RESULT_BLOCS[bloc].colour }}>
                <p className="text-xs font-bold text-neutral-700">{RESULT_BLOCS[bloc].short}</p>
                <p className="mt-2 text-4xl font-bold tracking-[-0.03em] sm:text-5xl" style={{ color: RESULT_BLOCS[bloc].heroColour }}>
                  {results.blocs[bloc].seats}
                  <span className="ml-1 text-base font-semibold text-neutral-600">seats</span>
                </p>
                <p className="text-sm text-neutral-600">{pct(results.blocs[bloc].percent)} of party vote</p>
                <p className="mt-1 hidden text-xs text-neutral-500 sm:block">{RESULT_BLOCS[bloc].parties}</p>
              </div>
            ))}
          </div>

          {results.totalSeats > 0 && <div className="mt-6">
            <SeatBar results={results} />
          </div>}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#dce4ef] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-700">National picture</p>
            <h2 className="mt-1 text-xl font-bold">Party vote and projected seats</h2>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">Preliminary</span>
        </div>
        <div className="p-5 sm:p-7">
          <PartyTable parties={results.parties.filter((party) => party.seats > 0 || party.percent >= 1)} />
          {results.parties.some((party) => party.seats === 0 && party.percent < 1) && (
            <details className="mt-4 rounded-xl border border-slate-200 px-4 py-3">
              <summary className="cursor-pointer text-sm font-bold text-blue-700">View all other parties ({results.parties.filter((party) => party.seats === 0 && party.percent < 1).length})</summary>
              <div className="mt-4"><PartyTable parties={results.parties.filter((party) => party.seats === 0 && party.percent < 1)} /></div>
            </details>
          )}
          <p className="mt-4 text-[11px] leading-5 text-slate-500">Logos from the Electoral Commission’s party register and the NZ Loyal website. Free Palestine has a text label because its register entry has no logo.</p>
        </div>
      </section>
    </>
  );
}

async function CandidateResultsPanel() {
  const races = await loadCandidateRaces();
  return <CandidateResults races={races} />;
}

export default async function ResultsPage() {
  // Server render: reevaluate the election-night cutoff whenever the page is regenerated.
  // eslint-disable-next-line react-hooks/purity
  const pollsClosed = Date.now() >= POLLS_CLOSE;
  const [results, advanceVoting] = await Promise.all([loadOfficialResults(), loadAdvanceVoting()]);
  const showResults = pollsClosed && results.hasResults;

  return (
    <div className="election-night min-h-screen bg-[#eef3f9] text-[#10213b]">
      <BrandHeader resultsPage />
      <AutoRefresh seconds={60} />

      <main className="w-full px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 rounded-2xl border-l-4 border-cyan-300 bg-[#101e36] px-5 py-4 text-white shadow-sm sm:px-7 sm:py-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8edce4]">New Zealand General Election 2026</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Live election results</h1>
          <p className="mt-2 text-sm text-slate-300">Advance voting and preliminary results from the Electoral Commission.</p>
        </header>

        {showResults && <ResultsTicker
          updated={results.updated}
          items={results.parties.map((party) => party.name + " · " + pct(party.percent) + " party vote · " + party.seats + " projected seats")}
        />}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="min-w-0">
        <div className="space-y-4">
          {showResults ? <Results results={results} /> : <Holding feedOk={results.ok} pollsClosed={pollsClosed} />}

          <AdvanceVoting data={advanceVoting} />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#dce4ef] pb-4 text-sm">
            <a href={RESULTS_SOURCE_URL} className="inline-flex items-center gap-1 font-semibold text-[#1d4ed8] underline">
              Electorate results <ExternalLink size={14} aria-hidden />
            </a>
            {!pollsClosed && <span className="text-neutral-600">
              Saturday voting hours: 9 am to 7 pm.{" "}
              <a href="https://vote.nz" className="font-semibold text-[#1d4ed8] underline">Find a voting place</a>
            </span>}
          </div>
        </div>

        <section className="mt-4 text-sm leading-6 text-neutral-600" aria-label="About the preliminary count">
          <p>
            <strong className="text-neutral-800">About election-night results.</strong> The election-night count covers
            ordinary votes only. Special votes, including overseas votes, are counted afterwards, and seats can change.
            The Electoral Commission expects to declare the official result on Friday 27 November 2026.
          </p>
          <p className="mt-3">
            Government bloc: National, ACT and NZ First. Opposition bloc: Labour, Green and Te Pāti Māori. Groupings
            are for comparison only and are not a statement about any coalition talks.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Source: Electoral Commission
              {showResults && results.updated ? ` · feed updated ${results.updated.replace("T", " ")} NZ time` : ""}
            </span>
            <a href={RESULTS_SOURCE_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-[#1d4ed8]">
              electionresults.govt.nz <ExternalLink size={13} />
            </a>
          </p>
        </section>
          </div>
          <aside className="min-w-0" aria-label="Candidate and electorate results">
            <Suspense fallback={<div className="rounded-xl border border-[#dce4ef] bg-white p-5 text-sm text-neutral-600">Loading candidate and electorate results…</div>}>
              <CandidateResultsPanel />
            </Suspense>
          </aside>
        </div>
      </main>

      <style>{`
        .election-night progress { appearance: none; border: 0; border-radius: 99px; overflow: hidden; background: #e2e8f0; color: #2563eb; }
        .election-night progress::-webkit-progress-bar { background: #e2e8f0; border-radius: 99px; }
        .election-night progress::-webkit-progress-value { background: #2563eb; border-radius: 99px; }
        .election-night progress::-moz-progress-bar { background: #2563eb; border-radius: 99px; }
      `}</style>
      <SiteFooter />
    </div>
  );
}
