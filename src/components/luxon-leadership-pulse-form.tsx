"use client";

import { FormEvent, useMemo, useState } from "react";
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
  vote_count: number;
  percentage: number;
};

type Props = {
  pollId: string;
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

export function LuxonLeadershipPulseForm({ pollId, votingOpen, options }: Props) {
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<PollResult[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const selectedLabel = useMemo(
    () => options.find((option) => option.id === selectedOptionId)?.label || "",
    [options, selectedOptionId]
  );

  async function submitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!votingOpen) {
      setError("Voting is not currently open.");
      return;
    }

    if (!selectedOptionId) {
      setError("Choose the answer closest to your view first.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/voting/anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          optionId: selectedOptionId,
          deviceHint: buildDeviceHint(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to record your response right now.");
        return;
      }

      setResults(Array.isArray(data.results) ? data.results : []);
      setTotalResponses(Number(data.totalResponses || 0));
      setSubmitted(true);
    } catch {
      setError("Something went wrong while submitting your response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="mt-8 overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/10 bg-emerald-50 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={24} />
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.025em] text-neutral-950">
                Your view has been recorded
              </h2>
              {selectedLabel && (
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Your response: <span className="font-semibold text-neutral-900">{selectedLabel}</span>
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
            {totalResponses.toLocaleString("en-NZ")} reader response{totalResponses === 1 ? "" : "s"}. Results reflect participating readers only.
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
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">Your view</p>
      <h2 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
        Heading into the 7 November 2026 General Election, how much confidence do you currently have in Christopher Luxon as Prime Minister?
      </h2>

      <div className="mt-7 flex items-center gap-3">
        <span className="rounded-xl bg-[#7b1025]/10 p-2.5 text-[#7b1025]">
          <Vote size={22} />
        </span>
        <div>
          <h3 className="text-xl font-semibold">One question, no sign-in</h3>
          <p className="mt-1 text-sm text-neutral-500">Choose the answer closest to your view.</p>
        </div>
      </div>

      <form className="mt-6" onSubmit={submitVote}>
        <div className="grid gap-3">
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
                    name="leadership-confidence"
                    value={option.id}
                    checked={selected}
                    onChange={() => {
                      setSelectedOptionId(option.id);
                      setError("");
                    }}
                    className="mt-1 h-4 w-4 accent-[#7b1025]"
                  />
                  <div>
                    <span className="font-semibold text-neutral-950">{option.label}</span>
                    {option.description && (
                      <p className="mt-1 text-sm leading-6 text-neutral-500">{option.description}</p>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {error && (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !selectedOptionId || !votingOpen}
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#7b1025] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#65101f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <Vote size={18} />}
          {submitting ? "Submitting..." : "Submit my view"}
        </button>

        <p className="mt-4 text-xs leading-5 text-neutral-500">
          No email address or OTP is collected. A browser token and limited technical signals are used to reduce repeat submissions. This is an open reader poll, not a representative opinion survey.
        </p>
      </form>
    </section>
  );
}
