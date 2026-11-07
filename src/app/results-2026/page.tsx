import { ElectionVoice } from "@/components/election-voice";
import { LiveViewers } from "@/components/live-viewers";
import { Suspense } from "react";
import { NationalResults } from "@/components/national-election-results";
import { CandidateResults } from "@/components/candidate-results";
import { loadCandidateRaces } from "@/lib/candidate-results";
import { POLLS_CLOSE } from "@/lib/advance-voting";
import { Clock, ExternalLink } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { BrandHeader } from "@/components/brand-header";
import { SiteFooter } from "@/components/site-footer";
import { RESULTS_SOURCE_URL, loadOfficialResults } from "@/lib/official-results";

export const revalidate = 60;
export const metadata = {
  title: "NZ Election 2026 Preliminary Results & Updates | Webfit News",
  description: "Latest preliminary New Zealand election results, projected seats, party vote shares and electorate results. Updates from Electoral Commission data.",
};
const pct = (value: number) => value.toFixed(1) + "%";
function formatResultsUpdated(value: string | null) {
  const match=value?.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if(!match) return "Update time unavailable";
  const [,year,month,day,hour,minute]=match;
  const date=new Intl.DateTimeFormat("en-NZ",{day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(Date.UTC(Number(year),Number(month)-1,Number(day))));
  return date+", "+(Number(hour)%12 || 12)+":"+minute+" "+(Number(hour)>=12 ? "pm" : "am")+" NZ time";
}

function Holding({ feedOk, pollsClosed }: { feedOk: boolean; pollsClosed: boolean }) {
  return (
    <section aria-labelledby="count-status" className="rounded-lg border border-[#dce4ef] border-l-4 border-l-[#2563eb] bg-white px-4 py-3 sm:px-5">
      <h2 id="count-status" className="flex items-center gap-2 font-bold">
        <Clock size={16} className="shrink-0 text-[#2563eb]" aria-hidden />
        {pollsClosed ? (feedOk ? "Awaiting preliminary results" : "Preliminary results temporarily unavailable") : "Preliminary results from 7 pm · Saturday 7 November"}
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
  return <CandidateResults races={races} showParade={false} />;
}


function ResultsExplained({ results }: { results: Awaited<ReturnType<typeof loadOfficialResults>> }) {
  const sorted=[...results.parties].sort((a,b)=>b.seats-a.seats);
  const largest=sorted.filter(p=>p.seats===sorted[0]?.seats);
  const government=results.blocs.government.seats;
  const gap=government-results.majority;
  return <section id="results-explained" aria-labelledby="results-explained-title" className="mb-6 scroll-mt-5 rounded-2xl border border-blue-200 bg-white p-5 sm:p-7">
    <p className="text-[10px] font-bold uppercase tracking-widest text-[#005bb5]">The result, explained</p>
    <h2 id="results-explained-title" className="mt-1 text-2xl font-bold text-[#063d7e]">Where things stand</h2>
    <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">These are preliminary results, not the final outcome. The reporting percentage counts voting places, not every vote. Special votes and official checks can change both electorate leads and projected seats.</p>
    <div className="mt-5 grid gap-3 md:grid-cols-3">
      <article className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <h3 className="text-xs font-semibold text-slate-600">Most projected seats</h3>
        <p className="mt-2 text-2xl font-bold text-[#063d7e]">{largest.map(p=>p.name).join(" / ")} · {largest[0]?.seats ?? "—"}</p>
        <p className="mt-2 text-xs leading-5 text-slate-600">{largest[0]?.seats >= results.majority ? "At or above the majority line in the current projection." : "Below the "+results.majority+" seats needed for a majority alone."} This does not declare a government.</p>
      </article>
      <article className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <h3 className="text-xs font-semibold text-slate-600">National + ACT + NZ First</h3>
        <p className="mt-2 text-2xl font-bold text-[#063d7e]">{government} projected seats</p>
        <p className="mt-2 text-xs leading-5 text-slate-600">{gap>=0 ? gap+" above the "+results.majority+"-seat majority line." : Math.abs(gap)+" short of the "+results.majority+"-seat majority line."} A grouping for comparison, not confirmation of a coalition agreement.</p>
      </article>
      <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-xs font-semibold text-slate-600">Next official milestone</h3>
        <p className="mt-2 text-2xl font-bold text-[#063d7e]">27 November</p>
        <p className="mt-2 text-xs leading-5 text-slate-600">Scheduled declaration of official results. Special votes, including overseas votes, are checked and counted before the official result.</p>
      </article>
    </div>
    <p className="mt-4 text-xs leading-5 text-slate-500">Results last updated: <strong className="font-semibold text-slate-700">{formatResultsUpdated(results.updated)}</strong>. Results remain preliminary.</p>
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#005bb5]">
      <a className="underline" href={RESULTS_SOURCE_URL} target="_blank" rel="noopener noreferrer">Verify the results · Electoral Commission</a>
      <a className="underline" href="https://vote.nz/2026-general-election/about/overview/what-happens-after-the-election" target="_blank" rel="noopener noreferrer">How preliminary results become official</a>
      <a className="underline" href="https://vote.nz/2026-general-election/about/overview/key-dates" target="_blank" rel="noopener noreferrer">Official timetable</a>
    </div>
  </section>;
}

export default async function ResultsPage() {
  // eslint-disable-next-line react-hooks/purity
  const pollsClosed = Date.now() >= POLLS_CLOSE;
  const results = await loadOfficialResults();
  const showResults = pollsClosed && results.hasResults;

  return (
    <div className="election-night min-h-screen bg-[linear-gradient(145deg,#dcefff_0%,#f5faff_45%,#e7f3ff_100%)] text-[#172b40]">
      <BrandHeader resultsPage />
      <AutoRefresh seconds={60} />
      <main className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-10">
        <header className="mb-5 grid items-center gap-5 rounded-2xl border border-[#c5ddf6] border-t-4 border-t-[#0869cd] bg-white p-5 shadow-[0_6px_30px_rgba(15,35,55,0.04)] sm:grid-cols-[minmax(0,1fr)_280px] sm:p-6">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#005bb5]">
              <span className="h-2 w-2 rounded-full bg-[#00a28f]" aria-hidden /> New Zealand · Preliminary results
              <LiveViewers />
              <Suspense fallback={null}><VoiceCommentary results={results} /></Suspense>
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] text-[#063d7e] sm:text-5xl">Election 2026 results</h1>
            <p className="mt-2 text-sm text-slate-500">Latest party votes, projected seats and electorate results.</p>
            <nav className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500" aria-label="Election sections">
              <a href="#party-results" className="rounded-lg bg-[#0759b0] px-3 py-2 text-white">National result</a>
              <a href="#candidate-races-title" className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-[#00776f] hover:text-[#00776f]">Electorate races</a>
              <a href="#results-explained" className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-[#00776f] hover:text-[#00776f]">What happens next</a>
            </nav>
          </div>
          <div className="rounded-xl border border-blue-200 bg-[#edf6ff] px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">Voting places reporting</p>
              <strong className="text-4xl font-bold tracking-tight tabular-nums text-[#00776f]">{showResults ? pct(results.percentPlacesCounted) : "—"}</strong>
            </div>
            <progress className="mt-2 block h-1.5 w-full" max={100} value={showResults ? results.percentPlacesCounted : 0} aria-label="Voting places reporting" />
            <p className="mt-2 text-[10px] text-slate-400">{results.updated ? "Updated " + results.updated.replace("T", " ") + " NZ time" : "Awaiting results"} · Checks for updates every 60s</p>
          </div>
        </header>

        {showResults && <ResultsExplained results={results} />}

        <div className="min-w-0">{showResults ? <NationalResults results={results} /> : <div className="mb-6"><Holding feedOk={results.ok} pollsClosed={pollsClosed} /></div>}</div>

        <Suspense fallback={<div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading electorate races…</div>}>
          <CandidateResultsPanel />
        </Suspense>

        <section className="mb-6 border-t border-slate-200 pt-5 text-[11px] leading-5 text-slate-500" aria-label="About these results">
          <p><strong className="text-slate-700">Preliminary results.</strong> The election-night count covers ordinary votes. Special votes, including overseas votes, and official checks follow. Leads and projected seats can change. Official results are expected on Friday 27 November 2026.</p>
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
