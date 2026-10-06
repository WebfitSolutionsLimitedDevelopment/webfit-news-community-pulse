"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type PollOption = {
  id: string;
  label: string;
  short_label?: string | null;
  description?: string | null;
};

type ResultRow = {
  option_id: string;
  option_label: string;
  percentage: number;
};

type PressureResultRow = {
  value: string;
  label: string;
  percentage: number;
};

type HouseholdFinanceFormProps = {
  pollId: string;
  pollSlug: string;
  votingOpen: boolean;
  options: PollOption[];
};

const pressures = [
  { value: "groceries", label: "Groceries" },
  { value: "rent_or_mortgage", label: "Rent or mortgage" },
  {
    value: "electricity_and_utilities",
    label: "Electricity and utilities",
  },
  { value: "petrol_and_transport", label: "Petrol and transport" },
  { value: "insurance", label: "Insurance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "childcare", label: "Childcare" },
  { value: "education_costs", label: "Education costs" },
  { value: "interest_rates", label: "Interest rates" },
  {
    value: "income_not_keeping_up",
    label: "Income has not kept up with costs",
  },
  {
    value: "job_loss_or_reduced_hours",
    label: "Lost job or reduced work hours",
  },
  { value: "business_slowdown", label: "Business slowdown" },
  { value: "other", label: "Other" },
];

function optionIcon(label: string) {
  const normalised = label.toLowerCase();

  if (normalised.includes("better")) {
    return TrendingUp;
  }

  if (normalised.includes("worse")) {
    return TrendingDown;
  }

  return WalletCards;
}

function formatPercentage(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function HouseholdFinanceForm({
  pollId,
  pollSlug,
  votingOpen,
  options,
}: HouseholdFinanceFormProps) {
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [financialPressure, setFinancialPressure] = useState("");
  const [participantComment, setParticipantComment] = useState("");
  const [step, setStep] = useState<"vote" | "results">("vote");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [pressureResults, setPressureResults] = useState<PressureResultRow[]>(
    []
  );
  const [lastUpdated, setLastUpdated] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selectedOptionId),
    [options, selectedOptionId]
  );

  async function submitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedOptionId) {
      setError("Please select the option that best reflects your household.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/voting/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          pollSlug,
          optionId: selectedOptionId,
          financialPressure: financialPressure || null,
          participantComment: participantComment.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "We couldn't record your vote. Please try again.");
      }

      setResults(data.nationalResults || data.results || []);
      setPressureResults(data.pressureResults || []);
      setLastUpdated(data.lastUpdated || new Date().toISOString());
      setStep("results");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't record your vote. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!votingOpen) {
    return null;
  }

  if (step === "results") {
    return (
      <section className="mt-8 space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-white shadow-xl shadow-black/5">
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-7 text-white sm:px-8">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-1 shrink-0" size={30} />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-100">
                  Vote recorded
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                  Thank you for participating
                </h2>
                <p className="mt-3 text-emerald-50">
                  Your vote for{" "}
                  <strong>{selectedOption?.label}</strong> is included below.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">
                  Household position
                </p>
                <h3 className="mt-2 text-2xl font-semibold">
                  Current participant results
                </h3>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              {results.map((row) => (
                <div key={row.option_id}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold">{row.option_label}</span>
                    <span className="text-neutral-500">
                      {formatPercentage(row.percentage)}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7b1025] to-[#b88a2a]"
                      style={{
                        width: `${Math.min(
                          Math.max(Number(row.percentage || 0), 0),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">
                  Financial pressure
                </p>
                <h3 className="mt-2 text-2xl font-semibold">
                  Biggest household pressures
                </h3>
              </div>
            </div>

            {pressureResults.some((row) => row.percentage > 0) ? (
              <div className="mt-7 space-y-5">
                {pressureResults
                  .filter((row) => row.percentage > 0)
                  .map((row) => (
                    <div key={row.value}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold">{row.label}</span>
                        <span className="text-neutral-500">
                          {formatPercentage(row.percentage)}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#9d741f] to-[#d6b25d]"
                          style={{
                            width: `${Math.min(
                              Math.max(Number(row.percentage || 0), 0),
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="mt-7 rounded-2xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
                No financial-pressure answers are available yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-[#f6f1e7] p-5 text-sm leading-6 text-neutral-600">
          Results reflect readers who chose to take part in this Webfit News
          Community Pulse poll. They are not a scientifically representative
          estimate of all New Zealand households.
          {lastUpdated && (
            <span className="mt-2 block text-xs text-neutral-500">
              Last updated: {new Date(lastUpdated).toLocaleString("en-NZ")}
            </span>
          )}
        </div>
      </section>
    );
  }


  return (
    <section className="mt-8">
      <div className="overflow-hidden rounded-[2.25rem] border border-black/10 bg-white shadow-2xl shadow-black/5">
        <div className="border-b border-black/10 bg-gradient-to-br from-[#7b1025] via-[#8f1830] to-[#aa7a20] px-6 py-8 text-white sm:px-9 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f3d995]">
                Household finance pulse
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                How has your household financial position changed?
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-white/80">
                Select one response and press Submit. No email or sign-up
                needed.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <CircleDollarSign size={24} />
              <div>
                <p className="font-semibold">Under one minute</p>
                <p className="text-xs text-white/70">Anonymous public results</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={submitVote} className="p-6 sm:p-9">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">
              Step 1
            </p>
            <h3 className="mt-2 text-2xl font-semibold">
              Compared with one year ago, how is your household doing?
            </h3>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {options.map((option) => {
                const Icon = optionIcon(option.label);
                const selected = selectedOptionId === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedOptionId(option.id)}
                    className={`group min-h-40 rounded-[1.5rem] border p-5 text-left transition ${
                      selected
                        ? "border-[#7b1025] bg-[#fbf5f6] shadow-lg ring-2 ring-[#7b1025]/15"
                        : "border-black/10 bg-white hover:-translate-y-0.5 hover:border-[#b88a2a] hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={`grid h-11 w-11 place-items-center rounded-xl ${
                          selected
                            ? "bg-[#7b1025] text-white"
                            : "bg-[#f6f1e7] text-[#7b1025]"
                        }`}
                      >
                        <Icon size={22} />
                      </div>

                      <div
                        className={`grid h-6 w-6 place-items-center rounded-full border ${
                          selected
                            ? "border-[#7b1025] bg-[#7b1025] text-white"
                            : "border-black/20"
                        }`}
                      >
                        {selected && <CheckCircle2 size={16} />}
                      </div>
                    </div>

                    <p className="mt-5 text-lg font-semibold">{option.label}</p>
                    {option.description && (
                      <p className="mt-2 text-sm leading-6 text-neutral-500">
                        {option.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-9 border-t border-black/10 pt-9">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">
              Step 2 · Optional
            </p>
            <h3 className="mt-2 text-2xl font-semibold">
              What is creating the greatest pressure?
            </h3>

            <select
              value={financialPressure}
              onChange={(event) => setFinancialPressure(event.target.value)}
              className="mt-5 w-full rounded-2xl border border-black/15 bg-white px-5 py-4 text-neutral-800 outline-none transition focus:border-[#7b1025] focus:ring-4 focus:ring-[#7b1025]/10"
            >
              <option value="">Prefer not to answer</option>
              {pressures.map((pressure) => (
                <option key={pressure.value} value={pressure.value}>
                  {pressure.label}
                </option>
              ))}
            </select>

            <label
              htmlFor="household-comment"
              className="mt-6 block text-sm font-semibold text-neutral-800"
            >
              Tell us why you chose your answer
              <span className="ml-2 font-normal text-neutral-400">
                Optional
              </span>
            </label>
            <textarea
              id="household-comment"
              value={participantComment}
              onChange={(event) =>
                setParticipantComment(event.target.value.slice(0, 250))
              }
              rows={4}
              placeholder="Share a short comment about the financial change your household has experienced."
              className="mt-2 w-full resize-none rounded-2xl border border-black/15 bg-white px-5 py-4 outline-none transition focus:border-[#7b1025] focus:ring-4 focus:ring-[#7b1025]/10"
            />
            <p className="mt-2 text-right text-xs text-neutral-400">
              {participantComment.length}/250
            </p>
          </div>


          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7b1025] px-6 py-4 font-semibold text-white transition hover:bg-[#650d1f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <ChevronRight size={20} />
            )}
            Submit my vote
          </button>
        </form>
      </div>
    </section>
  );
}
