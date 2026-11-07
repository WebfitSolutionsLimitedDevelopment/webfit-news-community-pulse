import { Suspense } from "react";
import { CandidateResults } from "@/components/candidate-results";
import { loadCandidateRaces } from "@/lib/candidate-results";
import { ResizableResults } from "@/components/resizable-results";
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

const BLOC_ORDER: BlocKey[] = ["government", "other", "opposition"];
const pct = (v: number) => `${v.toFixed(1)}%`;

const votes = new Intl.NumberFormat("en-NZ");

function AdvanceVoting({ data }: { data: Awaited<ReturnType<typeof loadAdvanceVoting>> }) {
  const baseline = data.equivalent2023;
  const figures = [
    { label: "2023 · Same point", value: baseline, colour: "#81766a" },
    { label: "2023 · Full advance voting period", value: data.full2023, colour: "#9d741f" },
    { label: "2026 · Through " + data.date, value: data.total, colour: "#9e2142" },
  ];
  const difference = data.total - baseline;
  const fullDifference = data.total - data.full2023;
  const change = (delta: number, reference: number) =>
    reference > 0 ? (delta > 0 ? "+" : "") + pct((delta / reference) * 100) : "—";
  const chartMax = Math.max(...figures.map(({ value }) => value), 1);

  return (
    <section id="advance-voting" className="scroll-mt-6 rounded-xl border border-[#e3ded5] bg-white" aria-labelledby="advance-title">
      <div className="px-5 py-5 sm:px-7">
        <h2 id="advance-title" className="text-lg font-bold">Advance voting</h2>
        <p className="mt-1 text-sm text-neutral-600">Through {data.date} · Excludes overseas votes</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-sm text-neutral-600">Advance votes issued</dt>
            <dd className="mt-1 text-4xl font-bold tracking-tight text-[#7b1025] tabular-nums">{votes.format(data.total)}</dd>
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
      <div className="border-t border-[#eeeae2] px-5 py-4 sm:px-7">
        <h3 className="text-sm font-bold">Advance vote totals compared</h3>
        <ul className="mt-3 space-y-3">
          {figures.map(({ label, value, colour }) => (
            <li key={label}>
              <div className="flex justify-between gap-3 text-sm">
                <span>{label}</span>
                <strong className="shrink-0 tabular-nums">{votes.format(value)}</strong>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#f0ece3]" aria-hidden>
                <div className="h-full rounded-full" style={{ width: pct(value / chartMax * 100), background: colour }} />
              </div>
            </li>
          ))}
        </ul>
        <a href={ADVANCE_SOURCE} className="mt-4 inline-block text-xs font-semibold text-[#7b1025] underline">Source: Electoral Commission</a>
      </div>
    </section>
  );
}

function Holding({ feedOk, pollsClosed }: { feedOk: boolean; pollsClosed: boolean }) {
  return (
    <section aria-labelledby="count-status" className="rounded-lg border border-[#e3ded5] border-l-4 border-l-[#96701f] bg-white px-4 py-3 sm:px-5">
      <h2 id="count-status" className="flex items-center gap-2 font-bold">
        <Clock size={16} className="shrink-0 text-[#866019]" aria-hidden />
        {pollsClosed ? "Awaiting the first preliminary results" : "Preliminary results from 7 pm · Saturday 7 November"}
      </h2>
      <p className="mt-1 text-sm leading-6 text-neutral-600">
        {pollsClosed && !feedOk ? (
          <>Feed temporarily unavailable. <a href={RESULTS_SOURCE_URL} className="font-semibold text-[#7b1025] underline">Check the Electoral Commission</a>.</>
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
        <div className="flex h-10 overflow-hidden rounded-xl bg-[#ece7dc]">
          {BLOC_ORDER.map((bloc) => {
            const seats = results.blocs[bloc].seats;
            if (seats <= 0) return null;
            return (
              <div
                key={bloc}
                className="flex items-center justify-center text-sm font-bold text-white"
                style={{ width: `${(seats / total) * 100}%`, background: BLOC_META[bloc].colour }}
                title={`${BLOC_META[bloc].short}: ${seats} seats`}
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
      <section className="overflow-hidden rounded-xl border border-[#e3ded5] bg-white">
        <div className="p-5 sm:p-7">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#9d741f]">
            <Landmark size={15} /> {counting ? "Counting under way" : "Election-night count complete"} ·{" "}
            {pct(results.percentPlacesCounted)} of voting places counted
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{headline}</h2>
          <progress className="mt-3 block h-2 w-full accent-[#7b1025]" max={100} value={results.percentPlacesCounted} aria-label="Voting places counted" />

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {BLOC_ORDER.map((bloc) => (
              <div key={bloc} className="rounded-lg p-2.5 sm:p-4" style={{ background: BLOC_META[bloc].soft }}>
                <p className="text-xs font-bold text-neutral-700">{BLOC_META[bloc].short}</p>
                <p className="mt-1 text-3xl font-bold tracking-[-0.03em] sm:text-4xl" style={{ color: BLOC_META[bloc].heroColour }}>
                  {results.blocs[bloc].seats}
                  <span className="ml-1 text-base font-semibold text-neutral-600">seats</span>
                </p>
                <p className="text-sm text-neutral-600">{pct(results.blocs[bloc].percent)} of party vote</p>
                <p className="mt-1 hidden text-xs text-neutral-500 sm:block">{BLOC_META[bloc].parties}</p>
              </div>
            ))}
          </div>

          {results.totalSeats > 0 && <div className="mt-6">
            <SeatBar results={results} />
          </div>}
        </div>
      </section>

      <section className="rounded-xl border border-[#e3ded5] bg-white p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Party vote and seats</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-[0.08em] text-neutral-500">
                <th className="py-2 pr-3 font-semibold">Party</th>
                <th className="py-2 pr-3 text-right font-semibold">Party vote</th>
                <th className="hidden py-2 pr-3 text-right font-semibold sm:table-cell">Electorate seats</th>
                <th className="hidden py-2 pr-3 text-right font-semibold sm:table-cell">List seats</th>
                <th className="py-2 text-right font-semibold"><span className="sm:hidden">Seats</span><span className="hidden sm:inline">Total seats</span></th>
              </tr>
            </thead>
            <tbody>
              {results.parties.map((p) => (
                <tr key={p.abbrev} className="border-b border-black/5">
                  <td className="py-2.5 pr-3 font-semibold">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: BLOC_META[p.bloc].colour }} />
                    {p.name}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {pct(p.percent)}
                    <div className="ml-auto mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-[#ece7dc] sm:w-24" aria-hidden>
                      <div className="h-full rounded-full" style={{ width: pct(p.percent), background: BLOC_META[p.bloc].colour }} />
                    </div>
                  </td>
                  <td className="hidden py-2.5 pr-3 text-right tabular-nums sm:table-cell">{p.electorateSeats}</td>
                  <td className="hidden py-2.5 pr-3 text-right tabular-nums sm:table-cell">{p.listSeats}</td>
                  <td className="py-2.5 text-right text-base font-bold tabular-nums">{p.seats}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="min-h-screen bg-[#f7f4ed] text-neutral-950">
      <BrandHeader resultsPage />
      <AutoRefresh seconds={60} />

      <main className="w-full px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#866019]">New Zealand General Election 2026</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-5xl">Live election results</h1>
          <p className="mt-2 text-sm text-neutral-600">Advance voting and preliminary results from the Electoral Commission.</p>
        </header>

        <ResizableResults video={(
          <>
          <aside className="min-w-0" aria-label="RNZ election coverage">
            <section className="overflow-hidden rounded-xl border border-[#e3ded5] bg-white shadow-sm">
              <div className="border-b border-[#e3ded5] px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[#7b1025]">Watch RNZ</p>
                <h2 className="mt-1 text-lg font-semibold">Election night coverage</h2>
              </div>
              <div className="aspect-video bg-black">
                <iframe
                  src="https://www.youtube.com/embed/irMgYQ_a-eY"
                  title="RNZ election night coverage on YouTube"
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm">
                <p className="font-semibold text-neutral-700">Source RNZ</p>
                <a href="https://www.youtube.com/live/irMgYQ_a-eY" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#7b1025] underline">
                  Watch on YouTube <ExternalLink size={14} aria-hidden />
                </a>
              </div>
            </section>
          </aside>
          <Suspense fallback={<div className="mt-5 rounded-xl border border-[#e3ded5] bg-white p-5 text-sm text-neutral-600">Loading candidate and electorate results…</div>}>
            <CandidateResultsPanel />
          </Suspense>
          </>
        )}>
          <div className="min-w-0">
        <div className="space-y-4">
          {showResults ? <Results results={results} /> : <Holding feedOk={results.ok} pollsClosed={pollsClosed} />}

          <AdvanceVoting data={advanceVoting} />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#e3ded5] pb-4 text-sm">
            <a href={RESULTS_SOURCE_URL} className="inline-flex items-center gap-1 font-semibold text-[#7b1025] underline">
              Electorate results <ExternalLink size={14} aria-hidden />
            </a>
            {!pollsClosed && <span className="text-neutral-600">
              Saturday voting hours: 9 am to 7 pm.{" "}
              <a href="https://vote.nz" className="font-semibold text-[#7b1025] underline">Find a voting place</a>
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
            <a href={RESULTS_SOURCE_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-[#7b1025]">
              electionresults.govt.nz <ExternalLink size={13} />
            </a>
          </p>
        </section>
          </div>
        </ResizableResults>
      </main>

      <SiteFooter />
    </div>
  );
}
