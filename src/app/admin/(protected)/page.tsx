import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill } from "@/components/status-pill";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = createAdminClient();

  const { data: polls } = await admin
    .from("polls")
    .select("id, slug, title, status, results_visibility, is_public, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b88a2a]">
            Editorial control centre
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Poll dashboard
          </h1>
          <p className="mt-3 text-neutral-600">
            Create, publish, pause and review Community Pulse polls.
          </p>
        </div>
        <Link
          href="/admin/polls/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7b1025] px-5 py-3 font-semibold text-white"
        >
          <PlusCircle size={18} />
          Create poll
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white">
        <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-black/10 px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 md:grid-cols-[1fr_150px_150px_110px]">
          <span>Poll</span>
          <span className="hidden md:block">Status</span>
          <span className="hidden md:block">Results</span>
          <span>Action</span>
        </div>

        {!polls?.length ? (
          <div className="p-8 text-neutral-500">No polls created yet.</div>
        ) : (
          polls.map((poll) => (
            <div
              key={poll.id}
              className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-black/10 px-5 py-5 last:border-0 md:grid-cols-[1fr_150px_150px_110px]"
            >
              <div>
                <p className="font-semibold">{poll.title}</p>
                <p className="mt-1 text-xs text-neutral-400">/{poll.slug}</p>
              </div>
              <div className="hidden md:block">
                <StatusPill status={poll.status} />
              </div>
              <span className="hidden text-sm capitalize text-neutral-600 md:block">
                {poll.results_visibility}
              </span>
              <Link
                href={`/admin/polls/${poll.id}`}
                className="rounded-xl border border-black/10 px-4 py-2 text-center text-sm font-semibold hover:bg-neutral-50"
              >
                Manage
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
