import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button";
import { PartyLogo } from "@/components/party-logo";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SummaryRow = {
  poll_id: string;
  poll_slug: string;
  electorate_name: string | null;
  electorate_code: string | null;
  poll_status: string;
  option_id: string;
  party_key: string | null;
  option_label: string;
  short_label: string | null;
  logo_url: string | null;
  colour_hex: string | null;
  display_order: number;
  vote_count: number | string;
};

type PartySummary = {
  key: string;
  label: string;
  shortLabel: string | null;
  logoUrl: string | null;
  voteCount: number;
  rawShare: number;
  equalElectorateShare: number;
  electorateLeads: number;
};

type ElectorateSummary = {
  pollId: string;
  slug: string;
  name: string;
  code: string | null;
  status: string;
  totalResponses: number;
  leader: PartySummary | null;
  leaderVotes: number;
  leaderShare: number;
};

const NON_LEADER_PARTY_KEYS = new Set(["undecided", "prefer_not_to_say"]);

const SHORT_PARTY_NAMES: Record<string, string> = {
  act_new_zealand: "ACT",
  animal_justice_party_aotearoa_new_zealand: "Animal Justice",
  aotearoa_legalise_cannabis_party: "Cannabis Party",
  conservative_party_nz: "Conservative Party",
  new_zealand_first_party: "NZ First",
  new_zealand_labour_party: "Labour",
  new_zealand_outdoors_freedom_party: "Outdoors & Freedom",
  opportunity_party: "Opportunity Party",
  te_pati_maori: "Te Pāti Māori",
  the_green_party_of_aotearoa_new_zealand: "Green Party",
  the_new_zealand_national_party: "National Party",
  vision_new_zealand: "Vision NZ",
  womens_rights_party: "Women's Rights Party",
  another_registered_party: "Another party",
  undecided: "Undecided",
  prefer_not_to_say: "Prefer not to say",
};

function normalisePartyKey(row: SummaryRow) {
  return (
    row.party_key ||
    row.option_label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
  );
}

export default async function ElectionPulsePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_electorate_party_vote_summary"
  );

  const rows = (Array.isArray(data) ? data : []) as SummaryRow[];
  const electorateMap = new Map<string, SummaryRow[]>();

  for (const row of rows) {
    const key = row.poll_id;
    const existing = electorateMap.get(key) ?? [];
    existing.push(row);
    electorateMap.set(key, existing);
  }

  const partyTotals = new Map<
    string,
    Omit<PartySummary, "rawShare" | "equalElectorateShare" | "electorateLeads"> & {
      electoratePercentages: number[];
      electorateLeads: number;
    }
  >();

  const electorates: ElectorateSummary[] = [];
  let totalResponses = 0;

  for (const electorateRows of electorateMap.values()) {
    const electorateTotal = electorateRows.reduce(
      (sum, row) => sum + Number(row.vote_count || 0),
      0
    );
    totalResponses += electorateTotal;

    const ranked = [...electorateRows].sort((a, b) => {
      const voteDifference = Number(b.vote_count || 0) - Number(a.vote_count || 0);
      return voteDifference || a.display_order - b.display_order;
    });

    const leadingRow =
      electorateTotal > 0
        ? ranked.find((row) => !NON_LEADER_PARTY_KEYS.has(normalisePartyKey(row))) ?? null
        : null;
    const leadingKey = leadingRow ? normalisePartyKey(leadingRow) : null;

    for (const row of electorateRows) {
      const key = normalisePartyKey(row);
      const voteCount = Number(row.vote_count || 0);
      const current = partyTotals.get(key) ?? {
        key,
        label: row.option_label,
        shortLabel: row.short_label,
        logoUrl: row.logo_url,
        voteCount: 0,
        electoratePercentages: [],
        electorateLeads: 0,
      };

      current.voteCount += voteCount;
      if (electorateTotal > 0) {
        current.electoratePercentages.push((voteCount / electorateTotal) * 100);
      }

      if (key === leadingKey && voteCount > 0) {
        current.electorateLeads += 1;
      }

      partyTotals.set(key, current);
    }

    electorates.push({
      pollId: electorateRows[0].poll_id,
      slug: electorateRows[0].poll_slug,
      name: electorateRows[0].electorate_name || "Electorate",
      code: electorateRows[0].electorate_code,
      status: electorateRows[0].poll_status,
      totalResponses: electorateTotal,
      leader: leadingRow
        ? {
            key: normalisePartyKey(leadingRow),
            label: leadingRow.option_label,
            shortLabel: leadingRow.short_label,
            logoUrl: leadingRow.logo_url,
            voteCount: Number(leadingRow.vote_count || 0),
            rawShare: 0,
            equalElectorateShare: 0,
            electorateLeads: 0,
          }
        : null,
      leaderVotes: leadingRow ? Number(leadingRow.vote_count || 0) : 0,
      leaderShare:
        leadingRow && electorateTotal > 0
          ? (Number(leadingRow.vote_count || 0) / electorateTotal) * 100
          : 0,
    });
  }

  const parties: PartySummary[] = Array.from(partyTotals.values())
    .map((party) => ({
      key: party.key,
      label: party.label,
      shortLabel: party.shortLabel,
      logoUrl: party.logoUrl,
      voteCount: party.voteCount,
      rawShare: totalResponses > 0 ? (party.voteCount / totalResponses) * 100 : 0,
      equalElectorateShare:
        party.electoratePercentages.length > 0
          ? party.electoratePercentages.reduce((sum, value) => sum + value, 0) /
            party.electoratePercentages.length
          : 0,
      electorateLeads: party.electorateLeads,
    }))
    .sort((a, b) => b.rawShare - a.rawShare || a.label.localeCompare(b.label));

  const headlineParties = parties.filter(
    (party) => !NON_LEADER_PARTY_KEYS.has(party.key)
  );
  const leadingParty = headlineParties.find((party) => party.voteCount > 0) ?? null;
  const activeElectorates = electorates.filter(
    (electorate) => electorate.status === "open"
  ).length;
  const lastUpdated = new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-neutral-950">
      <BrandHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_30px_90px_rgba(38,31,20,0.08)]">
          <div className="h-1.5 bg-gradient-to-r from-[#7b1025] via-[#9a1730] to-[#b88a2a]" />
          <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.35fr_.65fr] lg:p-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9d741f]">
                Webfit News Election Pulse 2026
              </p>
              <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                Electorate party vote dashboard
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-neutral-600">
                A live summary of verified reader participation across individual New Zealand electorate party vote polls.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm font-medium text-neutral-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2">
                  <ShieldCheck size={16} className="text-[#7b1025]" />
                  One electorate party response per email
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2">
                  <BarChart3 size={16} className="text-[#7b1025]" />
                  Participant results, not an election forecast
                </span>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <DashboardRefreshButton />
                <p className="text-sm text-neutral-500">Last updated {lastUpdated} NZ time</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <MetricCard label="Verified responses" value={totalResponses} icon={<Users size={20} />} />
              <MetricCard label="Electorates reporting" value={electorates.length} icon={<MapPin size={20} />} />
              <MetricCard label="Polls currently open" value={activeElectorates} icon={<CheckCircle2 size={20} />} />
            </div>
          </div>
        </section>

        {error ? (
          <section className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-7">
            <h2 className="text-xl font-semibold text-red-950">Summary unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-red-900/75">
              The Stage 2 database function has not been installed or could not be read.
            </p>
          </section>
        ) : rows.length === 0 ? (
          <section className="mt-8 rounded-[2rem] border border-black/10 bg-white p-8 text-center shadow-sm">
            <MapPin className="mx-auto text-[#7b1025]" size={32} />
            <h2 className="mt-4 text-2xl font-semibold">No electorate results yet</h2>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-neutral-600">
              Electorate polls will appear here as they are published. Manurewa is the first pilot electorate.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-3 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b88a2a]">
                      Combined participant preference
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">All verified responses</h2>
                  </div>
                  {leadingParty && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#7b1025]/8 px-4 py-2 text-sm font-semibold text-[#7b1025]">
                      <Trophy size={16} />
                      Current leader: {leadingParty.shortLabel || leadingParty.label}
                    </div>
                  )}
                </div>

                {totalResponses === 0 ? (
                  <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#b88a2a]/50 bg-[#fbf8f1] px-6 py-10 text-center">
                    <BarChart3 className="mx-auto text-[#7b1025]" size={30} />
                    <h3 className="mt-4 text-xl font-semibold">No verified responses yet</h3>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-600">
                      Ranked party results will appear here after the first verified participant completes an electorate party vote.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    {parties.map((party, index) => (
                      <PartyResultCard key={party.key} party={party} rank={index + 1} />
                    ))}
                  </div>
                )}
              </div>

              <aside className="space-y-6">
                <div className="rounded-[2rem] border border-black/10 bg-[#17130f] p-6 text-white shadow-sm sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d9b45d]">
                    How to read this dashboard
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold">Two national views</h2>
                  <div className="mt-6 space-y-5 text-sm leading-6 text-white/70">
                    <div>
                      <p className="font-semibold text-white">Raw participant share</p>
                      <p className="mt-1">All verified votes are combined. A high-response electorate therefore contributes more to this figure.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Equal-electorate average</p>
                      <p className="mt-1">Each electorate with at least one verified response receives equal weight, regardless of how many people participated there.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-[#b88a2a]/30 bg-[#fbf8f1] p-6 sm:p-8">
                  <h2 className="text-xl font-semibold">Important limitation</h2>
                  <p className="mt-3 text-sm leading-7 text-neutral-600">
                    These are voluntary Webfit News reader participation results. They are not weighted by age, geography, ethnicity or past voting behaviour and must not be presented as projected seats or a scientific national poll.
                  </p>
                </div>
              </aside>
            </section>

            <section className="mt-8 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
              <div className="border-b border-black/10 pb-6">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b88a2a]">
                  Electorate-by-electorate
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Current local leaders</h2>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {electorates
                  .sort((a, b) => a.name.localeCompare(b.name, "en-NZ"))
                  .map((electorate) => (
                    <Link
                      key={electorate.pollId}
                      href={`/polls/${electorate.slug}`}
                      className="group rounded-[1.5rem] border border-black/10 p-5 transition hover:-translate-y-0.5 hover:border-[#b88a2a] hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
                          <MapPin size={15} />
                          {electorate.name}
                        </span>
                        <ArrowRight size={17} className="text-neutral-400 transition group-hover:translate-x-1 group-hover:text-[#7b1025]" />
                      </div>

                      {electorate.totalResponses > 0 && electorate.leader ? (
                        <div className="mt-5">
                          <p className="text-sm text-neutral-500">Leading participant preference</p>
                          <div className="mt-3 flex items-center gap-3">
                            <PartyLogo label={electorate.leader.label} logoUrl={electorate.leader.logoUrl} />
                            <div className="min-w-0">
                              <p className="truncate text-lg font-semibold">{getPartyDisplayName(electorate.leader)}</p>
                              <p className="text-sm font-semibold text-[#7b1025]">{electorate.leaderShare.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-5 text-sm leading-6 text-neutral-500">No verified responses yet.</p>
                      )}

                      <p className="mt-5 border-t border-black/10 pt-4 text-xs font-medium text-neutral-500">
                        {electorate.totalResponses.toLocaleString("en-NZ")} verified responses
                      </p>
                    </Link>
                  ))}
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.4rem] border border-[#b88a2a]/25 bg-[#fbf8f1] p-5">
      <div className="flex items-center gap-2 text-[#7b1025]">{icon}<span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">{label}</span></div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value.toLocaleString("en-NZ")}</p>
    </div>
  );
}

function getPartyDisplayName(party: Pick<PartySummary, "key" | "label" | "shortLabel">) {
  return party.shortLabel || SHORT_PARTY_NAMES[party.key] || party.label;
}

function PartyResultCard({ party, rank }: { party: PartySummary; rank: number }) {
  return (
    <article className="rounded-[1.25rem] border border-black/10 p-3.5 sm:p-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="w-6 shrink-0 text-center text-sm font-bold text-neutral-400">{rank}</span>
        <PartyLogo label={party.label} logoUrl={party.logoUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{getPartyDisplayName(party)}</h3>
              <p className="mt-1 text-[11px] leading-5 text-neutral-500">{party.voteCount.toLocaleString("en-NZ")} responses · leading {party.electorateLeads} electorate poll{party.electorateLeads === 1 ? "" : "s"}</p>
            </div>
            <p className="shrink-0 text-lg font-semibold text-[#7b1025]">{party.rawShare.toFixed(1)}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-gradient-to-r from-[#7b1025] to-[#b88a2a]" style={{ width: `${Math.min(100, party.rawShare)}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">Equal-electorate average: <strong className="text-neutral-700">{party.equalElectorateShare.toFixed(1)}%</strong></p>
        </div>
      </div>
    </article>
  );
}
