"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type PollOption = {
  id: string;
  label: string;
  short_label: string | null;
  description: string | null;
  colour_hex: string | null;
};

type Electorate = {
  id: string;
  name: string;
  electorate_type: "general" | "maori";
};

type PollResult = {
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
  electorates: Electorate[];
};

type Step = "vote" | "verify" | "results";
type MessageType = "error" | "info" | "success";

const RESEND_WAIT_SECONDS = 60;

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical", help: "Needs urgent action now" },
  { value: "high", label: "High", help: "Should be a major priority" },
  { value: "medium", label: "Medium", help: "Important, but not urgent" },
  { value: "low", label: "Low", help: "A concern, but lower priority" },
];

export function ElectorateIssuesForm({
  pollId,
  pollSlug,
  votingOpen,
  options,
  electorates,
}: Props) {
  const [step, setStep] = useState<Step>("vote");
  const [electorateQuery, setElectorateQuery] = useState("");
  const [selectedElectorate, setSelectedElectorate] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [severity, setSeverity] = useState("");
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");
  const [submitting, setSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [electorateResults, setElectorateResults] = useState<PollResult[]>([]);
  const [nationalResults, setNationalResults] = useState<PollResult[]>([]);
  const [electorateResponseCount, setElectorateResponseCount] = useState(0);
  const [nationalResponseCount, setNationalResponseCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("");

  const filteredElectorates = useMemo(() => {
    const query = electorateQuery.trim().toLocaleLowerCase("en-NZ");

    if (!query) return electorates;

    return electorates.filter((electorate) =>
      electorate.name.toLocaleLowerCase("en-NZ").includes(query)
    );
  }, [electorateQuery, electorates]);

  const selectedElectorateRecord = useMemo(
    () => electorates.find((item) => item.name === selectedElectorate),
    [electorates, selectedElectorate]
  );

  const selectedIssue = useMemo(
    () => options.find((option) => option.id === selectedOption),
    [options, selectedOption]
  );

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

    if (!selectedElectorate) {
      showMessage("Please select your electorate.", "error");
      return;
    }

    if (!selectedOption) {
      showMessage("Please select the issue that matters most.", "error");
      return;
    }

    if (!email.trim()) {
      showMessage("Please enter your email address.", "error");
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
          electorateName: selectedElectorate,
          issueSeverity: severity || null,
          participantComment: comment.trim() || null,
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
        showMessage("No verification ID was returned. Please try again.", "error");
        return;
      }

      setVerificationId(result.verificationId);
      setStep("verify");
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

  async function handleVoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestVerification();
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!verificationId) {
      showMessage("Verification session is missing. Request a new code.", "error");
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
          electorateName: selectedElectorate,
          issueSeverity: severity || null,
          participantComment: comment.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Unable to verify your response.", "error");
        return;
      }

      setElectorateResults(
        Array.isArray(result.electorateResults) ? result.electorateResults : []
      );
      setNationalResults(
        Array.isArray(result.nationalResults)
          ? result.nationalResults
          : Array.isArray(result.results)
            ? result.results
            : []
      );
      setElectorateResponseCount(Number(result.electorateResponseCount ?? 0));
      setNationalResponseCount(
        Number(
          result.nationalResponseCount ??
            result.totalVerifiedResponses ??
            0
        )
      );
      setLastUpdated(
        typeof result.lastUpdated === "string"
          ? result.lastUpdated
          : new Date().toISOString()
      );
      setStep("results");
      showMessage("Your response has been verified and counted.", "success");
    } catch {
      showMessage("Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8">
      <Progress step={step} />

      {step === "vote" && (
        <form
          onSubmit={handleVoteSubmit}
          className="mt-5 overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_24px_70px_rgba(30,25,18,0.08)]"
        >
          <div className="border-b border-black/10 bg-[#fbf8f1] px-5 py-5 sm:px-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d741f]">
              Your local priority
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-neutral-950 sm:text-3xl">
              Tell us what needs attention where you live
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Select one electorate and one issue. Your response is counted only
              after email verification.
            </p>
          </div>

          <div className="space-y-8 p-5 sm:p-7">
            <div>
              <SectionLabel
                number="1"
                title="Select your electorate"
                description="Search all 64 general and 7 Māori electorates."
              />

              <div className="relative mt-4">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  value={electorateQuery}
                  onChange={(event) => setElectorateQuery(event.target.value)}
                  placeholder="Search electorate name"
                  className="h-12 w-full rounded-xl border border-black/10 bg-neutral-50 pl-11 pr-4 text-sm outline-none transition focus:border-[#7b1025] focus:bg-white focus:ring-4 focus:ring-[#7b1025]/10"
                />
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-black/10">
                {filteredElectorates.length === 0 ? (
                  <p className="p-5 text-sm text-neutral-500">
                    No electorate matches your search.
                  </p>
                ) : (
                  <div className="divide-y divide-black/5">
                    {filteredElectorates.map((electorate) => {
                      const selected = electorate.name === selectedElectorate;

                      return (
                        <button
                          type="button"
                          key={electorate.id}
                          onClick={() => setSelectedElectorate(electorate.name)}
                          className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition ${
                            selected
                              ? "bg-[#7b1025] text-white"
                              : "bg-white hover:bg-neutral-50"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <MapPin
                              size={17}
                              className={
                                selected ? "text-white" : "text-[#7b1025]"
                              }
                            />
                            <span className="truncate text-sm font-semibold">
                              {electorate.name}
                            </span>
                          </span>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                              selected
                                ? "bg-white/15 text-white"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {electorate.electorate_type === "maori"
                              ? "Māori"
                              : "General"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedElectorateRecord && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                  <CheckCircle2 size={18} />
                  Selected: {selectedElectorateRecord.name}
                </div>
              )}
            </div>

            <div className="h-px bg-black/10" />

            <div>
              <SectionLabel
                number="2"
                title="Choose the biggest issue"
                description="Select the one issue that should receive the highest priority."
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {options.map((option) => {
                  const selected = option.id === selectedOption;

                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => setSelectedOption(option.id)}
                      className={`group rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-[#7b1025] bg-[#7b1025] text-white shadow-lg shadow-[#7b1025]/15"
                          : "border-black/10 bg-white hover:-translate-y-0.5 hover:border-[#b88a2a]/60 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{option.label}</p>
                          {option.description && (
                            <p
                              className={`mt-1.5 text-sm leading-5 ${
                                selected ? "text-white/75" : "text-neutral-500"
                              }`}
                            >
                              {option.description}
                            </p>
                          )}
                        </div>

                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                            selected
                              ? "border-white bg-white text-[#7b1025]"
                              : "border-black/15 text-transparent"
                          }`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-black/10" />

            <div>
              <SectionLabel
                number="3"
                title="Optional context"
                description="These details help explain how strongly people feel."
              />

              <div className="mt-4">
                <label className="text-sm font-semibold text-neutral-900">
                  How urgent is this issue?
                </label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {SEVERITY_OPTIONS.map((option) => {
                    const selected = severity === option.value;

                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() =>
                          setSeverity(selected ? "" : option.value)
                        }
                        className={`rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-[#b88a2a] bg-[#fff7df]"
                            : "border-black/10 hover:bg-neutral-50"
                        }`}
                      >
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className="mt-1 text-xs leading-5 text-neutral-500">
                          {option.help}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="participant-comment"
                    className="text-sm font-semibold text-neutral-900"
                  >
                    Tell us more
                  </label>
                  <span className="text-xs text-neutral-400">
                    {comment.length}/250
                  </span>
                </div>
                <textarea
                  id="participant-comment"
                  value={comment}
                  maxLength={250}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Example: Traffic around the local school is unsafe during morning drop-off."
                  className="mt-2 min-h-28 w-full resize-y rounded-xl border border-black/10 bg-neutral-50 p-4 text-sm leading-6 outline-none transition focus:border-[#7b1025] focus:bg-white focus:ring-4 focus:ring-[#7b1025]/10"
                />
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  Comments are reviewed and are not published automatically.
                </p>
              </div>
            </div>

            <div className="h-px bg-black/10" />

            <div>
              <SectionLabel
                number="4"
                title="Verify your response"
                description="We use a one-time code to reduce duplicate voting."
              />

              <label
                htmlFor="electorate-email"
                className="mt-4 block text-sm font-semibold text-neutral-900"
              >
                Email address
              </label>
              <div className="relative mt-2">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  id="electorate-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-black/10 bg-neutral-50 pl-11 pr-4 text-sm outline-none transition focus:border-[#7b1025] focus:bg-white focus:ring-4 focus:ring-[#7b1025]/10"
                />
              </div>

              <div className="mt-3 flex items-start gap-3 rounded-xl bg-[#faf7ef] p-4">
                <LockKeyhole
                  size={18}
                  className="mt-0.5 shrink-0 text-[#9d741f]"
                />
                <p className="text-xs leading-5 text-neutral-600">
                  Your email is used only to verify one response for this poll.
                  It is not shown publicly or added to a marketing list.
                </p>
              </div>
            </div>

            <Message text={message} type={messageType} />

            <button
              type="submit"
              disabled={submitting || !votingOpen}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#7b1025] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#65101f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending verification code
                </>
              ) : (
                <>
                  Continue to email verification
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {step === "verify" && (
        <form
          onSubmit={handleVerifySubmit}
          className="mt-5 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(30,25,18,0.08)] sm:p-8"
        >
          <button
            type="button"
            onClick={() => {
              setStep("vote");
              setOtp("");
              setMessage("");
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950"
          >
            <ArrowLeft size={17} />
            Change response
          </button>

          <div className="mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-[#7b1025] text-white">
            <Mail size={25} />
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#9d741f]">
            Email verification
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
            Enter your six-digit code
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
            We sent a code to <strong>{email.trim().toLowerCase()}</strong>.
            Verify it to count your response and reveal live results.
          </p>

          <div className="mt-7 rounded-2xl border border-black/10 bg-neutral-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
              Your selection
            </p>
            <p className="mt-2 font-semibold">{selectedElectorate}</p>
            <p className="mt-1 text-sm text-neutral-600">
              {selectedIssue?.label}
            </p>
          </div>

          <label
            htmlFor="electorate-otp"
            className="mt-7 block text-sm font-semibold"
          >
            Verification code
          </label>
          <input
            id="electorate-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            className="mt-2 h-16 w-full rounded-xl border border-black/10 bg-neutral-50 px-4 text-center text-2xl font-semibold tracking-[0.45em] outline-none transition focus:border-[#7b1025] focus:bg-white focus:ring-4 focus:ring-[#7b1025]/10"
          />

          <Message text={message} type={messageType} />

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#7b1025] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#65101f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Verifying response
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Verify and view results
              </>
            )}
          </button>

          <button
            type="button"
            disabled={submitting || resendCountdown > 0}
            onClick={requestVerification}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/10 px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} />
            {resendCountdown > 0
              ? `Resend code in ${resendCountdown}s`
              : "Resend verification code"}
          </button>
        </form>
      )}

      {step === "results" && (
        <div className="mt-5 space-y-5">
          <div className="overflow-hidden rounded-[1.75rem] bg-[#161616] text-white shadow-[0_24px_70px_rgba(20,20,20,0.16)]">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.25fr_0.75fr]">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-emerald-950">
                  <CheckCircle2 size={25} />
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#d7b45b]">
                  Response verified
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  Here is what your electorate is saying
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
                  Your response for {selectedElectorate} has been counted.
                  Results update as more verified participants take part.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/45">
                  Your response
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {selectedIssue?.label}
                </p>
                <p className="mt-2 text-sm text-white/55">
                  {selectedElectorate}
                </p>
              </div>
            </div>
          </div>

          <ResultsPanel
            eyebrow={`${selectedElectorate} results`}
            title="Top issues in your electorate"
            total={electorateResponseCount}
            results={electorateResults}
            selectedOptionId={selectedOption}
            emptyText="Your response may be the first verified response recorded for this electorate."
          />

          <ResultsPanel
            eyebrow="Nationwide comparison"
            title="What participants across New Zealand are prioritising"
            total={nationalResponseCount}
            results={nationalResults}
            selectedOptionId={selectedOption}
            emptyText="National results will appear as verified responses are received."
          />

          <div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-5 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Results reflect voluntary verified participants and are not a
              representative opinion poll.
            </p>
            {lastUpdated && (
              <p className="shrink-0 text-xs text-neutral-400">
                Updated{" "}
                {new Intl.DateTimeFormat("en-NZ", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Pacific/Auckland",
                }).format(new Date(lastUpdated))}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Progress({ step }: { step: Step }) {
  const active = step === "vote" ? 1 : step === "verify" ? 2 : 3;

  const items = [
    { number: 1, label: "Choose electorate and issue" },
    { number: 2, label: "Verify email" },
    { number: 3, label: "View live results" },
  ];

  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-black/10 bg-white">
      {items.map((item) => {
        const complete = active > item.number;
        const current = active === item.number;

        return (
          <div
            key={item.number}
            className={`relative flex min-h-20 flex-col justify-center px-3 py-3 text-center sm:min-h-16 sm:flex-row sm:items-center sm:gap-3 sm:text-left ${
              current ? "bg-[#7b1025] text-white" : "text-neutral-500"
            }`}
          >
            <span
              className={`mx-auto grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold sm:mx-0 ${
                current
                  ? "bg-white text-[#7b1025]"
                  : complete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {complete ? <Check size={14} strokeWidth={3} /> : item.number}
            </span>
            <span className="mt-2 text-[11px] font-semibold leading-4 sm:mt-0 sm:text-xs">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SectionLabel({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7b1025] text-xs font-bold text-white">
        {number}
      </span>
      <div>
        <h3 className="font-semibold text-neutral-950">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

function Message({
  text,
  type,
}: {
  text: string;
  type: MessageType;
}) {
  if (!text) return null;

  const styles =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {text}
    </div>
  );
}

function ResultsPanel({
  eyebrow,
  title,
  total,
  results,
  selectedOptionId,
  emptyText,
}: {
  eyebrow: string;
  title: string;
  total: number;
  results: PollResult[];
  selectedOptionId: string;
  emptyText: string;
}) {
  const ordered = [...results].sort(
    (a, b) => Number(b.vote_count) - Number(a.vote_count)
  );

  return (
    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9d741f]">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
            {title}
          </h3>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-600">
          <BarChart3 size={15} />
          {total.toLocaleString("en-NZ")} verified responses
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
          {emptyText}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {ordered.map((result, index) => {
            const selected = result.option_id === selectedOptionId;
            const percentage = Number(result.percentage ?? 0);

            return (
              <div
                key={result.option_id}
                className={`rounded-2xl border p-4 ${
                  selected
                    ? "border-[#b88a2a] bg-[#fff9e9]"
                    : "border-black/8 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-950">
                        {result.option_label}
                      </p>
                      {selected && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#7b1025]">
                          <Sparkles size={13} />
                          Your selection
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-lg font-semibold text-[#7b1025]">
                      {percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-neutral-400">
                      {Number(result.vote_count).toLocaleString("en-NZ")} votes
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-[#7b1025] transition-all"
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
