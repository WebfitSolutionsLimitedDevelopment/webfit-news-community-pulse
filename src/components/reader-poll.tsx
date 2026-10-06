"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, LoaderCircle, Vote } from "lucide-react";

type PollOption = {
  id: string;
  label: string;
  short_label: string | null;
  description: string | null;
};

export type PollResult = {
  option_id: string;
  option_label: string;
  percentage: number;
};

type ReaderPollProps = {
  pollId: string;
  question: string;
  votingOpen: boolean;
  resultsPublic: boolean;
  /** Live results loaded on the server (percentages only); empty when private. */
  initialResults: PollResult[];
  /** True when the server could not load the results. */
  initialResultsError: boolean;
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

function sortResults(rows: unknown): PollResult[] {
  if (!Array.isArray(rows)) return [];
  return [...(rows as PollResult[])].sort(
    (a, b) => Number(b.percentage || 0) - Number(a.percentage || 0),
  );
}

type VoteStatus = {
  selectedOptionId: string;
  results: PollResult[];
  resultsHidden: boolean;
  resultsError?: boolean;
};

/** This browser's existing vote and the results, or null if it has not voted. */
async function fetchVoteStatus(pollId: string): Promise<VoteStatus | null> {
  const response = await fetch(`/api/voting/submit?pollId=${encodeURIComponent(pollId)}`, {
    method: "GET",
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.voted) return null;
  return {
    selectedOptionId: String(data.selectedOptionId || ""),
    results: sortResults(data.results),
    resultsHidden: Boolean(data.resultsHidden),
  };
}

/**
 * Single-question reader poll using the shared open-voting route
 * (/api/voting/submit): one vote per browser per poll, percentages only.
 * Live results are shown to everyone, before and after voting, unless an
 * editor has made the poll's results private.
 */
export function ReaderPoll({
  pollId,
  question,
  votingOpen,
  resultsPublic,
  initialResults,
  initialResultsError,
  options,
}: ReaderPollProps) {
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [results, setResults] = useState<PollResult[]>(() => sortResults(initialResults));
  const [resultsError, setResultsError] = useState(initialResultsError);
  const [hasVoted, setHasVoted] = useState(false);
  const [resultsHidden, setResultsHidden] = useState(!resultsPublic);
  const [checkingVote, setCheckingVote] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // Stable (state setters only), so the mount effect can call it.
  const showVote = useCallback((status: VoteStatus) => {
    setHasVoted(true);
    setSelectedOptionId(status.selectedOptionId);
    setResultsHidden(status.resultsHidden);
    if (status.resultsHidden) {
      setResults([]);
    } else if (status.resultsError) {
      // Vote saved but results failed to load: keep what was shown and say so,
      // rather than showing an empty "no votes yet" state.
      setResultsError(true);
    } else {
      setResults(status.results);
      setResultsError(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function checkExistingVote() {
      try {
        const status = await fetchVoteStatus(pollId);
        if (active && status) showVote(status);
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
  }, [pollId, showVote]);

  const selectedLabel = useMemo(
    () => options.find((option) => option.id === selectedOptionId)?.label || "",
    [options, selectedOptionId],
  );

  async function submitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!votingOpen) {
      setMessage("Voting is not currently open.");
      return;
    }

    if (!selectedOptionId) {
      setMessage("Choose one option before submitting your vote.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/voting/submit", {
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
        // Already voted from this browser: show their choice and the results.
        if (response.status === 409 && data.alreadyVoted) {
          const status = await fetchVoteStatus(pollId);
          if (status) {
            showVote(status);
            return;
          }
        }
        setMessage(data.error || "Unable to record your vote right now.");
        return;
      }

      showVote({
        selectedOptionId,
        results: sortResults(data.results),
        resultsHidden: Boolean(data.resultsHidden),
        resultsError: Boolean(data.resultsError),
      });
    } catch {
      setMessage("Something went wrong while submitting your vote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      {checkingVote ? (
        <section className="rounded-[2rem] border border-black/10 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-medium text-neutral-600">
            <LoaderCircle className="animate-spin" size={20} />
            Checking this browser&apos;s voting status...
          </div>
        </section>
      ) : hasVoted ? (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm sm:p-8">
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
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                This browser has voted in this poll. Thank you for taking part.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <VoteForm
          pollId={pollId}
          question={question}
          votingOpen={votingOpen}
          options={options}
          selectedOptionId={selectedOptionId}
          onSelect={(id) => {
            setSelectedOptionId(id);
            setMessage("");
          }}
          message={message}
          submitting={submitting}
          onSubmit={submitVote}
        />
      )}

      <ResultsPanel
        results={results}
        hidden={resultsHidden}
        error={resultsError}
        highlightOptionId={hasVoted ? selectedOptionId : ""}
      />
    </div>
  );
}

function VoteForm({
  pollId,
  question,
  votingOpen,
  options,
  selectedOptionId,
  onSelect,
  message,
  submitting,
  onSubmit,
}: {
  pollId: string;
  question: string;
  votingOpen: boolean;
  options: PollOption[];
  selectedOptionId: string;
  onSelect: (id: string) => void;
  message: string;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-[#7b1025]/10 p-2.5 text-[#7b1025]">
          <Vote size={22} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d741f]">Vote now</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">{question}</h2>
        </div>
      </div>

      {!votingOpen ? (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          This poll is not currently accepting responses.
        </div>
      ) : (
        <form className="mt-7" onSubmit={onSubmit}>
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
                      name={`poll-${pollId}`}
                      value={option.id}
                      checked={selected}
                      onChange={() => onSelect(option.id)}
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
            No email or sign-up. This browser can submit one response to this poll.
          </p>
        </form>
      )}
    </section>
  );
}

function ResultsPanel({
  results,
  hidden,
  error,
  highlightOptionId,
}: {
  results: PollResult[];
  hidden: boolean;
  error: boolean;
  highlightOptionId: string;
}) {
  const hasVotes = results.some((result) => Number(result.percentage || 0) > 0);

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-2">
        <BarChart3 size={20} className="text-[#7b1025]" />
        <h3 className="text-xl font-semibold">Live reader results</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-neutral-500">
        Percentages reflect participating Webfit News readers. Raw response totals are not displayed.
      </p>

      {hidden ? (
        <p className="mt-6 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-600">
          Results for this poll are not public at the moment.
        </p>
      ) : error ? (
        <p className="mt-6 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-600">
          Results could not be loaded right now. Please refresh the page shortly.
        </p>
      ) : !hasVotes ? (
        <p className="mt-6 rounded-2xl bg-[#fbf8f1] p-5 text-sm font-medium text-neutral-700">
          No votes yet. Be the first.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {results.map((result) => {
            const percentage = Number(result.percentage || 0);
            const mine = result.option_id === highlightOptionId;
            return (
              <div
                key={result.option_id}
                className={mine ? "-mx-3 rounded-2xl bg-[#7b1025]/5 px-3 py-2 ring-1 ring-[#7b1025]/30" : ""}
              >
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className={mine ? "font-semibold text-[#7b1025]" : "font-medium text-neutral-900"}>
                    {result.option_label}
                    {mine && (
                      <span className="ml-2 rounded-full bg-[#7b1025] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                        Your vote
                      </span>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums text-neutral-700">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${
                      mine ? "bg-[#7b1025]" : "bg-[#7b1025]/60"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
