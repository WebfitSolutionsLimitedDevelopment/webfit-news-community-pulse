"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
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

type VotingFormProps = {
  pollId: string;
  pollSlug: string;
  votingOpen: boolean;
  options: PollOption[];
};

type Step = "selection" | "verification" | "success";

const RESEND_WAIT_SECONDS = 60;

export function VotingForm({
  pollId,
  pollSlug,
  votingOpen,
  options,
}: VotingFormProps) {
  const [step, setStep] = useState<Step>("selection");
  const [selectedOption, setSelectedOption] = useState("");
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "info" | "success">(
    "info"
  );
  const [submitting, setSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const selectedOptionLabel = useMemo(() => {
    return options.find((option) => option.id === selectedOption)?.label ?? "";
  }, [options, selectedOption]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

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

  function showMessage(
    text: string,
    type: "error" | "info" | "success" = "info"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  async function requestVerification() {
    if (!votingOpen) {
      showMessage("Voting is not currently open.", "error");
      return;
    }

    if (!selectedOption) {
      showMessage("Please select one option.", "error");
      return;
    }

    if (!email.trim()) {
      showMessage("Please enter your email address.", "error");
      return;
    }

    if (!confirmation) {
      showMessage(
        "Please confirm that you are currently located in New Zealand.",
        "error"
      );
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/voting/request-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pollId,
          pollSlug,
          optionId: selectedOption,
          email: email.trim().toLowerCase(),
          locationDeclaration: confirmation,
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
        `A six-digit verification code has been sent to ${email.trim().toLowerCase()}.`,
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

  async function handleVerificationSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pollId,
          pollSlug,
          optionId: selectedOption,
          email: email.trim().toLowerCase(),
          verificationId,
          otp,
          locationDeclaration: confirmation,
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

      setStep("success");
      setMessage("");
    } catch {
      showMessage("Unable to verify your response. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0 || submitting) {
      return;
    }

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
      <section className="mt-10 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-7 shadow-sm md:p-10">
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
              Your verified response for{" "}
              <strong>{selectedOptionLabel}</strong> has been recorded.
            </p>

            <p className="mt-3 text-sm leading-6 text-emerald-950/65">
              Only one verified response is permitted for each email address
              in this poll.
            </p>
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
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#7b1025] text-white">
            <Mail size={21} />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b88a2a]">
              Email verification
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Enter your six-digit code
            </h2>

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
            Change selection or email
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

          {submitting ? "Verifying..." : "Verify and submit response"}
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
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#7b1025] text-white">
          <CheckCircle2 size={21} />
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Select your response</h2>

          <p className="mt-2 leading-7 text-neutral-500">
            Choose one option and verify your email before your response is
            counted.
          </p>
        </div>
      </div>

      <fieldset disabled={!votingOpen || submitting} className="mt-8 space-y-3">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-start gap-4 rounded-[1.25rem] border p-5 transition ${
              selectedOption === option.id
                ? "border-[#7b1025] bg-[#7b1025]/5 shadow-sm"
                : "border-black/10 hover:border-[#b88a2a]"
            }`}
          >
            <input
              type="radio"
              name="poll-option"
              value={option.id}
              checked={selectedOption === option.id}
              onChange={(event) => setSelectedOption(event.target.value)}
              className="mt-1 h-5 w-5 accent-[#7b1025]"
            />

            <span>
              <span className="block font-semibold">{option.label}</span>

              {option.description && (
                <span className="mt-1 block text-sm leading-6 text-neutral-500">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mt-8 border-t border-black/10 pt-8">
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
            Your email will only be used to verify one response for this poll.
          </span>
        </label>

        <label className="mt-5 flex items-start gap-3 rounded-2xl bg-neutral-50 p-4">
          <input
            type="checkbox"
            checked={confirmation}
            disabled={!votingOpen || submitting}
            onChange={(event) => setConfirmation(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[#7b1025]"
          />

          <span>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <MapPin size={16} className="text-[#7b1025]" />
              New Zealand location confirmation
            </span>

            <span className="mt-1 block text-sm leading-6 text-neutral-500">
              I confirm that I am currently located in New Zealand.
            </span>
          </span>
        </label>

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

function StatusMessage({
  type,
  children,
}: {
  type: "error" | "info" | "success";
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