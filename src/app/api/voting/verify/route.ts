import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FAILED_ATTEMPTS = 5;

const VALID_ELIGIBILITY_STATUSES = [
  "nz_resident",
  "eligible_overseas",
  "not_eligible",
  "prefer_not_to_say",
] as const;

const VALID_REGIONS = [
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
] as const;

const VALID_AGE_RANGES = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
  "Under 18",
  "Prefer not to say",
] as const;

const VALID_MAIN_ISSUES = [
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
] as const;

const VALID_ISSUE_SEVERITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const;

type ResultRow = {
  option_id: string;
  option_label: string;
  vote_count: number;
  percentage: number;
};

function hashValue(value: string) {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is missing.");
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

function optionalAllowedValue<T extends readonly string[]>(
  value: unknown,
  allowedValues: T
): T[number] | null {
  const normalised = String(value || "").trim();

  if (!normalised) return null;

  return allowedValues.includes(normalised as T[number])
    ? (normalised as T[number])
    : null;
}

function buildResultRows(
  options: Array<{ id: string; label: string }>,
  votes: Array<{ option_id: string }>
): ResultRow[] {
  const counts = new Map<string, number>();

  for (const vote of votes) {
    counts.set(vote.option_id, (counts.get(vote.option_id) ?? 0) + 1);
  }

  const total = votes.length;

  return options
    .map((option) => {
      const voteCount = counts.get(option.id) ?? 0;

      return {
        option_id: option.id,
        option_label: option.label,
        vote_count: voteCount,
        percentage: total > 0 ? (voteCount / total) * 100 : 0,
      };
    })
    .sort((a, b) => {
      if (b.vote_count !== a.vote_count) {
        return b.vote_count - a.vote_count;
      }

      return a.option_label.localeCompare(b.option_label, "en-NZ");
    });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pollId = String(body.pollId || "").trim();
    const optionId = String(body.optionId || "").trim();
    const verificationId = String(body.verificationId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();

    const eligibilityStatus = String(body.eligibilityStatus || "").trim();
    const region = optionalAllowedValue(body.region, VALID_REGIONS);
    const ageRange = optionalAllowedValue(body.ageRange, VALID_AGE_RANGES);
    const mainIssue = optionalAllowedValue(body.mainIssue, VALID_MAIN_ISSUES);

    const electorateName = String(body.electorateName || "").trim();
    const issueSeverity = optionalAllowedValue(
      body.issueSeverity,
      VALID_ISSUE_SEVERITIES
    );
    const participantComment = String(body.participantComment || "").trim();

    if (!pollId || !optionId || !verificationId || !email || !otp) {
      return NextResponse.json(
        { error: "Required verification information is missing." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Please enter a valid six-digit verification code." },
        { status: 400 }
      );
    }

    const detectedCountry =
      request.headers.get("x-vercel-ip-country")?.toUpperCase() || "";

    const admin = createAdminClient();

    const { data: poll, error: pollError } = await admin
      .from("polls")
      .select("id, status, is_public, poll_type")
      .eq("id", pollId)
      .maybeSingle();

    if (pollError) throw new Error(pollError.message);

    if (!poll || !poll.is_public || poll.status !== "open") {
      return NextResponse.json(
        { error: "Voting is not currently open for this poll." },
        { status: 403 }
      );
    }

    if (poll.poll_type === "party_vote") {
      if (
        !VALID_ELIGIBILITY_STATUSES.includes(
          eligibilityStatus as (typeof VALID_ELIGIBILITY_STATUSES)[number]
        )
      ) {
        return NextResponse.json(
          { error: "Please select the option that best describes you." },
          { status: 400 }
        );
      }
    }

    if (poll.poll_type === "electorate_issue") {
      if (!electorateName) {
        return NextResponse.json(
          { error: "Please select your electorate." },
          { status: 400 }
        );
      }

      if (participantComment.length > 250) {
        return NextResponse.json(
          { error: "Your comment must be 250 characters or fewer." },
          { status: 400 }
        );
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
        return NextResponse.json(
          { error: "The selected electorate is invalid." },
          { status: 400 }
        );
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
      return NextResponse.json(
        { error: "The selected poll option is invalid." },
        { status: 400 }
      );
    }

    const emailHash = hashValue(email);

    const { data: existingVote, error: existingVoteError } = await admin
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("email_hash", emailHash)
      .maybeSingle();

    if (existingVoteError) throw new Error(existingVoteError.message);

    if (existingVote) {
      return NextResponse.json(
        {
          error:
            "A verified response has already been submitted using this email address.",
        },
        { status: 409 }
      );
    }

    const { data: verification, error: verificationError } = await admin
      .from("otp_requests")
      .select(
        `
          id,
          poll_id,
          email_hash,
          otp_hash,
          expires_at,
          consumed_at,
          failed_attempts,
          maximum_attempts,
          request_ip_hash,
          device_hash,
          user_agent_hash
        `
      )
      .eq("id", verificationId)
      .eq("poll_id", pollId)
      .eq("email_hash", emailHash)
      .maybeSingle();

    if (verificationError) throw new Error(verificationError.message);

    if (!verification) {
      return NextResponse.json(
        {
          error:
            "The verification request could not be found. Please request a new code.",
        },
        { status: 404 }
      );
    }

    if (verification.consumed_at) {
      return NextResponse.json(
        {
          error:
            "This verification code has already been used. Please request a new code.",
        },
        { status: 409 }
      );
    }

    const allowedAttempts =
      verification.maximum_attempts ?? MAX_FAILED_ATTEMPTS;

    if ((verification.failed_attempts ?? 0) >= allowedAttempts) {
      return NextResponse.json(
        {
          error:
            "Too many incorrect attempts. Please request a new verification code.",
        },
        { status: 429 }
      );
    }

    if (new Date(verification.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        {
          error:
            "This verification code has expired. Please request a new code.",
        },
        { status: 410 }
      );
    }

    const expectedOtpHash = hashValue(`${pollId}:${email}:${otp}`);

    if (expectedOtpHash !== verification.otp_hash) {
      const nextFailedAttempts = (verification.failed_attempts ?? 0) + 1;

      await admin
        .from("otp_requests")
        .update({ failed_attempts: nextFailedAttempts })
        .eq("id", verification.id);

      const attemptsRemaining = Math.max(
        allowedAttempts - nextFailedAttempts,
        0
      );

      return NextResponse.json(
        {
          error:
            attemptsRemaining > 0
              ? `The verification code is incorrect. ${attemptsRemaining} attempt${
                  attemptsRemaining === 1 ? "" : "s"
                } remaining.`
              : "Too many incorrect attempts. Please request a new code.",
        },
        { status: attemptsRemaining > 0 ? 400 : 429 }
      );
    }

    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipAddress = forwardedFor.split(",")[0]?.trim() || "";
    const userAgent = request.headers.get("user-agent") || "";

    const ipHash = ipAddress ? hashValue(ipAddress) : null;
    const deviceHash = userAgent
      ? hashValue(`${userAgent}:${emailHash}`)
      : null;

    const riskFlags: string[] = [];
    let riskScore = 0;

    if (!detectedCountry) {
      riskFlags.push("country_not_detected");
      riskScore += 5;
    }

    if (!ipAddress) {
      riskFlags.push("ip_not_detected");
      riskScore += 5;
    }

    if (
      poll.poll_type === "party_vote" &&
      detectedCountry &&
      detectedCountry !== "NZ" &&
      eligibilityStatus === "nz_resident"
    ) {
      riskFlags.push("nz_resident_detected_overseas");
      riskScore += 20;
    }

    if (
      poll.poll_type === "party_vote" &&
      detectedCountry === "NZ" &&
      eligibilityStatus === "eligible_overseas"
    ) {
      riskFlags.push("overseas_voter_detected_in_nz");
      riskScore += 10;
    }

    const { data: previousDeviceVote, error: deviceCheckError } = deviceHash
      ? await admin
          .from("votes")
          .select("id")
          .eq("poll_id", pollId)
          .eq("device_hash", deviceHash)
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };

    if (deviceCheckError) throw new Error(deviceCheckError.message);

    if (previousDeviceVote) {
      riskFlags.push("device_previously_used");
      riskScore += 40;
    }

    const votePayload: Record<string, unknown> = {
      poll_id: pollId,
      option_id: optionId,
      verification_id: verification.id,
      email_hash: emailHash,
      ip_hash: ipHash,
      device_hash: deviceHash,
      status: riskScore >= 50 ? "flagged" : "valid",
      risk_score: riskScore,
      risk_flags: riskFlags,
    };

    if (poll.poll_type === "party_vote") {
      votePayload.eligibility_status = eligibilityStatus;
      votePayload.participant_region = region;
      votePayload.participant_age_range = ageRange;
      votePayload.main_election_issue = mainIssue;
    }

    if (poll.poll_type === "electorate_issue") {
      votePayload.electorate_name = electorateName;
      votePayload.issue_priority = option.label;
      votePayload.issue_severity = issueSeverity;
      votePayload.participant_comment = participantComment || null;
    }

    const { data: vote, error: voteError } = await admin
      .from("votes")
      .insert(votePayload)
      .select("id, status")
      .single();

    if (voteError) {
      if (
        voteError.code === "23505" ||
        voteError.message.toLowerCase().includes("duplicate")
      ) {
        return NextResponse.json(
          {
            error:
              "A response has already been submitted using this email address.",
          },
          { status: 409 }
        );
      }

      throw new Error(voteError.message);
    }

    const { error: consumeError } = await admin
      .from("otp_requests")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", verification.id)
      .is("consumed_at", null);

    if (consumeError) {
      console.error("OTP consumption update failed:", consumeError);
    }

    await admin.from("audit_logs").insert({
      actor_email: email,
      action: "verified_vote_submitted",
      entity_type: "vote",
      entity_id: vote.id,
      new_data: {
        poll_id: pollId,
        poll_type: poll.poll_type,
        option_id: optionId,
        option_label: option.label,
        vote_status: vote.status,
        eligibility_status:
          poll.poll_type === "party_vote" ? eligibilityStatus : null,
        participant_region:
          poll.poll_type === "party_vote" ? region : null,
        participant_age_range:
          poll.poll_type === "party_vote" ? ageRange : null,
        main_election_issue:
          poll.poll_type === "party_vote" ? mainIssue : null,
        electorate_name:
          poll.poll_type === "electorate_issue" ? electorateName : null,
        issue_priority:
          poll.poll_type === "electorate_issue" ? option.label : null,
        issue_severity:
          poll.poll_type === "electorate_issue" ? issueSeverity : null,
        participant_comment:
          poll.poll_type === "electorate_issue"
            ? participantComment || null
            : null,
        risk_score: riskScore,
        risk_flags: riskFlags,
        detected_country: detectedCountry || null,
      },
      ip_hash: ipHash,
    });

    const { data: nationalResultsData, error: nationalResultsError } =
      await admin.rpc("get_public_poll_results", {
        requested_poll_id: pollId,
      });

    if (nationalResultsError) {
      console.error(
        "Post-vote national results load failed:",
        nationalResultsError
      );
    }

    const nationalResults = Array.isArray(nationalResultsData)
      ? nationalResultsData
      : [];

    const nationalResponseCount = nationalResults.reduce(
      (total, row) => total + Number(row.vote_count ?? 0),
      0
    );

    let electorateResults: ResultRow[] = [];
    let electorateResponseCount = 0;

    if (poll.poll_type === "electorate_issue") {
      const { data: allOptions, error: allOptionsError } = await admin
        .from("poll_options")
        .select("id, label")
        .eq("poll_id", pollId)
        .eq("is_active", true)
        .order("display_order");

      if (allOptionsError) throw new Error(allOptionsError.message);

      const { data: electorateVotes, error: electorateVotesError } =
        await admin
          .from("votes")
          .select("option_id")
          .eq("poll_id", pollId)
          .eq("electorate_name", electorateName)
          .eq("status", "valid");

      if (electorateVotesError) {
        throw new Error(electorateVotesError.message);
      }

      electorateResponseCount = electorateVotes?.length ?? 0;
      electorateResults = buildResultRows(
        allOptions ?? [],
        electorateVotes ?? []
      );
    }

    return NextResponse.json({
      success: true,
      voteId: vote.id,
      status: vote.status,
      message:
        vote.status === "flagged"
          ? "Your response has been received and is awaiting integrity review."
          : "Your verified response has been recorded.",
      results: nationalResults,
      totalVerifiedResponses: nationalResponseCount,
      nationalResults,
      nationalResponseCount,
      electorateResults,
      electorateResponseCount,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Vote verification error:", error);

    return NextResponse.json(
      {
        error: "Unable to verify and record your response. Please try again.",
      },
      { status: 500 }
    );
  }
}
