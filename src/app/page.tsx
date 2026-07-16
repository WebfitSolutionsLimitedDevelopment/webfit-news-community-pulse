import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BrandHeader } from "@/components/brand-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusPill } from "@/components/status-pill";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: polls } = await supabase
    .from("polls")
    .select("id, slug, title, question, description, status, results_visibility, ends_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <BrandHeader />

      <main>
        <section className="relative overflow-hidden border-b border-black/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(123,16,37,.13),transparent_30%),radial-gradient(circle_at_10%_50%,rgba(184,138,42,.11),transparent_32%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[1.25fr_.75fr] md:px-8 md:py-28">
            <div>
              <p className="mb-5 text-sm font-bold uppercase tracking-[0.35em] text-[#9d741f]">
                Webfit News Community Pulse 2026
              </p>
              <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.045em] md:text-7xl">
                A clearer view of what communities are thinking.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-neutral-600">
                Transparent, independently operated community polling designed
                to capture public sentiment without pretending to be a
                scientific national survey.
              </p>
            </div>

            <div className="luxury-border glass rounded-[2rem] p-7 md:p-9">
              <div className="flex items-start gap-4">
                <Scale className="mt-1 text-[#7b1025]" />
                <div>
                  <h2 className="text-xl font-semibold">Built for trust</h2>
                  <p className="mt-3 leading-7 text-neutral-600">
                    Every published poll carries clear methodology, a visible
                    disclaimer and transparent result handling.
                  </p>
                </div>
              </div>
              <div className="mt-7 space-y-4 border-t border-black/10 pt-7">
                <div className="flex gap-3 text-sm text-neutral-700">
                  <CheckCircle2 size={18} className="text-[#9d741f]" />
                  One verified response per participant
                </div>
                <div className="flex gap-3 text-sm text-neutral-700">
                  <LockKeyhole size={18} className="text-[#9d741f]" />
                  Results controlled by the editorial team
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <div className="mb-9 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b88a2a]">
                Current polls
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Have your say
              </h2>
            </div>
          </div>

          {!polls?.length ? (
            <div className="luxury-border rounded-[2rem] bg-white p-10 text-center">
              <h3 className="text-2xl font-semibold">No public poll is live yet</h3>
              <p className="mx-auto mt-3 max-w-xl leading-7 text-neutral-600">
                The platform is ready. The first Community Pulse poll will
                appear here once it is published by the Webfit News team.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {polls.map((poll) => (
                <article
                  key={poll.id}
                  className="luxury-border group rounded-[2rem] bg-white p-7 transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="flex items-center justify-between gap-4">
                    <StatusPill status={poll.status} />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                      Community Pulse
                    </span>
                  </div>
                  <h3 className="mt-7 text-2xl font-semibold tracking-tight">
                    {poll.title}
                  </h3>
                  <p className="mt-4 text-lg leading-7 text-neutral-700">
                    {poll.question}
                  </p>
                  {poll.description && (
                    <p className="mt-4 line-clamp-3 leading-7 text-neutral-500">
                      {poll.description}
                    </p>
                  )}
                  <Link
                    href={`/polls/${poll.slug}`}
                    className="mt-8 inline-flex items-center gap-2 font-semibold text-[#7b1025]"
                  >
                    View poll
                    <ArrowRight
                      size={18}
                      className="transition group-hover:translate-x-1"
                    />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
