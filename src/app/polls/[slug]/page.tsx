import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MailCheck,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BrandHeader } from "@/components/brand-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusPill } from "@/components/status-pill";
import { VotingForm } from "@/components/voting-form";

export const dynamic = "force-dynamic";

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

  const { data: options } = await supabase
    .from("poll_options")
    .select(
      "id, label, short_label, description, logo_url, colour_hex, website_url"
    )
    .eq("poll_id", poll.id)
    .eq("is_active", true)
    .order("display_order");

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

  const votingOpen = poll.status === "open";
  const pollRecord = poll as Record<string, unknown>;

  const opensAt = formatDate(
    pollRecord.opens_at ?? pollRecord.start_at ?? pollRecord.open_at
  );
  const closesAt = formatDate(
    pollRecord.closes_at ?? pollRecord.end_at ?? pollRecord.close_at
  );
  const partyListCheckedAt = formatDate(pollRecord.party_list_checked_at);
  const partyRegisterSourceUrl =
    typeof pollRecord.party_register_source_url === "string"
      ? pollRecord.party_register_source_url
      : null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <BrandHeader />

      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-16">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <StatusPill status={poll.status} />

          <span className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-400">
            Independent Community Poll
          </span>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-[#7b1025] to-[#b88a2a]" />

          <div className="p-7 md:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9d741f]">
              2026 New Zealand General Election
            </p>

            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
              New Zealand votes in November. Where does public opinion stand
              today?
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-700 md:text-xl">
              Take the Webfit News Community Pulse poll and see how
              participating readers are thinking about the 2026 General
              Election. Voting takes around 30 seconds.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-sm text-neutral-600">
              <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2">
                <CalendarDays size={16} className="text-[#7b1025]" />
                Election day: Saturday, 7 November 2026
              </span>

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
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-[#b88a2a]/30 bg-[#faf7ef] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#7b1025] text-white">
              <Users size={21} />
            </div>

            <div>
              <p className="text-2xl font-semibold text-neutral-950">
                {verifiedResponseCount.toLocaleString("en-NZ")}
              </p>
              <p className="text-sm text-neutral-600">
                verified participants have responded
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <TrustPoint
            icon={<CheckCircle2 size={20} />}
            text="One verified response per verified email address"
          />
          <TrustPoint
            icon={<MailCheck size={20} />}
            text="Email addresses are not added to marketing lists"
          />
          <TrustPoint
            icon={<BarChart3 size={20} />}
            text="Results represent participants, not all New Zealand voters"
          />
        </section>

        <section className="mt-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">
            Your party vote
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            {poll.question}
          </h2>

          {poll.description && (
            <p className="mt-4 max-w-3xl leading-7 text-neutral-600">
              {poll.description}
            </p>
          )}
        </section>

        <details className="group mt-6 rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            <span>What is the party vote?</span>
            <ChevronDown className="shrink-0 transition group-open:rotate-180" />
          </summary>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-600">
            Under New Zealand&apos;s MMP system, your party vote largely
            determines each party&apos;s share of seats in Parliament. Your
            electorate vote chooses the person you want to represent your local
            electorate.
          </p>
        </details>

        {votingOpen ? (
          <VotingForm
            pollId={poll.id}
            pollSlug={poll.slug}
            votingOpen={votingOpen}
            options={options ?? []}
          />
        ) : (
          <div className="mt-8 rounded-[1.5rem] border border-amber-300 bg-amber-50 p-5">
            <p className="font-semibold text-amber-950">
              Voting is currently unavailable.
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-900/75">
              This poll is currently {poll.status}. Please check again later.
            </p>
          </div>
        )}

        {(partyListCheckedAt || partyRegisterSourceUrl) && (
          <section className="mt-8 rounded-[1.5rem] border border-black/10 bg-white p-5 text-sm text-neutral-600">
            <p className="font-semibold text-neutral-900">
              Party register information
            </p>

            {partyListCheckedAt && (
              <p className="mt-2">Party list last checked: {partyListCheckedAt}</p>
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

        <section className="mt-8 space-y-4">
          <details className="group rounded-[1.5rem] border border-amber-300/60 bg-amber-50 p-5 md:p-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="flex items-center gap-3 font-semibold">
                <AlertTriangle className="shrink-0 text-amber-700" />
                Important notice
              </span>
              <ChevronDown className="shrink-0 transition group-open:rotate-180" />
            </summary>

            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-amber-950/75">
              {poll.disclaimer}
            </p>
          </details>

          <details className="group rounded-[1.5rem] border border-black/10 bg-white p-5 md:p-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="flex items-center gap-3 font-semibold">
                <ShieldCheck className="shrink-0 text-[#7b1025]" />
                Privacy
              </span>
              <ChevronDown className="shrink-0 transition group-open:rotate-180" />
            </summary>

            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-neutral-600">
              {poll.privacy_notice}
            </p>
          </details>

          {poll.methodology && (
            <details className="group rounded-[1.5rem] border border-black/10 bg-white p-5 md:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="flex items-center gap-3 font-semibold">
                  <BarChart3 className="shrink-0 text-[#9d741f]" />
                  Methodology
                </span>
                <ChevronDown className="shrink-0 transition group-open:rotate-180" />
              </summary>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-neutral-600">
                {poll.methodology}
              </p>
            </details>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function TrustPoint({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[1.25rem] border border-black/10 bg-white p-4 shadow-sm">
      <span className="mt-0.5 text-[#7b1025]">{icon}</span>
      <p className="text-sm font-medium leading-6 text-neutral-700">{text}</p>
    </div>
  );
}
