import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  VOTER_COOKIE_MAX_AGE,
  VOTER_COOKIE_NAME,
  getClientIp,
  hashValue,
  newVoterToken,
  toPublicResults,
} from "@/lib/voting";

/**
 * Open voting: no email, no OTP, no magic link.
 * One response per browser per poll (httpOnly cookie token), plus a
 * per-network rate limit to blunt scripted flooding.
 */

const MAX_IP_VOTES_PER_10_MIN = 30;

const VALID_ELIGIBILITY_STATUSES = [
  "nz_resident",
  "eligible_overseas",
  "not_eligible",
  "prefer_not_to_say",
] as const;

const VALID_REGIONS = [
  "Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay",
  "Taranaki", "Manawatū-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough",
  "West Coast", "Canterbury", "Otago", "Southland", "Overseas", "Prefer not to say",
] as const;

const VALID_AGE_RANGES = [
  "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Under 18", "Prefer not to say",
] as const;

const VALID_MAIN_ISSUES = [
  "Cost of living", "Health", "Housing", "Economy and jobs", "Crime and public safety",
  "Education", "Immigration", "Climate and environment", "Māori and Treaty issues",
  "Taxation", "Other", "Prefer not to say",
] as const;

const VALID_ISSUE_SEVERITIES = ["critical", "high", "medium", "low"] as const;

const FINANCIAL_PRESSURE_LABELS = {
  groceries: "Groceries",
  rent_or_mortgage: "Rent or mortgage",
  electricity_and_utilities: "Electricity and utilities",
  petrol_and_transport: "Petrol and transport",
  insurance: "Insurance",
  healthcare: "Healthcare",
  childcare: "Childcare",
  education_costs: "Education costs",
  interest_rates: "Interest rates",
  income_not_keeping_up: "Income has not kept up with costs",
  job_loss_or_reduced_hours: "Lost job or reduced work hours",
  business_slowdown: "Business slowdown",
  other: "Other",
} as const;

const VALID_FINANCIAL_PRESSURES = Object.keys(
  FINANCIAL_PRESSURE_LABELS,
) as Array<keyof typeof FINANCIAL_PRESSURE_LABELS>;

const ALREADY_VOTED = "You have already voted in this poll from this browser. Thanks for taking part!";

function allowed<T extends readonly string[]>(value: unknown, list: T): T[number] | null {
  const v = String(value ?? "").trim();
  return v && list.includes(v as T[number]) ? (v as T[number]) : null;
}

function percentagesFrom<T extends string>(keys: Array<{ key: string; label: T }>, values: string[]) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const total = values.length;
  return keys
    .map(({ key, label }) => ({
      key,
      label,
      count: counts.get(key) ?? 0,
      percentage: total > 0 ? ((counts.get(key) ?? 0) / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "en-NZ"))
    .map(({ key, label, percentage }) => ({ key, label, percentage }));
}

/**
 * Has this browser already voted in this poll? If so, return its choice and
 * the current results (percentages only), so a returning voter sees results
 * instead of the form. Browsers that have not voted get no results.
 */
export async function GET(request: NextRequest) {
  try {
    const pollId = request.nextUrl.searchParams.get("pollId")?.trim() || "";
    if (!pollId) {
      return NextResponse.json({ error: "pollId is required." }, { status: 400 });
    }

    const voterToken = request.cookies.get(VOTER_COOKIE_NAME)?.value || "";
    if (!voterToken) return NextResponse.json({ voted: false });

    const admin = createAdminClient();

    const { data: poll, error: pollError } = await admin
      .from("polls")
      .select("id, is_public, results_visibility")
      .eq("id", pollId)
      .maybeSingle();
    if (pollError) throw new Error(pollError.message);
    if (!poll || !poll.is_public) {
      return NextResponse.json({ error: "Poll not found." }, { status: 404 });
    }

    const { data: existingVote, error: existingVoteError } = await admin
      .from("votes")
      .select("option_id")
      .eq("poll_id", pollId)
      .eq("email_hash", hashValue(`anonymous-voter:${voterToken}`))
      .limit(1)
      .maybeSingle();
    if (existingVoteError) throw new Error(existingVoteError.message);
    if (!existingVote) return NextResponse.json({ voted: false });

    // Editors can hide results; a returning voter then sees their choice only.
    if (poll.results_visibility === "private") {
      return NextResponse.json({
        voted: true,
        selectedOptionId: existingVote.option_id,
        results: [],
        resultsHidden: true,
      });
    }

    const { data: resultsData, error: resultsError } = await admin.rpc("get_public_poll_results", {
      requested_poll_id: pollId,
    });
    if (resultsError) throw new Error(resultsError.message);

    return NextResponse.json({
      voted: true,
      selectedOptionId: existingVote.option_id,
      results: toPublicResults(Array.isArray(resultsData) ? resultsData : []),
    });
  } catch (error) {
    console.error("Vote status check failed:", error);
    return NextResponse.json({ error: "Unable to check voting status right now." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pollId = String(body.pollId || "").trim();
    const optionId = String(body.optionId || "").trim();

    if (!pollId || !optionId) {
      return NextResponse.json({ error: "Please choose an option first." }, { status: 400 });
    }

    const eligibilityStatus = allowed(body.eligibilityStatus, VALID_ELIGIBILITY_STATUSES);
    const region = allowed(body.region, VALID_REGIONS);
    const ageRange = allowed(body.ageRange, VALID_AGE_RANGES);
    const mainIssue = allowed(body.mainIssue, VALID_MAIN_ISSUES);
    const issueSeverity = allowed(body.issueSeverity, VALID_ISSUE_SEVERITIES);
    const financialPressure = allowed(body.financialPressure, VALID_FINANCIAL_PRESSURES);
    const electorateName = String(body.electorateName || "").trim();
    const participantComment = String(body.participantComment || "").trim().slice(0, 250);

    const admin = createAdminClient();

    const { data: poll, error: pollError } = await admin
      .from("polls")
      .select("id, status, is_public, poll_type, results_visibility")
      .eq("id", pollId)
      .maybeSingle();
    if (pollError) throw new Error(pollError.message);

    if (!poll || !poll.is_public || poll.status !== "open") {
      return NextResponse.json({ error: "Voting is not currently open for this poll." }, { status: 403 });
    }

    const isPartyVote = poll.poll_type === "party_vote" || poll.poll_type === "electorate_party_vote";

    if (poll.poll_type === "electorate_issue") {
      if (!electorateName) {
        return NextResponse.json({ error: "Please select your electorate." }, { status: 400 });
      }
      const { data: electorate, error: electorateError } = await admin
        .from("electorates")
        .select("id")
        .eq("name", electorateName)
        .eq("election_year", 2026)
        .eq("is_active", true)
        .maybeSingle();
      if (electorateError) throw new Error(electorateError.message);
      if (!electorate) {
        return NextResponse.json({ error: "The selected electorate is invalid." }, { status: 400 });
      }
    }

    const { data: option, error: optionError } = await admin
      .from("poll_options")
      .select("id, label")
      .eq("id", optionId)
      .eq("poll_id", pollId)
      .eq("is_active", true)
      .maybeSingle();
    if (optionError) throw new Error(optionError.message);
    if (!option) {
      return NextResponse.json({ error: "The selected option is invalid." }, { status: 400 });
    }

    // One vote per browser per poll.
    let voterToken = request.cookies.get(VOTER_COOKIE_NAME)?.value || "";
    const isNewToken = !voterToken;
    if (!voterToken) voterToken = newVoterToken();
    const voterHash = hashValue(`anonymous-voter:${voterToken}`);

    const { data: existingVote, error: existingVoteError } = await admin
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("email_hash", voterHash)
      .limit(1)
      .maybeSingle();
    if (existingVoteError) throw new Error(existingVoteError.message);
    if (existingVote) {
      return NextResponse.json({ error: ALREADY_VOTED, alreadyVoted: true }, { status: 409 });
    }

    // Electorate party vote: one electorate per browser.
    if (poll.poll_type === "electorate_party_vote") {
      const { data: electoratePolls, error: electoratePollsError } = await admin
        .from("polls")
        .select("id")
        .eq("poll_type", "electorate_party_vote");
      if (electoratePollsError) throw new Error(electoratePollsError.message);
      const ids = (electoratePolls ?? []).map((p) => p.id);
      if (ids.length > 0) {
        const { data: otherVote, error: otherVoteError } = await admin
          .from("votes")
          .select("id")
          .eq("email_hash", voterHash)
          .in("poll_id", ids)
          .limit(1)
          .maybeSingle();
        if (otherVoteError) throw new Error(otherVoteError.message);
        if (otherVote) {
          return NextResponse.json(
            { error: "You've already voted in an electorate party vote poll. Only one electorate vote is allowed.", alreadyVoted: true },
            { status: 409 },
          );
        }
      }
    }

    // Per-network rate limit (generous: NZ mobile carriers share IPs).
    const ipAddress = getClientIp(request.headers);
    const ipHash = ipAddress ? hashValue(`ip:${ipAddress}`) : null;
    if (ipHash) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count, error: rateError } = await admin
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("poll_id", pollId)
        .eq("ip_hash", ipHash)
        .gte("submitted_at", tenMinutesAgo);
      if (rateError) throw new Error(rateError.message);
      if ((count || 0) >= MAX_IP_VOTES_PER_10_MIN) {
        return NextResponse.json(
          { error: "Lots of votes are coming from your network right now. Please try again in a few minutes." },
          { status: 429 },
        );
      }
    }

    const userAgent = request.headers.get("user-agent") || "";
    const deviceHash = hashValue(`device:${String(body.deviceHint || userAgent || "unknown").slice(0, 1000)}`);
    const detectedCountry = request.headers.get("x-vercel-ip-country")?.toUpperCase() || null;

    const votePayload: Record<string, unknown> = {
      poll_id: pollId,
      option_id: optionId,
      verification_id: null,
      email_hash: voterHash,
      ip_hash: ipHash,
      device_hash: deviceHash,
      status: "valid",
      risk_score: 0,
      risk_flags: ["anonymous_no_otp"],
    };

    if (isPartyVote) {
      votePayload.eligibility_status = eligibilityStatus;
      votePayload.participant_region = region;
      votePayload.participant_age_range = ageRange;
      votePayload.main_election_issue = mainIssue;
      if (poll.poll_type === "electorate_party_vote") {
        votePayload.electorate_name = electorateName || null;
      }
    }

    if (poll.poll_type === "electorate_issue") {
      votePayload.electorate_name = electorateName;
      votePayload.issue_priority = option.label;
      votePayload.issue_severity = issueSeverity;
      votePayload.participant_comment = participantComment || null;
    }

    if (poll.poll_type === "household_finance") {
      votePayload.financial_pressure = financialPressure;
      votePayload.participant_comment = participantComment || null;
    }

    const { data: vote, error: voteError } = await admin
      .from("votes")
      .insert(votePayload)
      .select("id")
      .single();

    if (voteError) {
      if (voteError.code === "23505" || voteError.message.toLowerCase().includes("duplicate")) {
        return NextResponse.json({ error: ALREADY_VOTED, alreadyVoted: true }, { status: 409 });
      }
      throw new Error(voteError.message);
    }

    await admin.from("audit_logs").insert({
      action: "open_vote_submitted",
      entity_type: "vote",
      entity_id: vote.id,
      new_data: {
        poll_id: pollId,
        poll_type: poll.poll_type,
        option_id: optionId,
        option_label: option.label,
        verification: "none",
        detected_country: detectedCountry,
      },
      ip_hash: ipHash,
    });

    // Results: percentages only, never raw counts, and none at all while an
    // editor has set this poll's results to private.
    const resultsHidden = poll.results_visibility === "private";
    let results: ReturnType<typeof toPublicResults> = [];
    // The vote is already saved; a results failure is reported, not thrown.
    let resultsFailed = false;
    if (!resultsHidden) {
      const { data: resultsData, error: resultsError } = await admin.rpc("get_public_poll_results", {
        requested_poll_id: pollId,
      });
      if (resultsError) {
        console.error("Post-vote results load failed:", resultsError);
        resultsFailed = true;
      }
      results = toPublicResults(Array.isArray(resultsData) ? resultsData : []);
    }

    let electorateResults: ReturnType<typeof toPublicResults> = [];
    if (poll.poll_type === "electorate_issue" && !resultsHidden) {
      const [{ data: allOptions }, { data: electorateVotes }] = await Promise.all([
        admin.from("poll_options").select("id, label").eq("poll_id", pollId).eq("is_active", true).order("display_order"),
        admin.from("votes").select("option_id").eq("poll_id", pollId).eq("electorate_name", electorateName).eq("status", "valid"),
      ]);
      electorateResults = percentagesFrom(
        (allOptions ?? []).map((o) => ({ key: o.id as string, label: o.label as string })),
        (electorateVotes ?? []).map((v) => v.option_id as string),
      ).map((r) => ({ option_id: r.key, option_label: r.label, percentage: r.percentage }));
    }

    let pressureResults: Array<{ value: string; label: string; percentage: number }> = [];
    if (poll.poll_type === "household_finance" && !resultsHidden) {
      const { data: pressureVotes } = await admin
        .from("votes")
        .select("financial_pressure")
        .eq("poll_id", pollId)
        .eq("status", "valid")
        .not("financial_pressure", "is", null);
      pressureResults = percentagesFrom(
        VALID_FINANCIAL_PRESSURES.map((key) => ({ key, label: FINANCIAL_PRESSURE_LABELS[key] as string })),
        (pressureVotes ?? [])
          .map((v) => String(v.financial_pressure || ""))
          .filter((v) => (VALID_FINANCIAL_PRESSURES as string[]).includes(v)),
      ).map((r) => ({ value: r.key, label: r.label, percentage: r.percentage }));
    }

    const response = NextResponse.json({
      success: true,
      results,
      resultsHidden,
      resultsError: resultsFailed,
      nationalResults: results,
      electorateResults,
      pressureResults,
      lastUpdated: new Date().toISOString(),
    });

    if (isNewToken) {
      response.cookies.set(VOTER_COOKIE_NAME, voterToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: VOTER_COOKIE_MAX_AGE,
      });
    }

    return response;
  } catch (error) {
    console.error("Open vote failed:", error);
    return NextResponse.json({ error: "We couldn't record your vote just now. Please try again." }, { status: 500 });
  }
}
