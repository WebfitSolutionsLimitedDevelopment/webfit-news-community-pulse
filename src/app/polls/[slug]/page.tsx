import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MailCheck,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BrandHeader } from "@/components/brand-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusPill } from "@/components/status-pill";
import { VotingForm } from "@/components/voting-form";
import { ElectorateIssuesForm } from "@/components/electorate-issues-form";
import { HouseholdFinanceForm } from "@/components/household-finance-form";

export const dynamic = "force-dynamic";

type PollOption = {
  id: string;
  label: string;
  short_label: string | null;
  description: string | null;
  logo_url: string | null;
  colour_hex: string | null;
  website_url: string | null;
};

type Electorate = {
  id: string;
  name: string;
  electorate_type: "general" | "maori";
};

function formatDate(value: unknown) {
  if (!value || typeof value !== "string") return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Pacific/Auckland",
  }).format(date);
}

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

  const { data: optionsData } = await supabase
    .from("poll_options")
    .select(
      "id, label, short_label, description, logo_url, colour_hex, website_url"
    )
    .eq("poll_id", poll.id)
    .eq("is_active", true)
    .order("display_order");

  const options = (optionsData ?? []) as PollOption[];

  const { data: responseSummary } = await supabase.rpc(
    "get_public_poll_results",
    {
      requested_poll_id: poll.id,
    }
  );

  const verifiedResponseCount = Array.isArray(responseSummary)
    ? responseSummary.reduce(
        (total, item) => total + Number(item.vote_count ?? 0),
        0
      )
    : 0;

  const pollRecord = poll as Record<string, unknown>;
  const pollType =
    typeof pollRecord.poll_type === "string"
      ? pollRecord.poll_type
      : "multiple_choice";

  const votingOpen = poll.status === "open";

  const opensAt = formatDate(
    pollRecord.opens_at ?? pollRecord.starts_at ?? pollRecord.opened_at
  );
  const closesAt = formatDate(
    pollRecord.closes_at ?? pollRecord.ends_at ?? pollRecord.closed_at
  );
  const partyListCheckedAt = formatDate(pollRecord.party_list_checked_at);
  const partyRegisterSourceUrl =
    typeof pollRecord.party_register_source_url === "string"
      ? pollRecord.party_register_source_url
      : null;

  let electorates: Electorate[] = [];

  if (pollType === "electorate_issue") {
    const { data: electorateData, error: electorateError } = await supabase
      .from("electorates")
      .select("id, name, electorate_type")
      .eq("is_active", true)
      .order("name");

    if (electorateError) {
      console.error("Unable to load electorates:", electorateError);
    }

    electorates = (electorateData ?? []) as Electorate[];
  }

  const isElectorateIssuePoll = pollType === "electorate_issue";
  const isPartyVotePoll = pollType === "party_vote";
  const isHouseholdFinancePoll = pollType === "household_finance";

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
                {isElectorateIssuePoll
                  ? "2026 New Zealand electorate pulse"
                  : isHouseholdFinancePoll
                    ? "2026 New Zealand household finance pulse"
                    : "2026 New Zealand General Election"}
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

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-neutral-600">
                {isPartyVotePoll && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2">
                    <CalendarDays size={16} className="text-[#7b1025]" />
                    Election day: Saturday, 7 November 2026
                  </span>
                )}

                {isElectorateIssuePoll && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2">
                    <MapPin size={16} className="text-[#7b1025]" />
                    {electorates.length.toLocaleString("en-NZ")} electorates available
                  </span>
                )}

                {opensAt && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2">
                    <Clock3 size={16} className="text-[#7b1025]" />
                    Opened {opensAt}
                  </span>
                )}

                {closesAt && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2">
                    <Clock3 size={16} className="text-[#7b1025]" />
                    Closes {closesAt}
                  </span>
                )}
              </div>
            </div>

            <aside className="rounded-[1.5rem] border border-[#b88a2a]/30 bg-[#fbf8f1] p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d741f]">
                Live participation
              </p>

              <div className="mt-4 flex items-end gap-3">
                <p className="text-5xl font-semibold tracking-[-0.05em]">
                  {verifiedResponseCount.toLocaleString("en-NZ")}
                </p>
                <p className="pb-1 text-sm leading-5 text-neutral-500">
                  verified
                  <br />
                  responses
                </p>
              </div>

              <div className="mt-6 space-y-3 border-t border-black/10 pt-5">
                <TrustLine
                  icon={<CheckCircle2 size={17} />}
                  text="One verified response per email address"
                />
                <TrustLine
                  icon={<MailCheck size={17} />}
                  text="Email addresses are never published"
                />
                <TrustLine
                  icon={<BarChart3 size={17} />}
                  text={
                    isElectorateIssuePoll
                      ? "Results appear after verification"
                      : "Results reflect participating readers"
                  }
                />
              </div>
            </aside>
          </div>
        </section>

        {!votingOpen && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <p className="font-semibold text-amber-950">
              Voting is currently unavailable.
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900/75">
              This poll is currently {poll.status}. Please check again later.
            </p>
          </div>
        )}

        {votingOpen && isElectorateIssuePoll && (
          <ElectorateIssuesForm
            pollId={poll.id}
            pollSlug={poll.slug}
            votingOpen={votingOpen}
            options={options}
            electorates={electorates}
          />
        )}

        {votingOpen && isPartyVotePoll && (
          <>
            <section className="mt-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">
                Your party vote
              </p>

              <h2 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                {poll.question}
              </h2>
            </section>

            <details className="group mt-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                <span>What is the party vote?</span>
                <ChevronDown className="shrink-0 transition group-open:rotate-180" />
              </summary>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-600">
                Under New Zealand&apos;s MMP system, your party vote largely
                determines each party&apos;s share of seats in Parliament. Your
                electorate vote chooses the person you want to represent your
                local electorate.
              </p>
            </details>

            <VotingForm
              pollId={poll.id}
              pollSlug={poll.slug}
              votingOpen={votingOpen}
              options={options}
            />
          </>
        )}

        {votingOpen && isHouseholdFinancePoll && (
          <HouseholdFinanceForm
            pollId={poll.id}
            pollSlug={poll.slug}
            votingOpen={votingOpen}
            options={options}
          />
        )}

        {isPartyVotePoll && (partyListCheckedAt || partyRegisterSourceUrl) && (
          <section className="mt-7 rounded-2xl border border-black/10 bg-white p-5 text-sm text-neutral-600">
            <p className="font-semibold text-neutral-900">
              Party register information
            </p>

            {partyListCheckedAt && (
              <p className="mt-2">
                Party list last checked: {partyListCheckedAt}
              </p>
            )}

            {partyRegisterSourceUrl && (
              <a
                href={partyRegisterSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block font-semibold text-[#7b1025] hover:underline"
              >
                Source: New Zealand Electoral Commission
              </a>
            )}
          </section>
        )}

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

function TrustLine({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm leading-6 text-neutral-600">
      <span className="mt-0.5 shrink-0 text-[#7b1025]">{icon}</span>
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
  icon: React.ReactNode;
  title: string;
  body: string;
  tone?: "default" | "warning";
}) {
  return (
    <details
      className={`group rounded-2xl border p-5 ${
        tone === "warning"
          ? "border-amber-300/70 bg-amber-50"
          : "border-black/10 bg-white"
      }`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <span className="flex items-center gap-3 font-semibold">
          <span
            className={
              tone === "warning" ? "text-amber-700" : "text-[#7b1025]"
            }
          >
            {icon}
          </span>
          {title}
        </span>
        <ChevronDown className="shrink-0 transition group-open:rotate-180" />
      </summary>

      <p
        className={`mt-4 whitespace-pre-line text-sm leading-7 ${
          tone === "warning" ? "text-amber-950/75" : "text-neutral-600"
        }`}
      >
        {body}
      </p>
    </details>
  );
}
