import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { SiteFooter } from "@/components/site-footer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PollOption = {
  party_key: string | null;
  option_label: string;
  short_label: string | null;
  vote_count: number | string;
};
type PollRow = {
  poll_slug: string;
  electorate_name: string | null;
  options: PollOption[] | null;
};

function partyKey(option: PollOption) {
  return option.party_key || option.option_label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
function percentages(row: PollRow | undefined) {
  const counts = new Map<string, { label: string; votes: number }>();
  for (const option of row?.options ?? []) {
    const key = partyKey(option);
    const votes = Number(option.vote_count || 0);
    if (!Number.isFinite(votes) || votes < 0) continue;
    const current = counts.get(key);
    counts.set(key, { label: option.short_label || option.option_label, votes: (current?.votes ?? 0) + votes });
  }
  const total = Array.from(counts.values()).reduce((sum, entry) => sum + entry.votes, 0);
  return {
    total,
    values: new Map(Array.from(counts.entries()).map(([key, value]) => [key, {
      label: value.label,
      share: total > 0 ? (value.votes / total) * 100 : 0,
    }])),
  };
}

export default async function ElectorateComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  // Existing server-only aggregate; no new database objects or voting writes.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_electorate_party_vote_summary");
  const rows = ((Array.isArray(data) ? data : []) as PollRow[])
    .filter((row) => row.poll_slug && row.electorate_name)
    .sort((x, y) => (x.electorate_name || "").localeCompare(y.electorate_name || "", "en-NZ"));
  const first = rows.find((row) => row.poll_slug === a);
  const second = rows.find((row) => row.poll_slug === b);
  const left = percentages(first);
  const right = percentages(second);
  const keys = Array.from(new Set([...left.values.keys(), ...right.values.keys()]))
    .filter((key) => (left.values.get(key)?.share ?? 0) > 0 || (right.values.get(key)?.share ?? 0) > 0)
    .sort((x, y) => Math.max(right.values.get(y)?.share ?? 0, left.values.get(y)?.share ?? 0) -
      Math.max(right.values.get(x)?.share ?? 0, left.values.get(x)?.share ?? 0));
  const comparable = first && second && first.poll_slug !== second.poll_slug;

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-neutral-950">
      <BrandHeader />
      <main className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8">
        <Link href="/electorates-2026" className="inline-flex items-center gap-2 text-sm font-semibold text-[#7b1025]">
          <ArrowLeft size={17} /> All electorates
        </Link>
        <section className="mt-6 overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-[#7b1025] to-[#b88a2a]" />
          <div className="p-6 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">Webfit News Election Pulse 2026</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Compare electorates</h1>
            <p className="mt-4 max-w-3xl leading-7 text-neutral-600">
              How do participating readers in different electorates compare? Choose two electorates to see their party preferences side by side.
            </p>
            {error ? (
              <p className="mt-6 rounded-xl bg-red-50 p-5 text-red-900">Results are temporarily unavailable. Please try again later.</p>
            ) : (
              <>
                <form action="/electorate-compare" method="get" className="mt-7 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  {(["a", "b"] as const).map((field, index) => (
                    <label key={field} className="block text-sm font-semibold">
                      <span>Electorate {index + 1}</span>
                      <select name={field} defaultValue={field === "a" ? first?.poll_slug || "" : second?.poll_slug || ""}
                        className="mt-2 min-h-12 w-full rounded-xl border border-black/15 bg-white px-3 text-base">
                        <option value="">Choose an electorate</option>
                        {rows.map((row) => <option key={row.poll_slug} value={row.poll_slug}>{row.electorate_name}</option>)}
                      </select>
                    </label>
                  ))}
                  <button type="submit" className="min-h-12 rounded-xl bg-[#7b1025] px-6 font-semibold text-white">Compare</button>
                </form>
                {comparable ? (
                  <section className="mt-9">
                    <div className="grid grid-cols-2 gap-4 border-b border-black/10 pb-4">
                      <h2 className="text-lg font-semibold sm:text-2xl">{first.electorate_name}</h2>
                      <h2 className="text-lg font-semibold sm:text-2xl">{second.electorate_name}</h2>
                    </div>
                    {left.total === 0 || right.total === 0 ? (
                      <p className="mt-6 rounded-xl bg-[#f7f4ed] p-5 text-sm">At least one selected electorate has no reader responses yet. Choose another pair to see a comparison.</p>
                    ) : (
                      <div className="mt-6 space-y-6">
                        {keys.map((key) => {
                          const l = left.values.get(key)?.share ?? 0;
                          const r = right.values.get(key)?.share ?? 0;
                          const label = left.values.get(key)?.label || right.values.get(key)?.label || key;
                          return (
                            <div key={key}>
                              <h3 className="mb-2 text-sm font-semibold">{label}</h3>
                              <div className="grid grid-cols-2 gap-4">
                                {[l, r].map((value, index) => (
                                  <div key={index}>
                                    <p className="mb-1 text-sm font-semibold tabular-nums">{value.toFixed(1)}%</p>
                                    <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                                      <div className="h-full rounded-full" style={{ width: `${value}%`, background: index === 0 ? "#7b1025" : "#94701c" }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-[#7b1025]">
                      <Link href={`/polls/${first.poll_slug}`} className="inline-flex items-center gap-1">Vote in {first.electorate_name} <ArrowRight size={15}/></Link>
                      <Link href={`/polls/${second.poll_slug}`} className="inline-flex items-center gap-1">Vote in {second.electorate_name} <ArrowRight size={15}/></Link>
                    </div>
                  </section>
                ) : (
                  <p className="mt-7 rounded-xl bg-[#f7f4ed] p-5 text-sm text-neutral-600">Select two different electorates to compare their results.</p>
                )}
              </>
            )}
          </div>
        </section>
        <p className="mt-6 text-xs leading-6 text-neutral-500">
          Percentages are calculated separately within each electorate from voluntary, self-selected reader responses.
          Small samples can change substantially with additional votes. This is not a scientific poll, a representative comparison or an election forecast.
          Raw participation counts are not displayed publicly.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
