import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ShieldAlert,
  Users,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill } from "@/components/status-pill";

export const dynamic = "force-dynamic";

type VoteRecord = {
  id: string;
  option_id: string;
  status: "valid" | "flagged" | "excluded";
  risk_score: number;
  risk_flags: string[];
  submitted_at: string;
};

export default async function PollResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: poll } = await admin
    .from("polls")
    .select("id, title, slug, status, results_visibility")
    .eq("id", id)
    .maybeSingle();

  if (!poll) notFound();

  const { data: options } = await admin
    .from("poll_options")
    .select("id, label, short_label, display_order")
    .eq("poll_id", id)
    .eq("is_active", true)
    .order("display_order");

  const { data: votes } = await admin
    .from("votes")
    .select(
      "id, option_id, status, risk_score, risk_flags, submitted_at"
    )
    .eq("poll_id", id)
    .order("submitted_at", { ascending: false });

  const voteRecords = (votes ?? []) as VoteRecord[];

  const totalVotes = voteRecords.length;
  const validVotes = voteRecords.filter(
    (vote) => vote.status === "valid"
  ).length;
  const flaggedVotes = voteRecords.filter(
    (vote) => vote.status === "flagged"
  ).length;
  const excludedVotes = voteRecords.filter(
    (vote) => vote.status === "excluded"
  ).length;

  const optionResults = (options ?? []).map((option) => {
    const validCount = voteRecords.filter(
      (vote) =>
        vote.option_id === option.id && vote.status === "valid"
    ).length;

    const percentage =
      validVotes > 0 ? (validCount / validVotes) * 100 : 0;

    return {
      ...option,
      validCount,
      percentage,
    };
  });

  const latestVotes = voteRecords.slice(0, 20);

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <Link
            href={`/admin/polls/${poll.id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#7b1025]"
          >
            <ArrowLeft size={17} />
            Back to poll
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StatusPill status={poll.status} />

            <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
              {poll.results_visibility} results
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Poll results
          </h1>

          <p className="mt-2 text-neutral-600">{poll.title}</p>
        </div>

        <a
          href={`/polls/${poll.slug}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold"
        >
          View public poll
        </a>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total responses"
          value={totalVotes}
          icon={<Users size={21} />}
        />

        <MetricCard
          label="Valid responses"
          value={validVotes}
          icon={<CheckCircle2 size={21} />}
        />

        <MetricCard
          label="Flagged responses"
          value={flaggedVotes}
          icon={<ShieldAlert size={21} />}
        />

        <MetricCard
          label="Excluded responses"
          value={excludedVotes}
          icon={<AlertTriangle size={21} />}
        />
      </section>

      <section className="mt-8 rounded-[2rem] border border-black/10 bg-white p-7 md:p-9">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[#7b1025] text-white">
            <BarChart3 size={21} />
          </div>

          <div>
            <h2 className="text-2xl font-semibold">Valid responses by option</h2>

            <p className="mt-1 text-sm text-neutral-500">
              Percentages are calculated using valid responses only.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {optionResults.map((option) => (
            <div key={option.id}>
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="font-semibold">{option.label}</p>

                  {option.short_label && (
                    <p className="mt-1 text-xs text-neutral-400">
                      {option.short_label}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xl font-semibold text-[#7b1025]">
                    {option.percentage.toFixed(1)}%
                  </p>

                  <p className="text-xs text-neutral-400">
                    {option.validCount} valid responses
                  </p>
                </div>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7b1025] to-[#b88a2a]"
                  style={{
                    width: `${Math.min(option.percentage, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-[2rem] border border-black/10 bg-white">
        <div className="border-b border-black/10 px-6 py-5">
          <h2 className="text-2xl font-semibold">Latest responses</h2>

          <p className="mt-1 text-sm text-neutral-500">
            Showing the most recent 20 submissions.
          </p>
        </div>

        {!latestVotes.length ? (
          <div className="p-8 text-neutral-500">
            No responses have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-[0.14em] text-neutral-400">
                <tr>
                  <th className="px-6 py-4">Option</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Risk score</th>
                  <th className="px-6 py-4">Risk flags</th>
                  <th className="px-6 py-4">Submitted</th>
                </tr>
              </thead>

              <tbody>
                {latestVotes.map((vote) => {
                  const option = options?.find(
                    (item) => item.id === vote.option_id
                  );

                  return (
                    <tr
                      key={vote.id}
                      className="border-t border-black/10"
                    >
                      <td className="px-6 py-4 font-semibold">
                        {option?.short_label ||
                          option?.label ||
                          "Unknown option"}
                      </td>

                      <td className="px-6 py-4">
                        <VoteStatus status={vote.status} />
                      </td>

                      <td className="px-6 py-4">{vote.risk_score}</td>

                      <td className="px-6 py-4 text-neutral-500">
                        {vote.risk_flags?.length
                          ? vote.risk_flags.join(", ")
                          : "None"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-neutral-500">
                        {new Date(vote.submitted_at).toLocaleString(
                          "en-NZ",
                          {
                            timeZone: "Pacific/Auckland",
                            dateStyle: "medium",
                            timeStyle: "short",
                          }
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
          {label}
        </p>

        <span className="text-[#7b1025]">{icon}</span>
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function VoteStatus({
  status,
}: {
  status: "valid" | "flagged" | "excluded";
}) {
  const styles = {
    valid: "bg-emerald-100 text-emerald-800",
    flagged: "bg-amber-100 text-amber-800",
    excluded: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${styles[status]}`}
    >
      {status}
    </span>
  );
}