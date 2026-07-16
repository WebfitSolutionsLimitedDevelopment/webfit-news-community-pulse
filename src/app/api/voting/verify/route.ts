import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FAILED_ATTEMPTS = 5;

function hashValue(value: string) {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is missing.");
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pollId = String(body.pollId || "").trim();
    const optionId = String(body.optionId || "").trim();
    const verificationId = String(body.verificationId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();
    const locationDeclaration = body.locationDeclaration === true;

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

    if (!locationDeclaration) {
      return NextResponse.json(
        {
          error:
            "You must confirm that you are currently located in New Zealand.",
        },
        { status: 400 }
      );
    }

    /*
      On Vercel, this header normally contains the visitor's country code.
      It may be absent during local development.
    */
    const detectedCountry =
      request.headers.get("x-vercel-ip-country")?.toUpperCase() || "";

    if (detectedCountry && detectedCountry !== "NZ") {
      return NextResponse.json(
        {
          error:
            "This community poll is currently limited to people connecting from New Zealand.",
        },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: poll, error: pollError } = await admin
      .from("polls")
      .select("id, status, is_public")
      .eq("id", pollId)
      .maybeSingle();

    if (pollError) {
      throw new Error(pollError.message);
    }

    if (!poll || !poll.is_public || poll.status !== "open") {
      return NextResponse.json(
        { error: "Voting is not currently open for this poll." },
        { status: 403 }
      );
    }

    const { data: option, error: optionError } = await admin
      .from("poll_options")
      .select("id, label")
      .eq("id", optionId)
      .eq("poll_id", pollId)
      .eq("is_active", true)
      .maybeSingle();

    if (optionError) {
      throw new Error(optionError.message);
    }

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

    if (existingVoteError) {
      throw new Error(existingVoteError.message);
    }

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

    if (verificationError) {
      throw new Error(verificationError.message);
    }

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
      const nextFailedAttempts =
        (verification.failed_attempts ?? 0) + 1;

      await admin
        .from("otp_requests")
        .update({
          failed_attempts: nextFailedAttempts,
        })
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

    const { data: previousDeviceVote } = deviceHash
      ? await admin
          .from("votes")
          .select("id")
          .eq("poll_id", pollId)
          .eq("device_hash", deviceHash)
          .limit(1)
          .maybeSingle()
      : { data: null };

    if (previousDeviceVote) {
      riskFlags.push("device_previously_used");
      riskScore += 40;
    }

    const { data: vote, error: voteError } = await admin
      .from("votes")
      .insert({
        poll_id: pollId,
        option_id: optionId,
        verification_id: verification.id,
        email_hash: emailHash,
        ip_hash: ipHash,
        device_hash: deviceHash,
        status: riskScore >= 50 ? "flagged" : "valid",
        risk_score: riskScore,
        risk_flags: riskFlags,
      })
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
      .update({
        consumed_at: new Date().toISOString(),
      })
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
        option_id: optionId,
        option_label: option.label,
        vote_status: vote.status,
        risk_score: riskScore,
        risk_flags: riskFlags,
        detected_country: detectedCountry || null,
      },
      ip_hash: ipHash,
    });

    return NextResponse.json({
      success: true,
      voteId: vote.id,
      status: vote.status,
      message:
        vote.status === "flagged"
          ? "Your response has been received and is awaiting integrity review."
          : "Your verified response has been recorded.",
    });
  } catch (error) {
    console.error("Vote verification error:", error);

    return NextResponse.json(
      {
        error:
          "Unable to verify and record your response. Please try again.",
      },
      { status: 500 }
    );
  }
}