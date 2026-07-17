"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Mail,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

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
  vote_count: number;
  percentage: number;
};

type VotingFormProps = {
  pollId: string;
  pollSlug: string;
  votingOpen: boolean;
  options: PollOption[];
};

type Step = "selection" | "verification" | "success";

type MessageType = "error" | "info" | "success";

const RESEND_WAIT_SECONDS = 60;

const ELIGIBILITY_OPTIONS = [
  { value: "nz_resident", label: "Currently living in New Zealand" },
  {
    value: "eligible_overseas",
    label: "Eligible New Zealand voter currently overseas",
  },
  { value: "not_eligible", label: "Not eligible to vote" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const REGION_OPTIONS = [
  "Northland",
  "Auckland",
  "Waikato",
  "Bay of Plenty",
  "Gisborne",
  "Hawke's Bay",
  "Taranaki",
  "Manawatū-Whanganui",
  "Wellington",
  "Tasman",
  "Nelson",
  "Marlborough",
  "West Coast",
  "Canterbury",
  "Otago",
  "Southland",
  "Overseas",
  "Prefer not to say",
];

const AGE_OPTIONS = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
  "Under 18",
  "Prefer not to say",
];

const ISSUE_OPTIONS = [
  "Cost of living",
  "Health",
  "Housing",
  "Economy and jobs",
  "Crime and public safety",
  "Education",
  "Immigration",
  "Climate and environment",
  "Māori and Treaty issues",
  "Taxation",
  "Other",
  "Prefer not to say",
];

export function VotingForm({
  pollId,
  pollSlug,
  votingOpen,
  options,
}: VotingFormProps) {
  const [step, setStep] = useState<Step>("selection");
  const [selectedOption, setSelectedOption] = useState("");
  const [email, setEmail] = useState("");
  const [eligibilityStatus, setEligibilityStatus] = useState("");
  const [region, setRegion] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [mainIssue, setMainIssue] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");
  const [submitting, setSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [results, setResults] = useState<PollResult[]>([]);
  const [totalVerifiedResponses, setTotalVerifiedResponses] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("");
  const [voteStatus, setVoteStatus] = useState("");

  const selectedOptionLabel = useMemo(() => {
    return options.find((option) => option.id === selectedOption)?.label ?? "";
  }, [options, selectedOption]);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  function showMessage(text: string, type: MessageType = "info") {
    setMessage(text);
    setMessageType(type);
  }

  async function requestVerification() {
    if (!votingOpen) {
      showMessage("Voting is not currently open.", "error");
      return;
    }

    if (!selectedOption) {
      showMessage("Please select one party or response option.", "error");
      return;
    }

    if (!email.trim()) {
      showMessage("Please enter your email address.", "error");
      return;
    }

    if (!eligibilityStatus) {
      showMessage("Please select the option that best describes you.", "error");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/voting/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          pollSlug,
          optionId: selectedOption,
          email: email.trim().toLowerCase(),
          eligibilityStatus,
          region: region || null,
          ageRange: ageRange || null,
          mainIssue: mainIssue || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(
          result.error || "Unable to send the verification code.",
          "error"
        );
        return;
      }

      if (!result.verificationId) {
        showMessage(
          "The verification request was accepted, but no verification ID was returned.",
          "error"
        );
        return;
      }

      setVerificationId(result.verificationId);
      setStep("verification");
      setResendCountdown(RESEND_WAIT_SECONDS);
      showMessage(
        `A six-digit verification code has been sent to ${email
          .trim()
          .toLowerCase()}.`,
        "success"
      );
    } catch {
      showMessage("Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestVerification();
  }

  async function handleVerificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!verificationId) {
      showMessage(
        "Verification session is missing. Please request a new code.",
        "error"
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      showMessage("Enter the six-digit code from your email.", "error");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/voting/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          pollSlug,
          optionId: selectedOption,
          email: email.trim().toLowerCase(),
          verificationId,
          otp,
          eligibilityStatus,
          region: region || null,
          ageRange: ageRange || null,
          mainIssue: mainIssue || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(
          result.error || "The verification code could not be confirmed.",
          "error"
        );
        return;
      }

      setResults(Array.isArray(result.results) ? result.results : []);
      setTotalVerifiedResponses(Number(result.totalVerifiedResponses ?? 0));
      setLastUpdated(String(result.lastUpdated || ""));
      setVoteStatus(String(result.status || ""));
      setStep("success");
      setMessage("");
    } catch {
      showMessage("Unable to verify your response. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0 || submitting) return;
    setOtp("");
    await requestVerification();
  }

  function handleChangeSelection() {
    setStep("selection");
    setVerificationId("");
    setOtp("");
    setMessage("");
    setResendCountdown(0);
  }

  if (step === "success") {
    return (
      <section className="mt-10 space-y-6">
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-7 shadow-sm md:p-10">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-700 text-white">
              <CheckCircle2 size={24} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                Response verified
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">
                Thank you for participating
              </h2>
              <p className="mt-4 leading-7 text-emerald-950/75">
                Your verified response for <strong>{selectedOptionLabel}</strong>{" "}
                has been recorded.
              </p>
              {voteStatus === "flagged" && (
                <p className="mt-3 text-sm leading-6 text-amber-900">
                  Your response was received and is awaiting an integrity review.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm md:p-9">
          <div className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b88a2a]">
                Current participant results
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Community Pulse results</h2>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
              <Users size={18} className="text-[#7b1025]" />
              {totalVerifiedResponses.toLocaleString()} verified responses
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {options.map((option) => {
              const result = results.find((item) => item.option_id === option.id);
              const percentage = Number(result?.percentage ?? 0);
              const voteCount = Number(result?.vote_count ?? 0);

              return (
                <article
                  key={option.id}
                  className="rounded-[1.25rem] border border-black/10 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-white">
                        {option.logo_url ? (
                          <img
                            src={option.logo_url}
                            alt={`${option.label} logo`}
                            className="h-9 w-9 object-contain"
                          />
                        ) : (
                          <span className="px-1 text-center text-[10px] font-semibold text-neutral-400">
                            {option.short_label || option.label}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{option.label}</h3>
                        <p className="text-xs text-neutral-500">
                          {voteCount.toLocaleString()} responses
                        </p>
                      </div>
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
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
            Results reflect verified participants in this Webfit News Community
            Pulse poll. They are not a scientifically representative estimate of
            all New Zealand voters.
            {lastUpdated && (
              <span className="mt-1 block text-xs text-neutral-500">
                Last updated: {new Date(lastUpdated).toLocaleString("en-NZ")}
              </span>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (step === "verification") {
    return (
      <form
        onSubmit={handleVerificationSubmit}
        className="mt-10 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm md:p-9"
      >
        <ProcessSteps activeStep={3} />

        <div className="mt-8 flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#7b1025] text-white">
            <Mail size={21} />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b88a2a]">
              Email verification
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Enter your six-digit code</h2>
            <p className="mt-2 leading-7 text-neutral-500">
              We sent a verification code to{" "}
              <strong className="text-neutral-700">{email}</strong>.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-black/10 bg-neutral-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
            Your selected response
          </p>
          <p className="mt-2 text-lg font-semibold">{selectedOptionLabel}</p>
          <button
            type="button"
            onClick={handleChangeSelection}
            className="mt-3 text-sm font-semibold text-[#7b1025] hover:underline"
          >
            Change selection or details
          </button>
        </div>

        <label className="mt-8 block">
          <span className="text-sm font-semibold">Verification code</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            disabled={submitting}
            onChange={(event) => {
              const numericValue = event.target.value.replace(/\D/g, "");
              setOtp(numericValue.slice(0, 6));
            }}
            placeholder="000000"
            className="mt-3 w-full rounded-2xl border border-black/15 px-4 py-4 text-center text-3xl font-semibold tracking-[0.45em] outline-none transition focus:border-[#7b1025]"
          />
          <span className="mt-2 flex items-center gap-2 text-xs leading-5 text-neutral-500">
            <Clock3 size={14} />
            The code expires after a short period.
          </span>
        </label>

        {message && <StatusMessage type={messageType}>{message}</StatusMessage>}

        <button
          type="submit"
          disabled={submitting || otp.length !== 6}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7b1025] px-6 py-3.5 font-semibold text-white transition hover:bg-[#5c0b1b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck size={18} />
          {submitting ? "Verifying..." : "Verify vote and view results"}
        </button>

        <button
          type="button"
          disabled={resendCountdown > 0 || submitting}
          onClick={handleResend}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 px-6 py-3 font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={17} />
          {resendCountdown > 0
            ? `Resend code in ${resendCountdown}s`
            : "Resend verification code"}
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSelectionSubmit}
      className="mt-10 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm md:p-9"
    >
      <ProcessSteps activeStep={1} />

      <details className="group mt-8 rounded-2xl border border-black/10 bg-neutral-50 p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
          <span className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[#7b1025]" />
            What is the party vote?
          </span>
          <ChevronDown className="transition group-open:rotate-180" size={18} />
        </summary>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Under New Zealand&apos;s MMP system, your party vote largely determines
          each party&apos;s share of seats in Parliament. Your electorate vote
          chooses the person you want to represent your local electorate.
        </p>
      </details>

      <div className="mt-8 flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#7b1025] text-white">
          <CheckCircle2 size={21} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Select your party vote preference</h2>
          <p className="mt-2 leading-7 text-neutral-500">
            Choose one party or response option. Your selection is not recorded
            until you verify the code sent to your email.
          </p>
        </div>
      </div>

      <fieldset
        disabled={!votingOpen || submitting}
        className="mt-8 grid gap-4 md:grid-cols-2"
      >
        {options.map((option) => {
          const selected = selectedOption === option.id;

          return (
            <label
              key={option.id}
              className={`group relative cursor-pointer rounded-[1.5rem] border p-5 transition ${
                selected
                  ? "border-[#7b1025] bg-[#7b1025]/5 shadow-md ring-2 ring-[#7b1025]/20"
                  : "border-black/10 bg-white hover:-translate-y-0.5 hover:border-[#b88a2a] hover:shadow-lg"
              }`}
            >
              <input
                type="radio"
                name="poll-option"
                value={option.id}
                checked={selected}
                onChange={(event) => setSelectedOption(event.target.value)}
                className="sr-only"
              />

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-white">
                  {option.logo_url ? (
                    <img
                      src={option.logo_url}
                      alt={`${option.label} logo`}
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <span className="px-2 text-center text-xs font-semibold text-neutral-400">
                      {option.short_label || option.label}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold leading-6 text-neutral-900">
                    {option.label}
                  </h3>
                  {option.short_label && (
                    <p className="mt-1 text-sm font-medium text-[#7b1025]">
                      {option.short_label}
                    </p>
                  )}
                </div>

                <div
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${
                    selected
                      ? "border-[#7b1025] bg-[#7b1025] text-white"
                      : "border-black/20 bg-white text-transparent"
                  }`}
                >
                  <Check size={16} strokeWidth={3} />
                </div>
              </div>

              {selected && (
                <p className="mt-4 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
                  Selected
                </p>
              )}
            </label>
          );
        })}
      </fieldset>

      <div className="mt-8 border-t border-black/10 pt-8">
        <div className="mb-6 rounded-[1.25rem] border border-[#b88a2a]/30 bg-[#f8f3e7] p-4">
          <p className="font-semibold text-neutral-900">Why do we need your email?</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            We send a one-time verification code to reduce duplicate responses.
            Your email will not appear with your vote and will not be added to a
            mailing list.
          </p>
        </div>

        <label className="block">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Mail size={17} className="text-[#7b1025]" />
            Email address
          </span>
          <input
            type="email"
            required
            disabled={!votingOpen || submitting}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-3 w-full rounded-2xl border border-black/15 px-4 py-3 outline-none transition focus:border-[#7b1025]"
          />
          <span className="mt-2 block text-xs leading-5 text-neutral-500">
            Used only to verify one response for this poll.
          </span>
        </label>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">Which best describes you?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ELIGIBILITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-2xl border p-4 text-sm transition ${
                  eligibilityStatus === option.value
                    ? "border-[#7b1025] bg-[#7b1025]/5"
                    : "border-black/10 hover:border-[#b88a2a]"
                }`}
              >
                <input
                  type="radio"
                  name="eligibility-status"
                  value={option.value}
                  checked={eligibilityStatus === option.value}
                  onChange={(event) => setEligibilityStatus(event.target.value)}
                  className="mr-2 accent-[#7b1025]"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-neutral-50 p-5">
          <p className="font-semibold">Optional participant details</p>
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            These answers help Webfit News understand who is participating and
            which issues matter most. You may leave any of them blank.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <SelectField
              label="Region"
              value={region}
              onChange={setRegion}
              options={REGION_OPTIONS}
            />
            <SelectField
              label="Age range"
              value={ageRange}
              onChange={setAgeRange}
              options={AGE_OPTIONS}
            />
          </div>

          <div className="mt-5">
            <SelectField
              label="Which issue will most influence your party vote?"
              value={mainIssue}
              onChange={setMainIssue}
              options={ISSUE_OPTIONS}
            />
          </div>
        </div>

        {message && <StatusMessage type={messageType}>{message}</StatusMessage>}

        <button
          type="submit"
          disabled={!votingOpen || submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7b1025] px-6 py-3.5 font-semibold text-white transition hover:bg-[#5c0b1b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck size={18} />
          {submitting ? "Sending code..." : "Continue to email verification"}
        </button>
      </div>
    </form>
  );
}

function ProcessSteps({ activeStep }: { activeStep: number }) {
  const steps = ["Choose party", "Enter email", "Verify vote", "View results"];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const active = stepNumber <= activeStep;

        return (
          <div
            key={label}
            className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${
              active
                ? "bg-[#7b1025] text-white"
                : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {label}
          </div>
        );
      })}
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
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 outline-none transition focus:border-[#7b1025]"
      >
        <option value="">Prefer not to answer</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusMessage({
  type,
  children,
}: {
  type: MessageType;
  children: React.ReactNode;
}) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return (
    <p
      className={`mt-5 rounded-2xl border px-4 py-3 text-sm leading-6 ${styles[type]}`}
    >
      {children}
    </p>
  );
}
