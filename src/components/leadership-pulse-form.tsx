"use client";

import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Loader2, Vote } from "lucide-react";

type PollOption = {
  id: string;
  label: string;
  short_label: string | null;
  description: string | null;
};

type ResultRow = {
  option_id: string;
  option_label: string;
  vote_count: number;
  percentage: number;
};

type Props = {
  pollId: string;
  pollSlug: string;
  votingOpen: boolean;
  options: PollOption[];
};

export function LeadershipPulseForm({
  pollId,
  pollSlug,
  votingOpen,
  options,
}: Props) {
  const [selectedOption, setSelectedOption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);

  const selectedLabel = useMemo(
    () => options.find((option) => option.id === selectedOption)?.label || "",
    [options, selectedOption]
  );

  async function submitVote() {
    if (!votingOpen || submitting || submitted) return;

    if (!selectedOption) {
      setMessage("Choose one response first.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const deviceHint = [
        navigator.userAgent,
        navigator.language,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        `${window.screen.width}x${window.screen.height}`,
      ].join("|");

      const response = await fetch("/api/voting/anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          pollSlug,
          optionId: selectedOption,
          deviceHint,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error || "Unable to record your response.");
        return;
      }

      setSubmitted(true);
      setResults(Array.isArray(payload.results) ? payload.results : []);
      setTotalResponses(Number(payload.totalResponses || 0));
      setMessage("Your response has been recorded.");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="mt-8 overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Response recorded</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                You selected: {selectedLabel}
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                No email or OTP was required. Results below reflect participating Webfit News readers only.
              </p>
            </div>
          </div>

          <div className="mt-7 border-t border-black/10 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">
                  Live reader pulse
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {totalResponses.toLocaleString("en-NZ")} responses
                </p>
              </div>
              <BarChart3 className="text-[#7b1025]" />
            </div>

            <div className="mt-6 space-y-5">
              {results.map((result) => (
                <div key={result.option_id}>
                  <div className="flex items-end justify-between gap-4 text-sm">
                    <p className="font-semibold text-neutral-900">{result.option_label}</p>
                    <p className="font-semibold tabular-nums text-neutral-700">
                      {Number(result.percentage).toFixed(1)}%
                    </p>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-[#7b1025]"
                      style={{ width: `${Math.max(0, Math.min(100, Number(result.percentage)))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">
                    {Number(result.vote_count).toLocaleString("en-NZ")} responses
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-[#f4e9ec] p-2 text-[#7b1025]">
          <Vote size={20} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">
            One question, no sign-in
          </p>
          <p className="mt-1 text-sm text-neutral-500">Choose the answer closest to your view.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {options.map((option) => {
          const active = selectedOption === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setSelectedOption(option.id);
                setMessage("");
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                active
                  ? "border-[#7b1025] bg-[#fbf4f6] ring-2 ring-[#7b1025]/10"
                  : "border-black/10 bg-white hover:border-black/25 hover:bg-neutral-50"
              }`}
            >
              <span className="block text-base font-semibold text-neutral-950">{option.label}</span>
              {option.description && (
                <span className="mt-1 block text-sm leading-6 text-neutral-500">{option.description}</span>
              )}
            </button>
          );
        })}
      </div>

      {message && !submitted && (
        <p className="mt-4 text-sm font-medium text-[#7b1025]">{message}</p>
      )}

      <button
        type="button"
        disabled={!selectedOption || submitting}
        onClick={submitVote}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7b1025] px-6 py-4 font-semibold text-white transition hover:bg-[#5c0b1b] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Vote size={18} />}
        {submitting ? "Recording..." : "Submit my view"}
      </button>

      <p className="mt-4 max-w-3xl text-xs leading-5 text-neutral-500">
        No email address or OTP is collected. A browser token and limited technical signals are used to reduce repeat submissions. This is an open reader poll, not a representative opinion survey.
      </p>
    </section>
  );
}
