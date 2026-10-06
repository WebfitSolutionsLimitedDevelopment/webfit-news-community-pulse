"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, CheckCircle2, ChevronDown, Vote } from "lucide-react";
import { ResultsLockedNotice } from "@/components/results-locked-notice";

type PollOption = {
  id: string;
  label: string;
  short_label: string | null;
  description: string | null;
  logo_url: string | null;
  colour_hex: string | null;
  website_url: string | null;
};

type PollResult = {
  option_id: string;
  option_label: string;
  percentage: number;
};

type ElectoratePartyVoteFormProps = {
  pollId: string;
  pollSlug: string;
  electorateName?: string;
  votingOpen: boolean;
  options: PollOption[];
};

const ELIGIBILITY_OPTIONS = [
  { value: "nz_resident", label: "Living in New Zealand" },
  { value: "eligible_overseas", label: "NZ voter currently overseas" },
  { value: "not_eligible", label: "Not eligible to vote" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const REGION_OPTIONS = [
  "Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay",
  "Taranaki", "Manawatū-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough",
  "West Coast", "Canterbury", "Otago", "Southland", "Overseas", "Prefer not to say",
];

const AGE_OPTIONS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Under 18", "Prefer not to say"];

const ISSUE_OPTIONS = [
  "Cost of living", "Health", "Housing", "Economy and jobs", "Crime and public safety",
  "Education", "Immigration", "Climate and environment", "Māori and Treaty issues",
  "Taxation", "Other", "Prefer not to say",
];

export function ElectoratePartyVoteForm({
  pollId,
  pollSlug,
  votingOpen,
  options,
  electorateName,
}: ElectoratePartyVoteFormProps) {
  const [selectedOption, setSelectedOption] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [eligibilityStatus, setEligibilityStatus] = useState("");
  const [region, setRegion] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [mainIssue, setMainIssue] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [results, setResults] = useState<PollResult[]>([]);

  const selectedOptionLabel = useMemo(
    () => options.find((option) => option.id === selectedOption)?.label ?? "",
    [options, selectedOption],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!votingOpen) return setError("Voting is not currently open.");
    if (!selectedOption) return setError("Tap a party to choose it first.");

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/voting/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          pollSlug,
          electorateName,
          optionId: selectedOption,
          eligibilityStatus: eligibilityStatus || null,
          region: region || null,
          ageRange: ageRange || null,
          mainIssue: mainIssue || null,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        if (result.alreadyVoted) {
          setAlreadyVoted(true);
          setDone(true);
          return;
        }
        setError(result.error || "We couldn't record your vote. Please try again.");
        return;
      }

      setResults(Array.isArray(result.results) ? result.results : []);
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="mt-10 space-y-6">
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-7 shadow-sm md:p-10">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-700 text-white">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-emerald-950">
                {alreadyVoted ? "You've already voted" : "Thanks, your vote is in"}
              </h2>
              <p className="mt-3 leading-7 text-emerald-950/75">
                {alreadyVoted
                  ? "Only one vote per browser is counted in this poll."
                  : <>You voted for <strong>{selectedOptionLabel}</strong>{electorateName ? ` in ${electorateName}` : ""}.</>}
              </p>
            </div>
          </div>
        </div>

        {results.length === 0 && !alreadyVoted && <ResultsLockedNotice />}

        {results.length > 0 && (
          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm md:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b88a2a]">
              Current results
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{electorateName ? `${electorateName} party vote` : "Community Pulse results"}</h2>

            <div className="mt-6 space-y-4">
              {[...options]
                .map((option) => ({
                  option,
                  percentage: Number(results.find((r) => r.option_id === option.id)?.percentage ?? 0),
                }))
                .sort((a, b) => b.percentage - a.percentage)
                .map(({ option, percentage }) => (
                  <article key={option.id} className="rounded-[1.25rem] border border-black/10 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <OptionLogo option={option} size="sm" />
                        <h3 className="truncate font-semibold">{option.label}</h3>
                      </div>
                      <p className="shrink-0 text-xl font-semibold text-[#7b1025]">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#7b1025] to-[#b88a2a]"
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </article>
                ))}
            </div>

            <p className="mt-6 rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
              Results reflect Webfit News readers who chose to take part. They are not a
              scientific estimate of how {electorateName ? `${electorateName} or ` : ""}New Zealand will vote.
            </p>
          </div>
        )}
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm md:p-9"
    >
      <h2 className="text-2xl font-semibold">Pick your party vote{electorateName ? ` in ${electorateName}` : ""}</h2>
      <p className="mt-2 leading-7 text-neutral-500">
        Tap a party, then press Vote. No email or sign-up needed.
      </p>

      <fieldset disabled={!votingOpen || submitting} className="mt-8 grid gap-3 md:grid-cols-2">
        {options.map((option) => {
          const selected = selectedOption === option.id;
          return (
            <label
              key={option.id}
              className={`relative flex cursor-pointer items-center gap-4 rounded-[1.25rem] border p-4 transition ${
                selected
                  ? "border-[#7b1025] bg-[#7b1025]/5 ring-2 ring-[#7b1025]/20"
                  : "border-black/10 bg-white hover:border-[#b88a2a]"
              }`}
            >
              <input
                type="radio"
                name="poll-option"
                value={option.id}
                checked={selected}
                onChange={(event) => {
                  setSelectedOption(event.target.value);
                  setError("");
                }}
                className="sr-only"
              />
              <OptionLogo option={option} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold leading-6 text-neutral-900">{option.label}</h3>
                {option.short_label && (
                  <p className="text-sm font-medium text-[#7b1025]">{option.short_label}</p>
                )}
              </div>
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${
                  selected ? "border-[#7b1025] bg-[#7b1025] text-white" : "border-black/20 text-transparent"
                }`}
              >
                <Check size={16} strokeWidth={3} />
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-neutral-50">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-neutral-700"
        >
          Add a few optional details (you can skip this)
          <ChevronDown size={18} className={`transition ${showDetails ? "rotate-180" : ""}`} />
        </button>

        {showDetails && (
          <div className="grid gap-5 border-t border-black/10 p-5 md:grid-cols-2">
            <SelectField
              label="Which best describes you?"
              value={eligibilityStatus}
              onChange={setEligibilityStatus}
              options={ELIGIBILITY_OPTIONS}
            />
            <SelectField label="Region" value={region} onChange={setRegion} options={REGION_OPTIONS} />
            <SelectField label="Age range" value={ageRange} onChange={setAgeRange} options={AGE_OPTIONS} />
            <SelectField
              label="Issue that matters most to you"
              value={mainIssue}
              onChange={setMainIssue}
              options={ISSUE_OPTIONS}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="sticky bottom-3 mt-6">
        <button
          type="submit"
          disabled={!votingOpen || submitting || !selectedOption}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7b1025] px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-[#5c0b1b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Vote size={20} />
          {!votingOpen
            ? "Voting is closed"
            : submitting
              ? "Saving your vote..."
              : selectedOption
                ? `Vote ${options.find((o) => o.id === selectedOption)?.short_label || selectedOptionLabel}`
                : "Choose a party to vote"}
        </button>
      </div>
    </form>
  );
}

function OptionLogo({ option, size }: { option: PollOption; size: "sm" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const img = size === "lg" ? "h-11 w-11" : "h-8 w-8";
  return (
    <div className={`flex ${box} shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-white`}>
      {option.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={option.logo_url} alt={`${option.label} logo`} className={`${img} object-contain`} />
      ) : (
        <span className="px-1 text-center text-[10px] font-semibold text-neutral-400">
          {option.short_label || option.label}
        </span>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 outline-none transition focus:border-[#7b1025]"
      >
        <option value="">Skip</option>
        {options.map((option) => {
          const o = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
