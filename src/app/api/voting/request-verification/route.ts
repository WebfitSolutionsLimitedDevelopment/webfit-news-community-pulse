import { createHmac, randomInt } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const OTP_EXPIRY_MINUTES = 10;

const VALID_ELIGIBILITY_STATUSES = [
  "nz_resident",
  "eligible_overseas",
  "not_eligible",
  "prefer_not_to_say",
] as const;

const VALID_ISSUE_SEVERITIES = ["critical", "high", "medium", "low"] as const;

function hashValue(value: string) {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is missing.");
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.OTP_FROM_EMAIL;

    if (!resendApiKey || !fromEmail) {
      throw new Error("Resend environment variables are missing.");
    }

    const body = await request.json();

    const pollId = String(body.pollId || "").trim();
    const optionId = String(body.optionId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const eligibilityStatus = String(body.eligibilityStatus || "").trim();
    const electorateName = String(body.electorateName || "").trim();
    const issueSeverity = String(body.issueSeverity || "").trim();
    const participantComment = String(body.participantComment || "").trim();

    if (!pollId || !optionId || !email) {
      return NextResponse.json(
        { error: "Required information is missing." },
        { status: 400 }
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: poll, error: pollError } = await admin
      .from("polls")
      .select("id, title, status, is_public, poll_type")
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

      const { data: electorate, error: electorateError } = await admin
        .from("electorates")
        .select("id")
        .eq("name", electorateName)
        .eq("election_year", 2026)
        .eq("is_active", true)
        .maybeSingle();

      if (electorateError) {
        throw new Error(electorateError.message);
      }

      if (!electorate) {
        return NextResponse.json(
          { error: "The selected electorate is invalid." },
          { status: 400 }
        );
      }

      if (
        issueSeverity &&
        !VALID_ISSUE_SEVERITIES.includes(
          issueSeverity as (typeof VALID_ISSUE_SEVERITIES)[number]
        )
      ) {
        return NextResponse.json(
          { error: "The selected urgency level is invalid." },
          { status: 400 }
        );
      }

      if (participantComment.length > 250) {
        return NextResponse.json(
          { error: "Your comment must be 250 characters or fewer." },
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

    if (optionError) {
      throw new Error(optionError.message);
    }

    if (!option) {
      return NextResponse.json(
        { error: "The selected option is invalid." },
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

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

    const { count: recentRequestCount, error: recentRequestError } =
      await admin
        .from("otp_requests")
        .select("id", { count: "exact", head: true })
        .eq("poll_id", pollId)
        .eq("email_hash", emailHash)
        .gte("created_at", oneMinuteAgo);

    if (recentRequestError) {
      throw new Error(recentRequestError.message);
    }

    if ((recentRequestCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "Please wait one minute before requesting another code." },
        { status: 429 }
      );
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = hashValue(`${pollId}:${email}:${otp}`);

    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60_000
    ).toISOString();

    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipAddress = forwardedFor.split(",")[0]?.trim() || "";
    const userAgent = request.headers.get("user-agent") || "";

    const { data: verification, error: insertError } = await admin
      .from("otp_requests")
      .insert({
        poll_id: pollId,
        email_hash: emailHash,
        otp_hash: otpHash,
        expires_at: expiresAt,
        request_ip_hash: ipAddress ? hashValue(ipAddress) : null,
        user_agent_hash: userAgent ? hashValue(userAgent) : null,
      })
      .select("id")
      .single();

    if (insertError || !verification) {
      throw new Error(insertError?.message || "Could not create OTP request.");
    }

    const resend = new Resend(resendApiKey);

    const safeOptionLabel = escapeHtml(option.label);
    const safePollTitle = escapeHtml(poll.title);
    const safeElectorateName = escapeHtml(electorateName);

    const selectionDetails =
      poll.poll_type === "electorate_issue"
        ? `
          <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#666666;">
            ${safeElectorateName}
          </p>
        `
        : "";

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Complete your Webfit News Community Pulse response",
      html: `
        <div style="background:#f5f5f3;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#171717;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:20px;overflow:hidden;">
            <div style="height:6px;background:linear-gradient(90deg,#7b1025,#b88a2a);"></div>

            <div style="padding:34px 30px;">
              <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9d741f;font-weight:700;">
                Webfit News Community Pulse
              </p>

              <h1 style="margin:18px 0 12px;font-size:28px;line-height:1.25;color:#171717;">
                Verify your response
              </h1>

              <p style="margin:0;font-size:16px;line-height:1.75;color:#555555;">
                Enter the verification code below to securely record your response.
              </p>

              <div style="margin:26px 0 0;padding:18px;background:#faf7ef;border:1px solid #eee2c7;border-radius:14px;">
                <p style="margin:0 0 6px;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#777777;font-weight:700;">
                  Your selected response
                </p>

                <p style="margin:0;font-size:17px;line-height:1.5;color:#171717;font-weight:700;">
                  ${safeOptionLabel}
                </p>

                ${selectionDetails}

                <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#666666;">
                  ${safePollTitle}
                </p>
              </div>

              <div style="margin:26px 0;padding:24px 16px;text-align:center;background:#f6f1e7;border-radius:14px;">
                <p style="margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#777777;font-weight:700;">
                  Verification code
                </p>

                <span style="display:inline-block;font-size:36px;line-height:1;letter-spacing:8px;font-weight:700;color:#7b1025;">
                  ${otp}
                </span>
              </div>

              <p style="margin:0;font-size:14px;line-height:1.7;color:#666666;">
                This code expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.
              </p>

              <div style="margin-top:26px;padding:18px;background:#f8f8f8;border-radius:12px;">
                <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#222222;">
                  Why did we ask for your email?
                </p>

                <p style="margin:0;font-size:14px;line-height:1.7;color:#666666;">
                  Your email is used only to send this one-time code and help prevent duplicate responses. It will not be published and will not be added to a marketing list.
                </p>
              </div>

              <p style="margin:28px 0 0;font-size:13px;line-height:1.7;color:#888888;">
                If you did not request this code, you can safely ignore this email.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (emailError) {
      await admin.from("otp_requests").delete().eq("id", verification.id);
      throw new Error(emailError.message);
    }

    return NextResponse.json({
      success: true,
      verificationId: verification.id,
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (error) {
    console.error("OTP request error:", error);

    return NextResponse.json(
      { error: "Unable to send the verification code. Please try again." },
      { status: 500 }
    );
  }
}
