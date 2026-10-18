import Link from "next/link";
import { BrandHeader } from "@/components/brand-header";
import { SiteFooter } from "@/components/site-footer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Electorate Spotlight 2026 | Webfit News",
  description: "Explore participation and party preferences in Webfit News' voluntary electorate reader polls.",
};

type Option = { party_key: string | null; option_label: string; vote_count: number | string };
type PollRow = {
  poll_id: string; poll_slug: string; electorate_name: string | null;
  poll_status: string; options: Option[] | null;
};
const number = (n: number) => new Intl.NumberFormat("en-NZ").format(n);
const excluded = new Set(["undecided", "prefer_not_to_say"]);

export default async function ElectorateSpotlightPage() {
  // Reuse the same server-only, read-only RPC as the existing election dashboard.
  // No schema changes, vote writes, or new credentials are required.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_electorate_party_vote_summary");
  const rows = (Array.isArray(data) ? data : []) as PollRow[];
  const electorates = rows.map((row) => {
    const options = (row.options ?? []).map((o) => ({
      key: o.party_key ?? o.option_label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      label: o.option_label,
      votes: Number(o.vote_count || 0),
    }));
    const responses = options.reduce((sum, o) => sum + o.votes, 0);
    const ranked = options.filter((o) => !excluded.has(o.key)).sort((a, b) => b.votes - a.votes);
    const first = ranked[0];
    const tied = first && ranked.filter((o) => o.votes === first.votes).length > 1;
    return {
      id: row.poll_id, slug: row.poll_slug, name: row.electorate_name || "Electorate",
      status: row.poll_status, responses, options: ranked,
      leader: responses >= 10 && first && !tied ? first : null,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const totalResponses = electorates.reduce((sum, e) => sum + e.responses, 0);
  const withResponses = electorates.filter((e) => e.responses > 0).length;

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-neutral-950">
      <BrandHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/electorates-2026" className="text-sm font-semibold text-[#7b1025]">← Choose an electorate to vote</Link>
        <p className="mt-9 text-xs font-bold uppercase tracking-[0.25em] text-[#9d741f]">Webfit News Election Pulse 2026</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Electorate Spotlight</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
          Explore what participating readers are saying in each electorate. These are voluntary responses,
          not representative electorate polling or predictions of election results.
        </p>
        {error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-white p-6">
            Results are temporarily unavailable. Existing voting remains accessible.
          </div>
        ) : (
          <>
            <div className="mt-9 grid gap-4 sm:grid-cols-3">
              {[
                ["Electorate polls", electorates.length],
                ["With responses", withResponses],
                ["Reader responses", totalResponses],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-black/10 bg-white p-6">
                  <p className="text-sm text-neutral-600">{label}</p>
                  <p className="mt-2 text-4xl font-semibold">{number(Number(value))}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-[#b88a2a]/30 bg-[#fbf8f1] p-5 text-sm leading-6 text-neutral-700">
              Small samples can be misleading. Party percentages are shown only for electorates with at least
              10 responses. A leading party here means only the most selected option among participating readers,
              not a projected electorate winner. Response counts are not official voter turnout.
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {electorates.map((e) => (
                <article key={e.id} className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">{e.name}</h2>
                  <p className="mt-2 text-sm text-neutral-600">{number(e.responses)} reader responses</p>
                  {e.responses >= 10 ? (
                    <div className="mt-5 space-y-3">
                      {e.options.slice(0, 3).map((o) => (
                        <div key={o.key}>
                          <div className="flex justify-between gap-3 text-sm">
                            <span className="truncate">{o.label}</span>
                            <span className="font-semibold tabular-nums">{(o.votes / e.responses * 100).toFixed(1)}%</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100">
                            <div className="h-full rounded-full bg-[#7b1025]" style={{ width: `${o.votes / e.responses * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-neutral-500">
                      {e.responses === 0 ? "No responses yet." : "Not enough responses to display party shares."}
                    </p>
                  )}
                  <Link href={`/polls/${encodeURIComponent(e.slug)}`}
                    className="mt-6 inline-block font-semibold text-[#7b1025]">
                    {e.status === "open" ? "View poll and vote →" : "View electorate poll →"}
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
        <p className="mt-10 text-sm text-neutral-600">
          Source: Webfit News Election Pulse voluntary reader responses. Results are updated on each page load.
          A browser-based voting limit does not guarantee a representative or unique-person sample.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
