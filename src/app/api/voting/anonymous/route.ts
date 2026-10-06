import { createHmac, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicResults } from "@/lib/voting";

const COOKIE_NAME = "webfit_pulse_voter";
const MAX_IP_VOTES_PER_10_MIN = 8;

type ResultRow = {
  option_id: string;
  option_label: string;
  vote_count: number;
  percentage: number;
};

function hashValue(value: string) {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) throw new Error("OTP_HASH_SECRET is missing.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pollId = String(body.pollId || "").trim();
    const optionId = String(body.optionId || "").trim();
    const deviceHint = String(body.deviceHint || "").slice(0, 1000);

    if (!pollId || !optionId) {
      return NextResponse.json({ error: "Choose one response first." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: poll, error: pollError } = await admin
      .from("polls")
      .select("id, slug, status, is_public, poll_type")
      .eq("id", pollId)
      .maybeSingle();

    if (pollError) throw new Error(pollError.message);

    if (
      !poll ||
      !poll.is_public ||
      poll.status !== "open" ||
      (poll.poll_type !== "leadership_pulse" && poll.slug !== "luxon-leadership-pulse-2026")
    ) {
      return NextResponse.json({ error: "This reader pulse is not currently open." }, { status: 403 });
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
      return NextResponse.json({ error: "The selected response is invalid." }, { status: 400 });
    }

    let voterToken = request.cookies.get(COOKIE_NAME)?.value || "";
    const isNewToken = !voterToken;
    if (!voterToken) voterToken = randomBytes(32).toString("hex");

    const voterHash = hashValue(`anonymous-voter:${voterToken}`);
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const vercelIp = request.headers.get("x-real-ip") || "";
    const ipAddress = forwardedFor || vercelIp || "unknown";
    const ipHash = hashValue(`ip:${ipAddress}`);
    const deviceHash = hashValue(`device:${deviceHint || request.headers.get("user-agent") || "unknown"}`);

    const { data: existingVote, error: existingVoteError } = await admin
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("email_hash", voterHash)
      .limit(1)
      .maybeSingle();

    if (existingVoteError) throw new Error(existingVoteError.message);

    if (existingVote) {
      return NextResponse.json(
        { error: "This browser has already submitted a response to this reader pulse." },
        { status: 409 }
      );
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentIpVotes, error: rateError } = await admin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", pollId)
      .eq("ip_hash", ipHash)
      .gte("submitted_at", tenMinutesAgo);

    if (rateError) throw new Error(rateError.message);

    if ((recentIpVotes || 0) >= MAX_IP_VOTES_PER_10_MIN) {
      return NextResponse.json(
        { error: "Too many responses have been submitted from this network recently. Please try again later." },
        { status: 429 }
      );
    }

    const { data: vote, error: voteError } = await admin
      .from("votes")
      .insert({
        poll_id: pollId,
        option_id: optionId,
        verification_id: null,
        email_hash: voterHash,
        ip_hash: ipHash,
        device_hash: deviceHash,
        status: "valid",
        risk_score: 0,
        risk_flags: ["anonymous_no_otp"],
      })
      .select("id")
      .single();

    if (voteError) {
      if (voteError.code === "23505" || voteError.message.toLowerCase().includes("duplicate")) {
        return NextResponse.json(
          { error: "This browser has already submitted a response to this reader pulse." },
          { status: 409 }
        );
      }
      throw new Error(voteError.message);
    }

    await admin.from("audit_logs").insert({
      action: "anonymous_reader_pulse_submitted",
      entity_type: "vote",
      entity_id: vote.id,
      new_data: {
        poll_id: pollId,
        poll_type: poll.poll_type,
        option_id: optionId,
        option_label: option.label,
        verification: "none",
      },
      ip_hash: ipHash,
    });

    const { data: resultsData, error: resultsError } = await admin.rpc("get_public_poll_results", {
      requested_poll_id: pollId,
    });
    if (resultsError) throw new Error(resultsError.message);

    const results = toPublicResults((Array.isArray(resultsData) ? resultsData : []) as ResultRow[]);

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
    console.error("Anonymous vote failed:", error);
    return NextResponse.json(
      { error: "Unable to record your response right now." },
      { status: 500 }
    );
  }
}
