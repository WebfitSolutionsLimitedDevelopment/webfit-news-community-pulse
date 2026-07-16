import { createHmac, randomInt } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const OTP_EXPIRY_MINUTES = 10;

function hashValue(value: string) {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is missing.");
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function POST(request: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.OTP_FROM_EMAIL;

    if (!resendApiKey || !fromEmail) {
      throw new Error("Resend environment variables are missing.");
    }

    const body = await request.json();

    const pollId = String(body.pollId || "");
    const optionId = String(body.optionId || "");
    const email = String(body.email || "").trim().toLowerCase();
    const locationDeclaration = body.locationDeclaration === true;

    if (!pollId || !optionId || !email) {
      return NextResponse.json(
        { error: "Required information is missing." },
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

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: poll } = await admin
      .from("polls")
      .select("id, title, status, is_public")
      .eq("id", pollId)
      .maybeSingle();

    if (!poll || !poll.is_public || poll.status !== "open") {
      return NextResponse.json(
        { error: "Voting is not currently open for this poll." },
        { status: 403 }
      );
    }

    const { data: option } = await admin
      .from("poll_options")
      .select("id, label")
      .eq("id", optionId)
      .eq("poll_id", pollId)
      .eq("is_active", true)
      .maybeSingle();

    if (!option) {
      return NextResponse.json(
        { error: "The selected option is invalid." },
        { status: 400 }
      );
    }

    const emailHash = hashValue(email);

    const { data: existingVote } = await admin
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("email_hash", emailHash)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json(
        { error: "A verified response has already been submitted using this email." },
        { status: 409 }
      );
    }

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

    const { count: recentRequestCount } = await admin
      .from("otp_requests")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", pollId)
      .eq("email_hash", emailHash)
      .gte("created_at", oneMinuteAgo);

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

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Your Webfit News Community Pulse verification code",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#171717">
          <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9d741f;font-weight:700">
            Webfit News Community Pulse
          </p>

          <h1 style="font-size:28px;margin:18px 0">
            Verify your response
          </h1>

          <p style="font-size:16px;line-height:1.7">
            You selected <strong>${option.label}</strong> in:
          </p>

          <p style="font-size:16px;line-height:1.7">
            ${poll.title}
          </p>

          <div style="margin:28px 0;padding:22px;text-align:center;background:#f6f1e7;border-radius:14px">
            <span style="font-size:36px;letter-spacing:8px;font-weight:700;color:#7b1025">
              ${otp}
            </span>
          </div>

          <p style="font-size:14px;line-height:1.7;color:#666">
            This code expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.
          </p>

          <p style="font-size:13px;line-height:1.7;color:#777;margin-top:28px">
            If you did not request this code, you can ignore this email.
          </p>
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