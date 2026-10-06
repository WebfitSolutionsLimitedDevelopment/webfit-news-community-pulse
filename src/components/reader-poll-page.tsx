import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Building2, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { SiteFooter } from "@/components/site-footer";
import { ReaderPoll } from "@/components/reader-poll";
import { getMoneyPoll } from "@/lib/money-polls";
import { createClient } from "@/lib/supabase/server";

type PollOption = {
  id: string;
  label: string;
  short_label: string | null;
  description: string | null;
};

/** Page shell for a money/banking reader poll, styled like the bank poll page. */
export async function ReaderPollPage({ slug }: { slug: string }) {
  const config = getMoneyPoll(slug);
  const supabase = await createClient();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select(
      "id, slug, title, question, description, status, results_visibility, hero_title, hero_subtitle, disclaimer, methodology, privacy_notice"
    )
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (pollError) {
    console.error(`Unable to load poll ${slug}:`, pollError);
  }

  if (!poll) notFound();

  const { data: optionData, error: optionError } = await supabase
    .from("poll_options")
    .select("id, label, short_label, description")
    .eq("poll_id", poll.id)
    .eq("is_active", true)
    .order("display_order");

  if (optionError) {
    console.error(`Unable to load options for poll ${slug}:`, optionError);
  }

  const options = (optionData ?? []) as PollOption[];
  const votingOpen = poll.status === "open";
  const resultsPublic = poll.results_visibility !== "private";

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-neutral-950">
      <BrandHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_30px_90px_rgba(38,31,20,0.08)]">
          <div className="h-1.5 bg-gradient-to-r from-[#7b1025] via-[#9a1730] to-[#b88a2a]" />

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                {votingOpen ? "Open now" : poll.status}
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
                Webfit News Community Pulse
              </span>
            </div>

            <div className="mt-7 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">
                  {config.eyebrow}
                </p>
                <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                  {poll.hero_title || poll.title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-neutral-700">
                  {poll.hero_subtitle || poll.question}
                </p>
                {poll.description && (
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-500 sm:text-base">
                    {poll.description}
                  </p>
                )}
              </div>

              <aside className="rounded-[1.5rem] border border-[#b88a2a]/30 bg-[#fbf8f1] p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d741f]">
                  How this poll works
                </p>
                <div className="mt-5 space-y-4 text-sm leading-6 text-neutral-700">
                  <TrustLine icon={<Building2 size={18} />} text={config.choiceHint} />
                  <TrustLine icon={<LockKeyhole size={18} />} text="No email address or sign-up is required." />
                  <TrustLine
                    icon={<ShieldCheck size={18} />}
                    text="One response per browser, with basic anti-abuse controls."
                  />
                  <TrustLine
                    icon={<CheckCircle2 size={18} />}
                    text={
                      resultsPublic
                        ? "Results are shown as percentages after this browser has voted."
                        : "Results for this poll are not public at the moment."
                    }
                  />
                </div>
              </aside>
            </div>
          </div>
        </section>

        <ReaderPoll
          pollId={poll.id}
          question={poll.question || config.question}
          votingOpen={votingOpen}
          resultsPublic={resultsPublic}
          options={options}
        />

        <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 text-sm leading-7 text-neutral-600 shadow-sm sm:p-6">
          <p className="font-semibold text-neutral-900">About this reader poll</p>
          <p className="mt-2">
            {poll.disclaimer ||
              "This is an independent, voluntary Webfit News reader poll and is not a scientifically representative national survey."}
          </p>
          {poll.methodology && <p className="mt-3">{poll.methodology}</p>}
          {poll.privacy_notice && <p className="mt-3">{poll.privacy_notice}</p>}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function TrustLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[#7b1025]">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
