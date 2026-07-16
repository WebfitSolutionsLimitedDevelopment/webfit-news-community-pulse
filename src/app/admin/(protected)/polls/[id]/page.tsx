import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, ExternalLink } from "lucide-react";
import {
  addPollOption,
  deletePollOption,
  updatePoll,
} from "@/app/admin/(protected)/polls/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill } from "@/components/status-pill";

export const dynamic = "force-dynamic";

export default async function ManagePollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: poll } = await admin
    .from("polls")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!poll) notFound();

  const { data: options } = await admin
    .from("poll_options")
    .select("*")
    .eq("poll_id", id)
    .order("display_order");

  const { count: totalVotes } = await admin
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("poll_id", id);

  const { count: validVotes } = await admin
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("poll_id", id)
    .eq("status", "valid");

  const { count: flaggedVotes } = await admin
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("poll_id", id)
    .eq("status", "flagged");

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={poll.status} />

            <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
              {poll.results_visibility} results
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            {poll.title}
          </h1>

          <p className="mt-2 text-neutral-500">/{poll.slug}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/polls/${poll.id}/results`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7b1025] px-5 py-3 text-sm font-semibold text-white"
          >
            <BarChart3 size={17} />
            View results
          </Link>

          <a
            href={`/polls/${poll.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold"
          >
            <ExternalLink size={17} />
            View public page
          </a>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total responses" value={totalVotes ?? 0} />
        <StatCard label="Valid responses" value={validVotes ?? 0} />
        <StatCard label="Flagged responses" value={flaggedVotes ?? 0} />
      </section>

      <form
        action={updatePoll}
        className="mt-8 space-y-6 rounded-[2rem] border border-black/10 bg-white p-7 md:p-9"
      >
        <input type="hidden" name="id" value={poll.id} />

        <Field name="title" label="Title" defaultValue={poll.title} />

        <TextArea
          name="question"
          label="Question"
          defaultValue={poll.question}
        />

        <TextArea
          name="description"
          label="Description"
          defaultValue={poll.description || ""}
        />

        <TextArea
          name="methodology"
          label="Methodology"
          defaultValue={poll.methodology || ""}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <span className="text-sm font-semibold">Status</span>

            <select
              name="status"
              defaultValue={poll.status}
              className="mt-2 w-full rounded-2xl border border-black/15 px-4 py-3"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="open">Open</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold">Results</span>

            <select
              name="results_visibility"
              defaultValue={poll.results_visibility}
              className="mt-2 w-full rounded-2xl border border-black/15 px-4 py-3"
            >
              <option value="private">Private</option>
              <option value="live">Live</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-4">
          <input
            type="checkbox"
            name="is_public"
            defaultChecked={poll.is_public}
            className="h-4 w-4 accent-[#7b1025]"
          />

          <span className="text-sm font-semibold">Show publicly</span>
        </label>

        <button className="rounded-2xl bg-[#7b1025] px-6 py-3 font-semibold text-white">
          Save changes
        </button>
      </form>

      <section className="mt-8 rounded-[2rem] border border-black/10 bg-white p-7 md:p-9">
        <h2 className="text-2xl font-semibold">Poll options</h2>

        <div className="mt-6 space-y-3">
          {options?.map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 px-4 py-4"
            >
              <div>
                <p className="font-semibold">{option.label}</p>

                {option.short_label && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                    {option.short_label}
                  </p>
                )}

                {option.description && (
                  <p className="mt-1 text-sm text-neutral-500">
                    {option.description}
                  </p>
                )}
              </div>

              <form action={deletePollOption}>
                <input type="hidden" name="option_id" value={option.id} />
                <input type="hidden" name="poll_id" value={poll.id} />

                <button className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>

        <form
          action={addPollOption}
          className="mt-8 grid gap-4 rounded-2xl bg-[#f7f3eb] p-5 md:grid-cols-2"
        >
          <input type="hidden" name="poll_id" value={poll.id} />

          <Field name="label" label="Option name" />
          <Field name="short_label" label="Short label" />
          <Field name="logo_url" label="Logo URL" />
          <Field name="website_url" label="Website URL" />

          <div className="md:col-span-2">
            <TextArea
              name="description"
              label="Description"
              defaultValue=""
            />
          </div>

          <button className="w-fit rounded-2xl bg-[#171717] px-5 py-3 font-semibold text-white">
            Add option
          </button>
        </form>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue = "",
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>

      <input
        name={name}
        defaultValue={defaultValue}
        required={name === "title" || name === "label"}
        className="mt-2 w-full rounded-2xl border border-black/15 px-4 py-3 outline-none focus:border-[#7b1025]"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>

      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={4}
        className="mt-2 w-full rounded-2xl border border-black/15 px-4 py-3 outline-none focus:border-[#7b1025]"
      />
    </label>
  );
}