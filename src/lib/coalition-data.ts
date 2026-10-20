import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Coalition Pulse data. Everything here runs on the server with the
 * service-role client; only percentages and electorate-level leads leave it.
 */

export type BlocKey = "government" | "opposition" | "other";

// Current coalition blocs. Edit here if the line-up changes.
export const GOVERNMENT_PARTIES = new Set([
  "the_new_zealand_national_party",
  "act_new_zealand",
  "new_zealand_first_party",
]);
export const OPPOSITION_PARTIES = new Set([
  "new_zealand_labour_party",
  "the_green_party_of_aotearoa_new_zealand",
  "te_pati_maori",
]);
// Not a party choice, so excluded from the shares.
const NOT_DECIDED = new Set(["undecided", "prefer_not_to_say"]);

export const SHORT_NAMES: Record<string, string> = {
  act_new_zealand: "ACT",
  new_zealand_first_party: "NZ First",
  new_zealand_labour_party: "Labour",
  the_green_party_of_aotearoa_new_zealand: "Green",
  the_new_zealand_national_party: "National",
  te_pati_maori: "Te Pāti Māori",
  opportunity_party: "Opportunity",
  conservative_party_nz: "Conservative",
  vision_new_zealand: "Vision NZ",
  new_zealand_outdoors_freedom_party: "Outdoors & Freedom",
  aotearoa_legalise_cannabis_party: "Cannabis Party",
  animal_justice_party_aotearoa_new_zealand: "Animal Justice",
  womens_rights_party: "Women's Rights",
  another_registered_party: "Another party",
};

type SummaryOption = {
  option_id: string;
  party_key: string | null;
  option_label: string;
  short_label: string | null;
  logo_url: string | null;
  vote_count: number | string;
};

type SummaryRow = {
  poll_id: string;
  poll_slug: string;
  electorate_name: string | null;
  options: SummaryOption[] | null;
};

export type Party = {
  key: string;
  label: string;
  logoUrl: string | null;
  share: number; // % of decided votes nationally
  bloc: BlocKey;
};

export type ElectorateLean = {
  slug: string;
  name: string;
  /** Leading bloc in this electorate, "tied", or "none" when it has no decided votes. */
  lead: BlocKey | "tied" | "none";
  govShare: number;
  oppShare: number;
};

export type TrendPoint = {
  date: string; // YYYY-MM-DD, NZ time
  government: number;
  opposition: number;
  other: number;
};

export type CoalitionData = {
  parties: Party[];
  electorates: ElectorateLean[];
  trend: TrendPoint[];
  error: boolean;
};

export function blocOf(key: string): BlocKey {
  return GOVERNMENT_PARTIES.has(key) ? "government" : OPPOSITION_PARTIES.has(key) ? "opposition" : "other";
}

function partyKey(option: Pick<SummaryOption, "party_key" | "option_label">) {
  return (
    option.party_key ||
    option.option_label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
  );
}

const nzDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" });

/** Cumulative bloc share at the end of each day, from vote timestamps. */
async function loadTrend(
  admin: ReturnType<typeof createAdminClient>,
  pollIds: string[],
  optionKey: Map<string, string>,
): Promise<TrendPoint[]> {
  if (pollIds.length === 0) return [];
  const rows: Array<{ option_id: string; submitted_at: string }> = [];
  const pageSize = 1000;
  for (let from = 0; from < 50_000; from += pageSize) {
    const { data, error } = await admin
      .from("votes")
      .select("option_id, submitted_at")
      .in("poll_id", pollIds)
      .eq("status", "valid")
      .order("submitted_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error || !data) return [];
    rows.push(...(data as typeof rows));
    if (data.length < pageSize) break;
  }

  const running: Record<BlocKey, number> = { government: 0, opposition: 0, other: 0 };
  const byDay = new Map<string, TrendPoint>();
  for (const row of rows) {
    const key = optionKey.get(row.option_id);
    if (!key || NOT_DECIDED.has(key)) continue;
    running[blocOf(key)] += 1;
    const total = running.government + running.opposition + running.other;
    const date = nzDate.format(new Date(row.submitted_at));
    byDay.set(date, {
      date,
      government: (running.government / total) * 100,
      opposition: (running.opposition / total) * 100,
      other: (running.other / total) * 100,
    });
  }
  return Array.from(byDay.values());
}

export async function loadCoalitionData(): Promise<CoalitionData> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_electorate_party_vote_summary");
  if (error) return { parties: [], electorates: [], trend: [], error: true };

  const rows = (Array.isArray(data) ? data : []) as SummaryRow[];
  const totals = new Map<string, { label: string; logoUrl: string | null; votes: number }>();
  const optionKey = new Map<string, string>();
  const electorates: ElectorateLean[] = [];

  for (const row of rows) {
    const local: Record<BlocKey, number> = { government: 0, opposition: 0, other: 0 };
    for (const option of row.options ?? []) {
      const key = partyKey(option);
      optionKey.set(option.option_id, key);
      if (NOT_DECIDED.has(key)) continue;
      const votes = Number(option.vote_count || 0);
      local[blocOf(key)] += votes;
      const current = totals.get(key) ?? {
        label: option.short_label || SHORT_NAMES[key] || option.option_label,
        logoUrl: option.logo_url,
        votes: 0,
      };
      current.votes += votes;
      totals.set(key, current);
    }
    const decided = local.government + local.opposition + local.other;
    const govShare = decided > 0 ? (local.government / decided) * 100 : 0;
    const oppShare = decided > 0 ? (local.opposition / decided) * 100 : 0;
    const otherShare = decided > 0 ? (local.other / decided) * 100 : 0;
    const top = Math.max(govShare, oppShare, otherShare);
    const leaders = (["government", "opposition", "other"] as BlocKey[]).filter(
      (b) => (b === "government" ? govShare : b === "opposition" ? oppShare : otherShare) === top,
    );
    electorates.push({
      slug: row.poll_slug,
      name: row.electorate_name || row.poll_slug,
      lead: decided === 0 ? "none" : leaders.length > 1 ? "tied" : leaders[0],
      govShare,
      oppShare,
    });
  }

  const decided = Array.from(totals.values()).reduce((sum, p) => sum + p.votes, 0);
  const parties = Array.from(totals.entries())
    .map(([key, p]) => ({
      key,
      label: SHORT_NAMES[key] || p.label,
      logoUrl: p.logoUrl,
      share: decided > 0 ? (p.votes / decided) * 100 : 0,
      bloc: blocOf(key),
    }))
    .filter((p) => p.share > 0)
    .sort((a, b) => b.share - a.share);

  const trend = await loadTrend(admin, rows.map((r) => r.poll_id), optionKey);

  return { parties, electorates, trend, error: false };
}

/**
 * Smallest party combinations that together pass 50% of decided reader votes.
 * "Minimal" = dropping any member takes the group back under 50%.
 */
export function pathsToMajority(parties: Party[], limit = 5) {
  const pool = parties.slice(0, 8); // the largest parties; the long tail can't change the picture
  const results: Array<{ members: Party[]; share: number }> = [];
  for (let mask = 1; mask < 1 << pool.length; mask++) {
    const members = pool.filter((_, i) => mask & (1 << i));
    const share = members.reduce((s, p) => s + p.share, 0);
    if (share <= 50) continue;
    if (members.some((m) => share - m.share > 50)) continue;
    results.push({ members, share });
  }
  // Within-bloc paths first, then bloc + outside parties, then cross-bloc deals.
  const kind = (members: Party[]) => {
    const blocs = new Set(members.map((m) => m.bloc));
    if (blocs.has("government") && blocs.has("opposition")) return 2;
    return blocs.size === 1 ? 0 : 1;
  };
  return results
    .sort((a, b) => kind(a.members) - kind(b.members) || a.members.length - b.members.length || b.share - a.share)
    .slice(0, limit);
}
