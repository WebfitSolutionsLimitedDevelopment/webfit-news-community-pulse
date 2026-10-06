import { createHmac, randomBytes } from "crypto";

export const VOTER_COOKIE_NAME = "webfit_pulse_voter";
export const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type PublicResultRow = {
  option_id: string;
  option_label: string;
  percentage: number;
};

export function hashValue(value: string) {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) throw new Error("OTP_HASH_SECRET is missing.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function newVoterToken() {
  return randomBytes(32).toString("hex");
}

export function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  return forwardedFor || headers.get("x-real-ip") || "";
}

/**
 * Strip raw vote counts before anything leaves the server.
 * Public pages only ever see option labels and percentages.
 */
export function toPublicResults(
  rows: Array<{ option_id: string; option_label: string; percentage?: number | string | null }>,
): PublicResultRow[] {
  return rows.map((row) => ({
    option_id: row.option_id,
    option_label: row.option_label,
    percentage: Number(row.percentage ?? 0),
  }));
}

/**
 * Minimum-vote thresholds before any result is shown publicly.
 * With very few votes, percentages reveal the totals (100% = 1 vote),
 * so results stay locked until there's a meaningful base.
 */
import { MIN_NATIONAL_VOTES, MIN_POLL_VOTES } from "@/lib/voting-thresholds";
export { MIN_NATIONAL_VOTES, MIN_POLL_VOTES };

type RawResultRow = {
  option_id: string;
  option_label: string;
  vote_count?: number | string | null;
  percentage?: number | string | null;
};

export function totalVotes(rows: Array<{ vote_count?: number | string | null }>) {
  return rows.reduce((sum, row) => sum + Number(row.vote_count ?? 0), 0);
}

/** Percentages only, and nothing at all until the poll reaches the threshold. */
export function gatePublicResults(rows: RawResultRow[], minimum = MIN_POLL_VOTES) {
  const locked = totalVotes(rows) < minimum;
  return { locked, results: locked ? [] : toPublicResults(rows) };
}
