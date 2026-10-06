"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  X,
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
  percentage: number;
};

type Props = {
  pollId: string;
  pollSlug: string;
  votingOpen: boolean;
  options: PollOption[];
  electorates: Electorate[];
};

type Step = "vote" | "results";
type MessageType = "error" | "info" | "success";

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical", help: "Urgent action needed" },
  { value: "high", label: "High", help: "Major local priority" },
  { value: "medium", label: "Medium", help: "Important, not urgent" },
  { value: "low", label: "Low", help: "Lower priority concern" },
];

function normalise(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-NZ")
    .replace(/[^a-z0-9]/g, "");
}

function fuzzyScore(name: string, query: string) {
  const n = normalise(name);
  const q = normalise(query);

  if (!q) return 0;
  if (n === q) return 1000;
  if (n.startsWith(q)) return 900;
  if (n.includes(q)) return 800 - n.indexOf(q);

  let qi = 0;
  let first = -1;
  let last = -1;

  for (let i = 0; i < n.length && qi < q.length; i += 1) {
    if (n[i] === q[qi]) {
      if (first === -1) first = i;
      last = i;
      qi += 1;
    }
  }

  if (qi !== q.length) return -1;

  return 600 - (last - first) - first;
}

export function ElectorateIssuesForm({
  pollId,
  pollSlug,
  votingOpen,
  options,
  electorates,
}: Props) {
  const [step, setStep] = useState<Step>("vote");
  const [electorateQuery, setElectorateQuery] = useState("");
  const [electorateOpen, setElectorateOpen] = useState(false);
  const [selectedElectorate, setSelectedElectorate] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [severity, setSeverity] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");
  const [submitting, setSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [electorateResults, setElectorateResults] = useState<PollResult[]>([]);
  const [nationalResults, setNationalResults] = useState<PollResult[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [resultsHidden, setResultsHidden] = useState(false);

  const electorateBoxRef = useRef<HTMLDivElement>(null);

  const filteredElectorates = useMemo(() => {
    const query = electorateQuery.trim();

    if (!query) return electorates.slice(0, 12);

    return electorates
      .map((electorate) => ({
        electorate,
        score: fuzzyScore(electorate.name, query),
      }))
      .filter((item) => item.score >= 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.electorate.name.localeCompare(b.electorate.name, "en-NZ")
      )
      .slice(0, 12)
      .map((item) => item.electorate);
  }, [electorateQuery, electorates]);

  const selectedIssue = useMemo(
    () => options.find((option) => option.id === selectedOption),
    [options, selectedOption]
  );

  const completionCount =
    Number(Boolean(selectedElectorate)) + Number(Boolean(selectedOption));

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        electorateBoxRef.current &&
        !electorateBoxRef.current.contains(event.target as Node)
      ) {
        setElectorateOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);


  function showMessage(text: string, type: MessageType = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function selectElectorate(name: string) {
    setSelectedElectorate(name);
    setElectorateQuery(name);
    setElectorateOpen(false);
    setMessage("");
  }

  async function submitVote() {
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

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/voting/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          pollSlug,
          optionId: selectedOption,
          electorateName: selectedElectorate,
          issueSeverity: severity || null,
          participantComment: comment.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "We couldn't record your vote. Please try again.", "error");
        return;
      }

      setResultsHidden(Boolean(result.resultsHidden));
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
      setLastUpdated(
        typeof result.lastUpdated === "string"
          ? result.lastUpdated
          : new Date().toISOString()
      );
      setStep("results");
      showMessage("Your vote has been counted.", "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      showMessage("Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitVote();
  }

  return (
    <section className="mt-6 sm:mt-8">
      <StepHeader step={step} />

      {step === "vote" && (
        <form
          onSubmit={handleVoteSubmit}
          className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="overflow-hidden rounded-3xl border border-black/8 bg-white shadow-[0_18px_60px_rgba(27,22,16,0.07)]">
            <div className="border-b border-black/8 px-5 py-5 sm:px-7 sm:py-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9d741f]">
                Your local voice
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Tell us what matters most
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                Choose your electorate and one issue, then submit. No email
                or sign-up needed.
              </p>
            </div>

            <div className="space-y-7 p-5 sm:p-7">
              <section>
                <FieldHeading
                  number="1"
                  title="Your electorate"
                  text="Start typing and select the correct electorate."
                />

                <div ref={electorateBoxRef} className="relative mt-4">
                  <div
                    className={`flex min-h-13 items-center gap-3 rounded-2xl border bg-white px-4 transition ${
                      electorateOpen
                        ? "border-[#7b1025] ring-4 ring-[#7b1025]/8"
                        : "border-black/10"
                    }`}
                  >
                    <Search size={18} className="shrink-0 text-neutral-400" />
                    <input
                      value={electorateQuery}
                      onFocus={() => setElectorateOpen(true)}
                      onChange={(event) => {
                        setElectorateQuery(event.target.value);
                        setSelectedElectorate("");
                        setElectorateOpen(true);
                      }}
                      placeholder="Search electorate, e.g. Manurewa"
                      className="h-12 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
                    />
                    {electorateQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setElectorateQuery("");
                          setSelectedElectorate("");
                          setElectorateOpen(true);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                        aria-label="Clear electorate search"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {electorateOpen && (
                    <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-black/10 bg-white p-2 shadow-[0_20px_50px_rgba(20,20,20,0.16)]">
                      {filteredElectorates.length === 0 ? (
                        <div className="px-4 py-5 text-sm text-neutral-500">
                          No electorate matches your search.
                        </div>
                      ) : (
                        filteredElectorates.map((electorate) => (
                          <button
                            type="button"
                            key={electorate.id}
                            onClick={() => selectElectorate(electorate.name)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#f7f2e8]"
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7b1025]/8 text-[#7b1025]">
                                <MapPin size={17} />
                              </span>
                              <span className="truncate text-sm font-semibold">
                                {electorate.name}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                              {electorate.electorate_type === "maori"
                                ? "Māori"
                                : "General"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedElectorate && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={17} />
                    {selectedElectorate} selected
                  </div>
                )}
              </section>

              <div className="h-px bg-black/8" />

              <section>
                <FieldHeading
                  number="2"
                  title="Biggest local issue"
                  text="Select the one issue that deserves the highest priority."
                />

                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {options.map((option) => {
                    const selected = option.id === selectedOption;

                    return (
                      <button
                        type="button"
                        key={option.id}
                        onClick={() => {
                          setSelectedOption(option.id);
                          setMessage("");
                        }}
                        className={`group flex min-h-20 items-start gap-3 rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-[#7b1025] bg-[#7b1025] text-white shadow-[0_10px_25px_rgba(123,16,37,0.16)]"
                            : "border-black/8 bg-white hover:border-[#b88a2a]/60 hover:bg-[#fcfaf5]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                            selected
                              ? "border-white bg-white text-[#7b1025]"
                              : "border-black/15 text-transparent"
                          }`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">
                            {option.label}
                          </span>
                          {option.description && (
                            <span
                              className={`mt-1 block text-xs leading-5 ${
                                selected ? "text-white/70" : "text-neutral-500"
                              }`}
                            >
                              {option.description}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="h-px bg-black/8" />

              <section>
                <button
                  type="button"
                  onClick={() => setShowOptional((value) => !value)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <div>
                    <p className="font-semibold text-neutral-950">
                      Add optional context
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Tell us how urgent this issue feels locally.
                    </p>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-neutral-400 transition ${
                      showOptional ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showOptional && (
                  <div className="mt-5 space-y-5">
                    <div>
                      <label className="text-sm font-semibold text-neutral-900">
                        Urgency
                      </label>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {SEVERITY_OPTIONS.map((option) => {
                          const selected = severity === option.value;

                          return (
                            <button
                              type="button"
                              key={option.value}
                              onClick={() =>
                                setSeverity(selected ? "" : option.value)
                              }
                              className={`rounded-xl border px-3 py-3 text-left transition ${
                                selected
                                  ? "border-[#b88a2a] bg-[#fff7df]"
                                  : "border-black/8 bg-neutral-50 hover:bg-white"
                              }`}
                            >
                              <span className="block text-sm font-semibold">
                                {option.label}
                              </span>
                              <span className="mt-1 block text-[11px] leading-4 text-neutral-500">
                                {option.help}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <label
                          htmlFor="participant-comment"
                          className="text-sm font-semibold text-neutral-900"
                        >
                          Local context
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
                        placeholder="Briefly explain what you are seeing in your area."
                        className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-black/10 bg-neutral-50 p-4 text-sm leading-6 outline-none transition focus:border-[#7b1025] focus:bg-white focus:ring-4 focus:ring-[#7b1025]/8"
                      />
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-black/8 bg-[#171717] p-5 text-white shadow-[0_18px_60px_rgba(20,20,20,0.14)] sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d8b760]">
                Complete your response
              </p>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <SummaryRow
                  label="Electorate"
                  value={selectedElectorate || "Not selected"}
                />
                <div className="my-3 h-px bg-white/10" />
                <SummaryRow
                  label="Issue"
                  value={selectedIssue?.label || "Not selected"}
                />
              </div>


              <Message text={message} type={messageType} dark />

              <button
                type="submit"
                disabled={submitting || !votingOpen}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d6b45d] px-5 py-3.5 text-sm font-bold text-[#251c0b] transition hover:bg-[#e3c777] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving your vote
                  </>
                ) : (
                  <>
                    Submit my vote
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-[11px] leading-5 text-white/40">
                {completionCount}/2 required details completed
              </p>
            </div>
          </aside>
        </form>
      )}


      {step === "results" && (
        <div className="mt-5 space-y-5">
          <div className="overflow-hidden rounded-3xl bg-[#171717] p-6 text-white shadow-[0_18px_60px_rgba(20,20,20,0.14)] sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-end">
              <div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400 text-emerald-950">
                  <CheckCircle2 size={24} />
                </div>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#d8b760]">
                  Vote recorded
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  {resultsHidden ? "Thank you for taking part" : "Your local result is live"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                  Your response for {selectedElectorate} has been counted.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <SummaryRow label="Your selection" value={selectedIssue?.label || ""} />
              </div>
            </div>
          </div>

          {resultsHidden ? (
            <p className="rounded-2xl border border-black/8 bg-white p-5 text-sm leading-6 text-neutral-600">
              Results for this poll are not public at the moment.
            </p>
          ) : (
            <>
              <ResultsPanel
                eyebrow={selectedElectorate}
                title="Top issues in your electorate"
                results={electorateResults}
                selectedOptionId={selectedOption}
                emptyText="Your vote may be the first one for this electorate."
              />

              <ResultsPanel
                eyebrow="New Zealand"
                title="Nationwide comparison"
                results={nationalResults}
                selectedOptionId={selectedOption}
                emptyText="National results will appear as votes come in."
              />
            </>
          )}

          <div className="flex flex-col gap-2 rounded-2xl border border-black/8 bg-white p-4 text-xs leading-5 text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Results reflect readers who chose to take part and are not a
              representative scientific opinion poll.
            </p>
            {lastUpdated && (
              <p className="shrink-0 text-neutral-400">
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

function StepHeader({ step }: { step: Step }) {
  const active = step === "results" ? 2 : 1;
  const items = ["Choose", "Results"];

  return (
    <div className="rounded-2xl border border-black/8 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        {items.map((label, index) => {
          const number = index + 1;
          const current = number === active;
          const complete = number < active;

          return (
            <div
              key={label}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold transition ${
                current
                  ? "bg-[#7b1025] text-white"
                  : complete
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-neutral-400"
              }`}
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                  current
                    ? "bg-white text-[#7b1025]"
                    : complete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {complete ? <Check size={13} strokeWidth={3} /> : number}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldHeading({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7b1025] text-xs font-bold text-white">
        {number}
      </span>
      <div>
        <h3 className="font-semibold text-neutral-950">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-neutral-500">{text}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-45">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold leading-5">{value}</p>
    </div>
  );
}

function Message({
  text,
  type,
  dark = false,
}: {
  text: string;
  type: MessageType;
  dark?: boolean;
}) {
  if (!text) return null;

  if (dark) {
    return (
      <div
        className={`mt-4 flex items-start gap-2 rounded-xl px-3.5 py-3 text-xs leading-5 ${
          type === "error"
            ? "bg-red-500/15 text-red-200"
            : type === "success"
              ? "bg-emerald-500/15 text-emerald-200"
              : "bg-white/8 text-white/70"
        }`}
      >
        <CircleAlert size={15} className="mt-0.5 shrink-0" />
        {text}
      </div>
    );
  }

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
  results,
  selectedOptionId,
  emptyText,
}: {
  eyebrow: string;
  title: string;
  results: PollResult[];
  selectedOptionId: string;
  emptyText: string;
}) {
  const ordered = [...results].sort(
    (a, b) => Number(b.percentage) - Number(a.percentage)
  );

  return (
    <section className="rounded-3xl border border-black/8 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9d741f]">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            {title}
          </h3>
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
          {emptyText}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
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
