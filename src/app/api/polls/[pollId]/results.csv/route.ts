import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Raw vote counts are only included for signed-in, active admins. */
async function isActiveAdmin() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await createAdminClient()
      .from("admin_users")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();
    return Boolean(profile?.is_active);
  } catch {
    return false;
  }
}

export const dynamic = "force-dynamic";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ pollId: string }> }
) {
  try {
    const { pollId } = await context.params;

    if (!pollId) {
      return NextResponse.json(
        { error: "Poll ID is required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: poll, error: pollError } = await admin
      .from("polls")
      .select("id, title, slug, is_public, results_visibility")
      .eq("id", pollId)
      .maybeSingle();

    if (pollError) {
      throw new Error(pollError.message);
    }

    if (!poll || !poll.is_public) {
      return NextResponse.json(
        { error: "Poll not found." },
        { status: 404 }
      );
    }

    if (poll.results_visibility === "private") {
      return NextResponse.json(
        { error: "Aggregate results are not publicly available for this poll." },
        { status: 403 }
      );
    }

    const { data: options, error: optionsError } = await admin
      .from("poll_options")
      .select("id, label, short_label, display_order")
      .eq("poll_id", poll.id)
      .eq("is_active", true)
      .order("display_order");

    if (optionsError) {
      throw new Error(optionsError.message);
    }

    const { data: results, error: resultsError } = await admin.rpc(
      "get_public_poll_results",
      {
        requested_poll_id: poll.id,
      }
    );

    if (resultsError) {
      throw new Error(resultsError.message);
    }

    const resultRows = Array.isArray(results) ? results : [];

    const rows = (options ?? []).map((option) => {
      const result = resultRows.find(
        (item: {
          option_id?: string;
          vote_count?: number;
          percentage?: number;
        }) => item.option_id === option.id
      );

      return {
        option: option.label,
        abbreviation: option.short_label ?? "",
        voteCount: Number(result?.vote_count ?? 0),
        percentage: Number(result?.percentage ?? 0),
      };
    });

    const totalVerifiedResponses = rows.reduce(
      (sum, row) => sum + row.voteCount,
      0
    );

    const generatedAt = new Date().toISOString();
    const includeCounts = await isActiveAdmin();

    const csvLines = includeCounts ? [
      ["Webfit News Community Pulse"],
      ["Poll", poll.title],
      ["Poll slug", poll.slug],
      ["Generated at", generatedAt],
      ["Total verified responses", totalVerifiedResponses],
      [],
      ["Party or response option", "Abbreviation", "Verified responses", "Percentage"],
      ...rows.map((row) => [
        row.option,
        row.abbreviation,
        row.voteCount,
        row.percentage.toFixed(1),
      ]),
      [],
      [
        "Methodology note",
        "Results represent participants in this Webfit News Community Pulse poll and are not a representative sample of all New Zealand voters.",
      ],
    ] : [
      ["Webfit News Community Pulse"],
      ["Poll", poll.title],
      ["Generated at", generatedAt],
      [],
      ["Party or response option", "Abbreviation", "Percentage"],
      ...rows.map((row) => [row.option, row.abbreviation, row.percentage.toFixed(1)]),
      [],
      [
        "Methodology note",
        "Results represent participants in this Webfit News Community Pulse poll and are not a representative sample of all New Zealand voters.",
      ],
    ];

    const csv = csvLines
      .map((line) => line.map((value) => escapeCsv(value)).join(","))
      .join("\r\n");

    const safeSlug = poll.slug.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
    const filename = `${safeSlug}-aggregate-results.csv`;

    return new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Aggregate results CSV error:", error);

    return NextResponse.json(
      { error: "Unable to generate the aggregate results download." },
      { status: 500 }
    );
  }
}
