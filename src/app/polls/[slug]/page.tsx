import { notFound } from "next/navigation";
import { AlertTriangle, BarChart3, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BrandHeader } from "@/components/brand-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusPill } from "@/components/status-pill";
import { VotingForm } from "@/components/voting-form";

export const dynamic = "force-dynamic";

export default async function PollPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: poll } = await supabase
    .from("polls")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (!poll) notFound();

  const { data: options } = await supabase
    .from("poll_options")
    .select(
      "id, label, short_label, description, logo_url, colour_hex, website_url"
    )
    .eq("poll_id", poll.id)
    .eq("is_active", true)
    .order("display_order");

  let results:
    | Array<{
        option_id: string;
        option_label: string;
        vote_count: number;
        percentage: number;
      }>
    | null = null;

  if (poll.results_visibility !== "private") {
    const { data } = await supabase.rpc("get_public_poll_results", {
      requested_poll_id: poll.id,
    });

    results = data;
  }

  const votingOpen = poll.status === "open";

  return (
    <div className="min-h-screen">
      <BrandHeader />

      <main className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-20">
        <div className="mb-6 flex items-center gap-3">
          <StatusPill status={poll.status} />

          <span className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-400">
            Independent Community Poll
          </span>
        </div>

        <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
          {poll.title}
        </h1>

        <p className="mt-6 text-xl leading-8 text-neutral-700">
          {poll.question}
        </p>

        {poll.description && (
          <p className="mt-5 max-w-3xl leading-8 text-neutral-500">
            {poll.description}
          </p>
        )}

        {results ? (
          <section className="mt-10 space-y-5">
            {options?.map((option) => {
              const result = results.find(
                (item) => item.option_id === option.id
              );

              const percentage = Number(result?.percentage ?? 0);

              return (
                <article
                  key={option.id}
                  className="luxury-border rounded-[1.5rem] bg-white p-5 md:p-6"
                >
                  <div className="flex items-center justify-between gap-5">
                    <div>
                      <h2 className="text-lg font-semibold">{option.label}</h2>

                      {option.description && (
                        <p className="mt-1 text-sm text-neutral-500">
                          {option.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-semibold text-[#7b1025]">
                        {percentage.toFixed(1)}%
                      </p>

                      <p className="text-xs text-neutral-400">
                        {result?.vote_count ?? 0} responses
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7b1025] to-[#b88a2a]"
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <VotingForm
            pollId={poll.id}
            pollSlug={poll.slug}
            votingOpen={votingOpen}
            options={options ?? []}
          />
        )}

        {!votingOpen && !results && (
          <div className="mt-8 rounded-[1.5rem] border border-amber-300 bg-amber-50 p-5">
            <p className="font-semibold text-amber-950">
              Voting is currently unavailable.
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-900/75">
              This poll is currently {poll.status}. Please check again later.
            </p>
          </div>
        )}

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-amber-300/60 bg-amber-50 p-6">
            <div className="flex gap-3">
              <AlertTriangle className="mt-1 shrink-0 text-amber-700" />

              <div>
                <h3 className="font-semibold">Important notice</h3>

                <p className="mt-2 text-sm leading-6 text-amber-950/75">
                  {poll.disclaimer}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-black/10 bg-white p-6">
            <div className="flex gap-3">
              <ShieldCheck className="mt-1 shrink-0 text-[#7b1025]" />

              <div>
                <h3 className="font-semibold">Privacy</h3>

                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {poll.privacy_notice}
                </p>
              </div>
            </div>
          </div>
        </section>

        {poll.methodology && (
          <section className="mt-8 rounded-[1.5rem] border border-black/10 bg-white p-6">
            <div className="flex gap-3">
              <BarChart3 className="mt-1 shrink-0 text-[#9d741f]" />

              <div>
                <h3 className="font-semibold">Methodology</h3>

                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-600">
                  {poll.methodology}
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}