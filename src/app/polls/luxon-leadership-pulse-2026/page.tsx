import type { ReactNode } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { BrandHeader } from "@/components/brand-header";
import { LuxonLeadershipPulseForm } from "@/components/luxon-leadership-pulse-form";
import { SiteFooter } from "@/components/site-footer";
import { StatusPill } from "@/components/status-pill";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LUXON_POLL_SLUG = "luxon-leadership-pulse-2026";

type PollOption = {
  id: string;
  label: string;
  short_label: string | null;
  description: string | null;
};

export default async function LuxonLeadershipPulsePage() {
  const supabase = await createClient();

  const { data: poll } = await supabase
    .from("polls")
    .select("*")
    .eq("slug", LUXON_POLL_SLUG)
    .eq("is_public", true)
    .maybeSingle();

  if (!poll) notFound();

  const { data: optionsData } = await supabase
    .from("poll_options")
    .select("id, label, short_label, description")
    .eq("poll_id", poll.id)
    .eq("is_active", true)
    .order("display_order");

  const options = (optionsData ?? []) as PollOption[];

  const votingOpen = poll.status === "open";

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-neutral-950">
      <BrandHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_30px_90px_rgba(38,31,20,0.08)]">
          <div className="h-1.5 bg-gradient-to-r from-[#7b1025] via-[#9a1730] to-[#b88a2a]" />

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_0.6fr] lg:p-10">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={poll.status} />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
                  Independent community poll
                </span>
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">
                2026 New Zealand General Election
              </p>

              <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
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
                Quick and anonymous
              </p>

              <div className="mt-4 space-y-3 text-sm leading-6 text-neutral-600">
                <TrustLine text="No email or OTP required" />
                <TrustLine text="Lightweight browser controls reduce repeat voting" />
                <TrustLine text="Open reader pulse, not a scientific survey" />
              </div>
            </aside>
          </div>
        </section>

        {!votingOpen && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <p className="font-semibold text-amber-950">Voting is currently unavailable.</p>
            <p className="mt-2 text-sm leading-6 text-amber-900/75">
              This poll is currently {poll.status}. Please check again later.
            </p>
          </div>
        )}

        <LuxonLeadershipPulseForm
          pollId={poll.id}
          votingOpen={votingOpen}
          options={options}
        />

        <section className="mt-7 grid gap-4 lg:grid-cols-3">
          <DisclosureCard
            icon={<AlertTriangle size={20} />}
            title="Important notice"
            body={poll.disclaimer}
            tone="warning"
          />
          <DisclosureCard
            icon={<ShieldCheck size={20} />}
            title="Privacy"
            body={poll.privacy_notice}
          />
          {poll.methodology && (
            <DisclosureCard
              icon={<BarChart3 size={20} />}
              title="Methodology"
              body={poll.methodology}
            />
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function TrustLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#7b1025]" />
      <p>{text}</p>
    </div>
  );
}

function DisclosureCard({
  icon,
  title,
  body,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  body: string | null;
  tone?: "default" | "warning";
}) {
  if (!body) return null;

  return (
    <details
      className={`group rounded-2xl border p-5 ${
        tone === "warning"
          ? "border-amber-300/70 bg-amber-50"
          : "border-black/10 bg-white"
      }`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[#7b1025]">{icon}</span>
          <span className="font-semibold">{title}</span>
        </div>
      </summary>
      <p className="mt-4 text-sm leading-7 text-neutral-600">{body}</p>
    </details>
  );
}
