import { NextRequest, NextResponse } from "next/server";
import { RESULTS_SOURCE_URL, loadOfficialResults } from "@/lib/official-results";

/**
 * Public feed of the official 2026 election results for Webfit News article
 * pages. Read from the Electoral Commission's XML media feed and cached for a
 * minute, so article traffic never reaches the Commission directly.
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

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));
  const results = await loadOfficialResults();

  return NextResponse.json(
    {
      feedOk: results.ok,
      hasResults: results.hasResults,
      updated: results.updated,
      percentPlacesCounted: results.percentPlacesCounted,
      percentElectoratesFinal: results.percentElectoratesFinal,
      totalSeats: results.totalSeats,
      majority: results.majority,
      blocs: results.blocs,
      parties: results.parties.filter((p) => p.seats > 0 || p.percent >= 1),
      resultsUrl: "https://poll.webfitnews.co.nz/results-2026",
      source: "Electoral Commission, preliminary election-night count",
      sourceUrl: RESULTS_SOURCE_URL,
    },
    {
      status: results.ok ? 200 : 503,
      headers: {
        ...headers,
        "Cache-Control": results.ok ? "public, s-maxage=60, stale-while-revalidate=120" : "no-store",
      },
    },
  );
}
