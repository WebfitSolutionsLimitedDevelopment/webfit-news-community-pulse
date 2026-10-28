import "server-only";
import type { BlocKey } from "@/lib/coalition-data";

/**
 * Official 2026 General Election results from the Electoral Commission's
 * public XML media feed (https://media.election.net.nz/xml/).
 *
 * The feed is live from 7pm on election night and is updated as results are
 * entered. Before that every count is zero, and we show a holding message.
 */

export const RESULTS_FEED_URL = (process.env.RESULTS_FEED_URL || "https://media.election.net.nz/xml/").replace(/\/?$/, "/");
export const RESULTS_SOURCE_URL = "https://www.electionresults.govt.nz/";

// Seats are decided by party abbreviation in the feed (parties.xml).
const GOVERNMENT = new Set(["NAT", "ACT", "NZF"]);
const OPPOSITION = new Set(["LAB", "GP", "TPMAO"]);

const SHORT_NAMES: Record<string, string> = {
  NAT: "National",
  LAB: "Labour",
  GP: "Green",
  ACT: "ACT",
  NZF: "NZ First",
  TPMAO: "Te Pāti Māori",
};

export type ResultParty = {
  abbrev: string;
  name: string;
  bloc: BlocKey;
  percent: number; // % of party votes counted
  electorateSeats: number;
  listSeats: number;
  seats: number;
};

export type OfficialResults = {
  /** False when the feed could not be reached or read. */
  ok: boolean;
  /** True once any votes have been counted. */
  hasResults: boolean;
  updated: string | null; // feed timestamp, NZ local time as given
  percentPlacesCounted: number;
  percentElectoratesFinal: number;
  totalSeats: number;
  majority: number;
  parties: ResultParty[];
  blocs: Record<BlocKey, { percent: number; seats: number }>;
};

const EMPTY_BLOCS = (): OfficialResults["blocs"] => ({
  government: { percent: 0, seats: 0 },
  opposition: { percent: 0, seats: 0 },
  other: { percent: 0, seats: 0 },
});

const EMPTY: OfficialResults = {
  ok: false,
  hasResults: false,
  updated: null,
  percentPlacesCounted: 0,
  percentElectoratesFinal: 0,
  totalSeats: 0,
  majority: 61,
  parties: [],
  blocs: EMPTY_BLOCS(),
};

function decode(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .trim();
}

function tag(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? decode(match[1]) : "";
}

const num = (xml: string, name: string) => Number(tag(xml, name)) || 0;

/** Each <party p_no="..."> ... </party> block, keyed by p_no. */
function partyBlocks(xml: string) {
  const blocks = new Map<string, string>();
  for (const m of xml.matchAll(/<party\s+p_no="(\d+)"\s*>([\s\S]*?)<\/party>/g)) blocks.set(m[1], m[2]);
  return blocks;
}

export function blocForAbbrev(abbrev: string): BlocKey {
  return GOVERNMENT.has(abbrev) ? "government" : OPPOSITION.has(abbrev) ? "opposition" : "other";
}

/** Pure parser, separate from fetching so it can be tested on saved feed files. */
export function parseResults(electionXml: string, partiesXml: string): OfficialResults {
  const names = new Map<string, { abbrev: string; name: string }>();
  for (const [pNo, body] of partyBlocks(partiesXml)) {
    const abbrev = tag(body, "abbrev");
    names.set(pNo, { abbrev, name: SHORT_NAMES[abbrev] || tag(body, "short_name") || tag(body, "party_name") || abbrev });
  }

  const stats = tag(electionXml, "statistics");
  const status = tag(electionXml, "partystatus");
  const parties: ResultParty[] = [];
  for (const [pNo, body] of partyBlocks(status)) {
    const info = names.get(pNo) ?? { abbrev: `P${pNo}`, name: `Party ${pNo}` };
    parties.push({
      abbrev: info.abbrev,
      name: info.name,
      bloc: blocForAbbrev(info.abbrev),
      percent: num(body, "percent_votes"),
      electorateSeats: num(body, "candidate_seats"),
      listSeats: num(body, "party_seats"),
      seats: num(body, "total_seats"),
    });
  }
  parties.sort((a, b) => b.seats - a.seats || b.percent - a.percent || a.name.localeCompare(b.name));

  const blocs = EMPTY_BLOCS();
  for (const p of parties) {
    blocs[p.bloc].percent += p.percent;
    blocs[p.bloc].seats += p.seats;
  }
  for (const b of Object.values(blocs)) b.percent = Math.round(b.percent * 100) / 100;

  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);
  const votesCast = num(stats, "total_votes_cast");
  const percentPlacesCounted = num(stats, "percent_voting_places_counted");

  return {
    ok: true,
    hasResults: votesCast > 0 || percentPlacesCounted > 0,
    updated: electionXml.match(/<election[^>]*\supdated="([^"]+)"/)?.[1] ?? null,
    percentPlacesCounted,
    percentElectoratesFinal: num(stats, "percent_electorates_final"),
    totalSeats,
    // 120 seats normally; an overhang makes the House bigger and moves the line.
    majority: totalSeats > 0 ? Math.floor(totalSeats / 2) + 1 : 61,
    parties,
    blocs,
  };
}

async function getXml(file: string) {
  const res = await fetch(RESULTS_FEED_URL + file, {
    headers: { Accept: "application/xml,text/xml", "User-Agent": "WebfitNews-Results/1.0 (+https://poll.webfitnews.co.nz)" },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("<?xml")) throw new Error(`${file}: not XML`);
  return text;
}

export async function loadOfficialResults(): Promise<OfficialResults> {
  try {
    const [election, parties] = await Promise.all([getXml("election.xml"), getXml("parties.xml")]);
    return parseResults(election, parties);
  } catch (error) {
    console.error("Official results feed unavailable", error);
    return EMPTY;
  }
}
