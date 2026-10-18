import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { SiteFooter } from "@/components/site-footer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Option = {
  party_key: string | null;
  option_label: string;
  short_label: string | null;
  vote_count: number | string;
};
type Summary = {
  poll_slug: string;
  electorate_name: string | null;
  poll_status: string;
  options: Option[] | null;
};

export default async function ElectorateSpotlight({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();
  // Reuse the existing server-only aggregate. No vote tables or write APIs touched.
  const { data, error } = await admin.rpc("get_electorate_party_vote_summary");
  const rows = (Array.isArray(data) ? data : []) as Summary[];
  const row = rows.find((item) => item.poll_slug === slug);
  if (!error && !row) notFound();

  const options = (row?.options ?? [])
    .map((option) => ({
      label: option.short_label || option.option_label,
      count: Number(option.vote_count || 0),
    }))
    .filter((option) => Number.isFinite(option.count) && option.count >= 0)
    .sort((a, b) => b.count - a.count);
  const total = options.reduce((sum, option) => sum + option.count, 0);

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-neutral-950">
      <BrandHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/electorates-2026" className="inline-flex items-center gap-2 text-sm font-semibold text-[#7b1025]">
          <ArrowLeft size={17} /> All electorates
        </Link>
        <section className="mt-7 overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-[#7b1025] to-[#b88a2a]" />
          <div className="p-7 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">Webfit News Election Pulse 2026</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{row?.electorate_name || "Electorate"} spotlight</h1>
            <p className="mt-4 max-w-2xl leading-7 text-neutral-600">
              Explore the party preferences of participating Webfit News readers in this electorate.
              This is a voluntary reader poll, not a representative survey or election forecast.
            </p>
            {error ? (
              <p className="mt-8 rounded-xl bg-red-50 p-5 text-red-900">Results are temporarily unavailable. Please try again later.</p>
            ) : (
              <>
                <h2 className="mt-9 text-2xl font-semibold">Local reader preferences</h2>
                {total === 0 ? (
                  <p className="mt-4 rounded-xl bg-[#f7f4ed] p-5 text-sm text-neutral-600">Results will appear when readers participate in this electorate.</p>
                ) : (
                  <div className="mt-6 space-y-5">
                    {options.filter((option) => option.count > 0).map((option) => {
                      const share = (option.count / total) * 100;
                      return (
                        <div key={option.label}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold">{option.label}</span>
                            <span className="tabular-nums text-neutral-600">{share.toFixed(1)}%</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                            <div className="h-full rounded-full bg-[#7b1025]" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <p className="rounded-xl bg-[#f7f4ed] p-4 text-xs leading-6 text-neutral-600">Percentages describe only the readers who chose to participate. Results may change substantially with additional responses, especially where participation is limited.</p>
                  </div>
                )}
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link href={`/polls/${slug}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#7b1025] px-5 py-3 font-semibold text-white">
                    {row?.poll_status === "open" ? "Vote in this electorate" : "View electorate poll"} <ArrowRight size={17} />
                  </Link>
                  <Link href="/election-pulse-2026" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-black/15 px-5 py-3 font-semibold">
                    National reader results
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
        <p className="mt-6 text-xs leading-6 text-neutral-500">
          Percentages are calculated from the existing electorate poll results. These are self-selected reader responses,
          not verified electorate turnout, a scientific poll, a seat projection or an election prediction.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
