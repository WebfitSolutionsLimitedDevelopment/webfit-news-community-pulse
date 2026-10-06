import { Lock } from "lucide-react";
import { MIN_POLL_VOTES } from "@/lib/voting-thresholds";

/** Shown in place of results until a poll has enough votes to publish percentages. */
export function ResultsLockedNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-[#b88a2a]/30 bg-[#fbf8f1] p-5 text-sm leading-6 text-neutral-700 ${className}`}
    >
      <Lock size={18} className="mt-0.5 shrink-0 text-[#7b1025]" />
      <p>
        <strong className="text-neutral-900">Results unlock at {MIN_POLL_VOTES} votes.</strong>{" "}
        We only publish results once enough people have voted for them to be meaningful.
        Share this poll to help unlock them.
      </p>
    </div>
  );
}
