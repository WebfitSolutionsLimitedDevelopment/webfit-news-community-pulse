import { CompletedCounts } from "@/components/completed-counts";
import { ElectionVoice } from "@/components/election-voice";
import { ElectionUpdate } from "@/components/election-update";
import { LiveViewers } from "@/components/live-viewers";
import { Suspense } from "react";
import { NationalResults } from "@/components/national-election-results";
import { CandidateResults } from "@/components/candidate-results";
import { loadCandidateRaces } from "@/lib/candidate-results";
import { ResultsTicker } from "@/components/results-ticker";
import { ADVANCE_SOURCE, POLLS_CLOSE, loadAdvanceVoting } from "@/lib/advance-voting";
import { Clock, ExternalLink } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { BrandHeader } from "@/components/brand-header";
import { SiteFooter } from "@/components/site-footer";
import { RESULTS_SOURCE_URL, loadOfficialResults } from "@/lib/official-results";

export const revalidate = 60;
export const metadata = {
  title: "NZ Election 2026 Live Results | Webfit News",
  description: "Live New Zealand election results, projected seats, party vote shares and every electorate race. Electoral Commission data.",
};
const pct = (value: number) => value.toFixed(1) + "%";
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

async function VoiceCommentary({ results }: { results: Awaited<ReturnType<typeof loadOfficialResults>> }) {
  const races = await loadCandidateRaces();
  return <ElectionVoice results={results} races={races} />;
}

async function CandidateResultsPanel() {
  const races = await loadCandidateRaces();
  return <CandidateResults races={races} />;
}

export default async function ResultsPage() {
  // eslint-disable-next-line react-hooks/purity
  const pollsClosed = Date.now() >= POLLS_CLOSE;
  const [results, advanceVoting] = await Promise.all([loadOfficialResults(), loadAdvanceVoting()]);
  const showResults = pollsClosed && results.hasResults;

  return (
    <div className="election-night min-h-screen bg-[linear-gradient(145deg,#dcefff_0%,#f5faff_45%,#e7f3ff_100%)] text-[#172b40]">
      <BrandHeader resultsPage />
      <AutoRefresh seconds={60} />
      <main className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-10">
        <header className="mb-5 grid items-center gap-5 rounded-2xl border border-[#c5ddf6] border-t-4 border-t-[#0869cd] bg-white p-5 shadow-[0_6px_30px_rgba(15,35,55,0.04)] sm:grid-cols-[minmax(0,1fr)_280px] sm:p-6">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#005bb5]">
              <span className="h-2 w-2 rounded-full bg-[#00a28f]" aria-hidden /> New Zealand · Election night live
              <LiveViewers />
              <Suspense fallback={null}><VoiceCommentary results={results} /></Suspense>
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] text-[#063d7e] sm:text-5xl">Election 2026</h1>
            <p className="mt-2 text-sm text-slate-500">The national picture. The local contests. Every update.</p>
            <nav className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500" aria-label="Election sections">
              <a href="#party-results" className="rounded-lg bg-[#0759b0] px-3 py-2 text-white">National result</a>
              <a href="#candidate-races-title" className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-[#00776f] hover:text-[#00776f]">Electorate races</a>
              <a href="#advance-summary" className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-[#00776f] hover:text-[#00776f]">Advance voting</a>
            </nav>
          </div>
          <div className="rounded-xl border border-blue-200 bg-[#edf6ff] px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">Voting places reporting</p>
              <strong className="text-4xl font-bold tracking-tight tabular-nums text-[#00776f]">{showResults ? pct(results.percentPlacesCounted) : "—"}</strong>
            </div>
            <progress className="mt-2 block h-1.5 w-full" max={100} value={showResults ? results.percentPlacesCounted : 0} aria-label="Voting places reporting" />
            <p className="mt-2 text-[10px] text-slate-400">{results.updated ? "Updated " + results.updated.split("T").pop() + " NZ time" : "Awaiting results"} · Refreshes every 60s</p>
          </div>
        </header>

        {showResults && <ResultsTicker updated={results.updated} items={results.parties.map((party) => party.name + " · " + pct(party.percent) + " · " + party.seats + " projected seats")} />}

        {showResults && <ElectionUpdate results={results} />}

        <div className="min-w-0">
          <div className="min-w-0">{showResults ? <NationalResults results={results} /> : <div className="mb-6"><Holding feedOk={results.ok} pollsClosed={pollsClosed} /></div>}</div>
          <Suspense fallback={<aside className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading electorate status…</aside>}>
            <CompletedCounts />
          </Suspense>
        </div>

        <Suspense fallback={<div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading electorate races…</div>}>
          <CandidateResultsPanel />
        </Suspense>

        <details id="advance-summary" className="my-6 scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm font-bold">
            <span>Advance voting</span>
            <span className="text-xs font-normal text-slate-500">{votes.format(advanceVoting.total)} issued through {advanceVoting.date} · View comparison +</span>
          </summary>
          <div className="px-4 pb-4"><AdvanceVoting data={advanceVoting} /></div>
        </details>

        <section className="mb-6 border-t border-slate-200 pt-5 text-[11px] leading-5 text-slate-500" aria-label="About these results">
          <p><strong className="text-slate-700">Preliminary results.</strong> Ordinary votes are counted on election night. Special votes, including overseas votes, are counted afterwards. Leads and projected seats can change. Official results are expected on Friday 27 November 2026.</p>
          <p className="mt-2">Government grouping · National, ACT and NZ First. Opposition grouping · Labour, Green and Te Pāti Māori. Groupings are comparisons and do not confirm coalition agreements.</p>
          <a href={RESULTS_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-[#00776f] underline">Source Electoral Commission <ExternalLink size={12} aria-hidden /></a>
        </section>
      </main>
      <style>{`
        .election-night progress { appearance: none; border: 0; border-radius: 99px; overflow: hidden; background: #d9e9f8; color: #087ee3; }
        .election-night progress::-webkit-progress-bar { background: #d9e9f8; border-radius: 99px; }
        .election-night progress::-webkit-progress-value { background: #087ee3; border-radius: 99px; }
        .election-night progress::-moz-progress-bar { background: #087ee3; border-radius: 99px; }
      `}</style>
      <SiteFooter />
    </div>
  );
}
