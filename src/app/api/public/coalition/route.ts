import { NextRequest, NextResponse } from "next/server";
import { loadCoalitionData } from "@/lib/coalition-data";

/**
 * Public, read-only Coalition Pulse feed for Webfit News article pages.
 *
 * Percentages only: no vote counts or totals ever leave this route.
 * Cached at the edge for 5 minutes so article traffic doesn't hit the database.
 */

const ALLOWED_ORIGINS = new Set([
  "https://webfitnews.com",
  "https://www.webfitnews.com",
  "https://webfitnews.co.nz",
  "https://www.webfitnews.co.nz",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  return origin && ALLOWED_ORIGINS.has(origin)
    ? { "Access-Control-Allow-Origin": origin, Vary: "Origin", "Access-Control-Allow-Methods": "GET, OPTIONS" }
    : { Vary: "Origin" };
}

const round = (value: number) => Math.round(value * 10) / 10;

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));
  const { parties, trend, error } = await loadCoalitionData();

  if (error) {
    return NextResponse.json(
      { error: "Coalition data is unavailable right now." },
      { status: 503, headers: { ...headers, "Cache-Control": "no-store" } },
    );
  }

  const share = (bloc: "government" | "opposition" | "other") =>
    round(parties.filter((p) => p.bloc === bloc).reduce((sum, p) => sum + p.share, 0));

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      shares: { government: share("government"), opposition: share("opposition"), other: share("other") },
      trend: trend.map((p) => ({
        date: p.date,
        government: round(p.government),
        opposition: round(p.opposition),
        other: round(p.other),
      })),
      blocs: {
        government: "National · ACT · NZ First",
        opposition: "Labour · Green · Te Pāti Māori",
        other: "Other parties",
      },
      dashboardUrl: "https://poll.webfitnews.co.nz/coalition-2026",
      voteUrl: "https://poll.webfitnews.co.nz/electorates-2026",
      disclaimer:
        "Voluntary Webfit News reader poll, not weighted and not a scientific survey or seat projection.",
    },
    {
      headers: {
        ...headers,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
