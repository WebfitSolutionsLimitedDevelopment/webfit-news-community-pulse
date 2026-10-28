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

function Holding({ feedOk }: { feedOk: boolean }) {
  return (
    <section className="mt-8 rounded-[2rem] bg-white p-7 shadow-[0_30px_90px_rgba(38,31,20,0.10)] sm:p-10">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#9d741f]">
        <Clock size={15} /> Results from 7pm Saturday
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
        Official results will appear here from 7pm on Saturday 7 November
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
        Voting places close at 7pm on election day. The Electoral Commission then releases the preliminary count
        progressively through the evening, and this page updates on its own as the numbers come in.
      </p>
      {!feedOk && (
        <p className="mt-4 text-sm text-neutral-500">
          The official results feed can&apos;t be reached right now. You can follow the count at{" "}
          <a href={RESULTS_SOURCE_URL} className="font-semibold text-[#7b1025] underline" target="_blank" rel="noopener">
            electionresults.govt.nz
          </a>
          .
        </p>
      )}
      <p className="mt-6 rounded-2xl bg-[#f7f4ed] p-4 text-sm leading-6 text-neutral-700">
        Still to vote? Advance voting is open until Friday 6 November, and voting places are open 9am to 7pm on
        election day. Find yours at{" "}
        <a href="https://vote.nz" className="font-semibold text-[#7b1025] underline" target="_blank" rel="noopener">
          vote.nz
        </a>
        .
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
      ? "Current government parties have a majority"
      : opp >= results.majority
        ? "Opposition parties have a majority"
        : "No bloc has a majority yet";
  const shown = results.parties.filter((p) => p.seats > 0 || p.percent >= 1);
  const rest = results.parties.filter((p) => !(p.seats > 0 || p.percent >= 1));
  const restPercent = rest.reduce((sum, p) => sum + p.percent, 0);
  const counting = results.percentPlacesCounted < 100;

  return (
    <>
      <section className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_90px_rgba(38,31,20,0.10)]">
        <div className="p-7 sm:p-10">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#9d741f]">
            <Landmark size={15} /> {counting ? "Counting under way" : "Election-night count complete"} ·{" "}
            {pct(results.percentPlacesCounted)} of voting places counted
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">{headline}</h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {BLOC_ORDER.map((bloc) => (
              <div key={bloc} className="rounded-2xl p-4" style={{ background: BLOC_META[bloc].soft }}>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-600">{BLOC_META[bloc].short}</p>
                <p className="mt-1 text-3xl font-bold tracking-[-0.03em] sm:text-4xl" style={{ color: BLOC_META[bloc].heroColour }}>
                  {results.blocs[bloc].seats}
                  <span className="ml-1 text-base font-semibold text-neutral-600">seats</span>
                </p>
                <p className="text-sm text-neutral-600">{pct(results.blocs[bloc].percent)} of party vote</p>
                <p className="mt-1 hidden text-xs text-neutral-500 sm:block">{BLOC_META[bloc].parties}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <SeatBar results={results} />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
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
              {shown.map((p) => (
                <tr key={p.abbrev} className="border-b border-black/5">
                  <td className="py-2.5 pr-3 font-semibold">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: BLOC_META[p.bloc].colour }} />
                    {p.name}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{pct(p.percent)}</td>
                  <td className="hidden py-2.5 pr-3 text-right tabular-nums sm:table-cell">{p.electorateSeats}</td>
                  <td className="hidden py-2.5 pr-3 text-right tabular-nums sm:table-cell">{p.listSeats}</td>
                  <td className="py-2.5 text-right text-base font-bold tabular-nums">{p.seats}</td>
                </tr>
              ))}
              {rest.length > 0 && (
                <tr className="text-neutral-500">
                  <td className="py-2.5 pr-3">{rest.length} other {rest.length === 1 ? "party" : "parties"}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{pct(restPercent)}</td>
                  <td className="hidden py-2.5 pr-3 text-right sm:table-cell">0</td>
                  <td className="hidden py-2.5 pr-3 text-right sm:table-cell">0</td>
                  <td className="py-2.5 text-right font-bold">0</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default async function ResultsPage() {
  const results = await loadOfficialResults();

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-neutral-950">
      <BrandHeader />
      <AutoRefresh seconds={60} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9d741f]">New Zealand General Election 2026</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Live election results</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
          Official results from the Electoral Commission, updated through election night.
        </p>

        {results.hasResults ? <Results results={results} /> : <Holding feedOk={results.ok} />}

        <section className="mt-6 rounded-[2rem] border border-black/5 bg-white/60 p-6 text-sm leading-6 text-neutral-600">
          <p>
            <strong className="text-neutral-800">These are preliminary results.</strong> The election-night count covers
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
              {results.updated ? ` · feed updated ${results.updated.replace("T", " ")} NZ time` : ""}
            </span>
            <a href={RESULTS_SOURCE_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-[#7b1025]">
              electionresults.govt.nz <ExternalLink size={13} />
            </a>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
