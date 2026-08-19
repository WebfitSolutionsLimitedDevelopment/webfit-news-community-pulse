import { createHmac, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BANK_POLL_SLUG = "new-zealand-favourite-bank-2026";
const COOKIE_NAME = "webfit_bank_poll_voter_2026";
const MAX_IP_VOTES_PER_10_MIN = 8;

type PublicResultRow = {
  option_id: string;
  option_label: string;
  vote_count: number;
  percentage: number;
};

type SafeResultRow = {
  option_id: string;
  option_label: string;
  percentage: number;
};

function hashValue(value: string) {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) throw new Error("OTP_HASH_SECRET is missing.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeResults(rows: unknown): SafeResultRow[] {
  if (!Array.isArray(rows)) return [];

  return (rows as PublicResultRow[]).map((row) => ({
    option_id: String(row.option_id),
    option_label: String(row.option_label),
    percentage: Number(row.percentage || 0),
  }));
}

async function loadPoll() {
  const admin = createAdminClient();
  const { data: poll, error } = await admin
    .from("polls")
    .select("id, slug, status, is_public, poll_type")
    .eq("slug", BANK_POLL_SLUG)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return { admin, poll };
}

async function loadResults(admin: ReturnType<typeof createAdminClient>, pollId: string) {
  const { data, error } = await admin.rpc("get_public_poll_results", {
    requested_poll_id: pollId,
  });

  if (error) throw new Error(error.message);
  return safeResults(data);
}

export async function GET(request: NextRequest) {
  try {
    const { admin, poll } = await loadPoll();

    if (!poll || !poll.is_public) {
      return NextResponse.json({ error: "Bank poll not found." }, { status: 404 });
    }

    const voterToken = request.cookies.get(COOKIE_NAME)?.value || "";
    if (!voterToken) {
      return NextResponse.json({ voted: false });
    }

    const voterHash = hashValue(`bank-poll-voter:${voterToken}`);
    const { data: existingVote, error: voteError } = await admin
      .from("votes")
      .select("option_id")
      .eq("poll_id", poll.id)
      .eq("email_hash", voterHash)
      .limit(1)
      .maybeSingle();

    if (voteError) throw new Error(voteError.message);

    if (!existingVote) {
      return NextResponse.json({ voted: false });
    }

    const results = await loadResults(admin, poll.id);

    return NextResponse.json({
      voted: true,
      selectedOptionId: existingVote.option_id,
      results,
    });
  } catch (error) {
    console.error("Bank poll status check failed:", error);
    return NextResponse.json(
      { error: "Unable to check voting status right now." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const optionId = String(body.optionId || "").trim();
    const deviceHint = String(body.deviceHint || "").slice(0, 1000);

    if (!optionId) {
      return NextResponse.json({ error: "Choose one bank first." }, { status: 400 });
    }

    const { admin, poll } = await loadPoll();

    if (
      !poll ||
      !poll.is_public ||
      poll.status !== "open" ||
      poll.poll_type !== "multiple_choice"
    ) {
      return NextResponse.json(
        { error: "This bank poll is not currently open." },
        { status: 403 }
      );
    }

    const { data: option, error: optionError } = await admin
      .from("poll_options")
      .select("id, label")
      .eq("id", optionId)
      .eq("poll_id", poll.id)
      .eq("is_active", true)
      .maybeSingle();

    if (optionError) throw new Error(optionError.message);
    if (!option) {
      return NextResponse.json({ error: "The selected bank is invalid." }, { status: 400 });
    }

    let voterToken = request.cookies.get(COOKIE_NAME)?.value || "";
    const isNewToken = !voterToken;
    if (!voterToken) voterToken = randomBytes(32).toString("hex");

    const voterHash = hashValue(`bank-poll-voter:${voterToken}`);
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const realIp = request.headers.get("x-real-ip") || "";
    const ipAddress = forwardedFor || realIp || "unknown";
    const ipHash = hashValue(`bank-poll-ip:${ipAddress}`);
    const deviceHash = hashValue(
      `bank-poll-device:${deviceHint || request.headers.get("user-agent") || "unknown"}`
    );

    const { data: existingVote, error: existingVoteError } = await admin
      .from("votes")
      .select("id, option_id")
      .eq("poll_id", poll.id)
      .eq("email_hash", voterHash)
      .limit(1)
      .maybeSingle();

    if (existingVoteError) throw new Error(existingVoteError.message);

    if (existingVote) {
      const results = await loadResults(admin, poll.id);
      return NextResponse.json(
        {
          error: "This browser has already voted in this bank poll.",
          selectedOptionId: existingVote.option_id,
          results,
        },
        { status: 409 }
      );
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentIpVotes, error: rateError } = await admin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", poll.id)
      .eq("ip_hash", ipHash)
      .gte("submitted_at", tenMinutesAgo);

    if (rateError) throw new Error(rateError.message);

    if ((recentIpVotes || 0) >= MAX_IP_VOTES_PER_10_MIN) {
      return NextResponse.json(
        { error: "Too many votes have been submitted from this network recently. Please try again later." },
        { status: 429 }
      );
    }

    const { data: vote, error: voteError } = await admin
      .from("votes")
      .insert({
        poll_id: poll.id,
        option_id: optionId,
        verification_id: null,
        email_hash: voterHash,
        ip_hash: ipHash,
        device_hash: deviceHash,
        status: "valid",
        risk_score: 0,
        risk_flags: ["anonymous_no_otp", "bank_poll_2026"],
      })
      .select("id")
      .single();

    if (voteError) {
      if (voteError.code === "23505" || voteError.message.toLowerCase().includes("duplicate")) {
        return NextResponse.json(
          { error: "This browser has already voted in this bank poll." },
          { status: 409 }
        );
      }
      throw new Error(voteError.message);
    }

    const { error: auditError } = await admin.from("audit_logs").insert({
      action: "anonymous_bank_poll_submitted",
      entity_type: "vote",
      entity_id: vote.id,
      new_data: {
        poll_id: poll.id,
        poll_slug: BANK_POLL_SLUG,
        option_id: optionId,
        option_label: option.label,
        verification: "none",
      },
      ip_hash: ipHash,
    });

    if (auditError) {
      console.error("Unable to write bank poll audit log:", auditError);
    }

    const results = await loadResults(admin, poll.id);
    const response = NextResponse.json({ success: true, results });

    if (isNewToken) {
      response.cookies.set(COOKIE_NAME, voterToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  } catch (error) {
    console.error("Bank poll vote failed:", error);
    return NextResponse.json(
      { error: "Unable to record your vote right now." },
      { status: 500 }
    );
  }
}
