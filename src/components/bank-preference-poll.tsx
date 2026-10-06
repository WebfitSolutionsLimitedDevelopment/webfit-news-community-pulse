"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, LoaderCircle, Vote } from "lucide-react";

type PollOption = {
  id: string;
  label: string;
  short_label: string | null;
  description: string | null;
};

type PollResult = {
  option_id: string;
  option_label: string;
  percentage: number;
};

type BankPreferencePollProps = {
  votingOpen: boolean;
  options: PollOption[];
};

function buildDeviceHint() {
  if (typeof window === "undefined") return "";

  return [
    navigator.userAgent,
    navigator.language,
    `${window.screen.width}x${window.screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");
}

export function BankPreferencePoll({
  votingOpen,
  options,
}: BankPreferencePollProps) {
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [results, setResults] = useState<PollResult[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [checkingVote, setCheckingVote] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkExistingVote() {
      try {
        const response = await fetch("/api/voting/bank-poll", {
          method: "GET",
          cache: "no-store",
        });
        const data = await response.json();

        if (!active) return;

        if (response.ok && data.voted) {
          setHasVoted(true);
          setSelectedOptionId(String(data.selectedOptionId || ""));
          setResults(Array.isArray(data.results) ? data.results : []);
        }
      } catch {
        // A failed status check should not prevent a visitor from voting.
      } finally {
        if (active) setCheckingVote(false);
      }
    }

    checkExistingVote();

    return () => {
      active = false;
    };
  }, []);

  const selectedLabel = useMemo(
    () => options.find((option) => option.id === selectedOptionId)?.label || "",
    [options, selectedOptionId]
  );

  async function submitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!votingOpen) {
      setMessage("Voting is not currently open.");
      return;
    }

    if (!selectedOptionId) {
      setMessage("Choose one bank before submitting your vote.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/voting/bank-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionId: selectedOptionId,
          deviceHint: buildDeviceHint(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && Array.isArray(data.results)) {
          setHasVoted(true);
          setSelectedOptionId(String(data.selectedOptionId || selectedOptionId));
          setResults(data.results);
          setMessage("");
          return;
        }

        setMessage(data.error || "Unable to record your vote right now.");
        return;
      }

      setHasVoted(true);
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setMessage("Something went wrong while submitting your vote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingVote) {
    return (
      <section className="mt-8 rounded-[2rem] border border-black/10 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-medium text-neutral-600">
          <LoaderCircle className="animate-spin" size={20} />
          Checking this browser&apos;s voting status...
        </div>
      </section>
    );
  }

  if (hasVoted) {
    return (
      <section className="mt-8 overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 bg-emerald-50 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={24} />
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.025em] text-neutral-950">
                Your vote has been recorded
              </h2>
              {selectedLabel && (
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Your choice: <span className="font-semibold text-neutral-900">{selectedLabel}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-[#7b1025]" />
            <h3 className="text-xl font-semibold">Current reader results</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Percentages reflect participating Webfit News readers. Raw response totals are not displayed.
          </p>

          <div className="mt-6 space-y-5">
            {results.map((result) => {
              const percentage = Number(result.percentage || 0);
              return (
                <div key={result.option_id}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-neutral-900">{result.option_label}</span>
                    <span className="font-semibold tabular-nums text-neutral-700">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-[#7b1025] transition-[width] duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-[#7b1025]/10 p-2.5 text-[#7b1025]">
          <Vote size={22} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d741f]">Vote now</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">
            Which is your favourite bank in New Zealand?
          </h2>
        </div>
      </div>

      {!votingOpen ? (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          This poll is not currently accepting responses.
        </div>
      ) : (
        <form className="mt-7" onSubmit={submitVote}>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((option) => {
              const selected = selectedOptionId === option.id;
              return (
                <label
                  key={option.id}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    selected
                      ? "border-[#7b1025] bg-[#7b1025]/5 ring-1 ring-[#7b1025]"
                      : "border-black/10 bg-white hover:border-black/25"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="bank"
                      value={option.id}
                      checked={selected}
                      onChange={() => {
                        setSelectedOptionId(option.id);
                        setMessage("");
                      }}
                      className="mt-1 h-4 w-4 accent-[#7b1025]"
                    />
                    <div>
                      <span className="font-semibold text-neutral-950">{option.label}</span>
                      {option.description && (
                        <p className="mt-1 text-xs leading-5 text-neutral-500">{option.description}</p>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {message && (
            <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedOptionId}
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#7b1025] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#65101f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <Vote size={18} />}
            {submitting ? "Submitting..." : "Submit my vote"}
          </button>

          <p className="mt-4 text-xs leading-5 text-neutral-500">
            No email or OTP. This browser can submit one response to this poll. Results are shown after voting.
          </p>
        </form>
      )}
    </section>
  );
}
