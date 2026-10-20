import Link from "next/link";
import { ArrowRight, Scale, Users } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button";
import { PartyLogo } from "@/components/party-logo";
import { SiteFooter } from "@/components/site-footer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Coalition Pulse 2026 | Webfit News",
  description:
    "Explore current government and opposition bloc preferences among voluntary Webfit News Election Pulse readers.",
};

type SummaryOption = {
  party_key: string | null;
  option_label: string;
  short_label: string | null;
  logo_url: string | null;
  vote_count: number | string;
};

type SummaryRow = { options: SummaryOption[] | null };

type BlocKey = "government" | "opposition" | "other";

type Party = {
  key: string;
  label: string;
  logoUrl: string | null;
  share: number; // % of decided votes
  bloc: BlocKey;
};

// Current coalition blocs. Edit here if the line-up changes.
const GOVERNMENT_PARTIES = new Set([
  "the_new_zealand_national_party",
  "act_new_zealand",
  "new_zealand_first_party",
]);
const OPPOSITION_PARTIES = new Set([
  "new_zealand_labour_party",
  "the_green_party_of_aotearoa_new_zealand",
  "te_pati_maori",
]);
// Not a party choice, so excluded from the shares.
const NOT_DECIDED = new Set(["undecided", "prefer_not_to_say"]);

const SHORT_NAMES: Record<string, string> = {
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

const BLOC_META: Record<BlocKey, { name: string; parties: string; colour: string; soft: string }> = {
  government: {
    name: "Current government",
    parties: "National · ACT · NZ First",
    colour: "#1f4e8c",
    soft: "#eaf0f8",
  },
  opposition: {
    name: "Opposition",
    parties: "Labour · Green · Te Pāti Māori",
    colour: "#b3202a",
    soft: "#f9eaeb",
  },
  other: {
    name: "Other parties",
    parties: "Not in either bloc",
    colour: "#8a6d1f",
    soft: "#f7f1e2",
  },
};

function partyKey(option: SummaryOption) {
  return (
    option.party_key ||
    option.option_label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
  );
}

function fmt(value: number) {
  return `${value.toFixed(1)}%`;
}

async function loadParties(): Promise<{ parties: Party[]; error: boolean }> {
  // Service-role client: the summary includes raw counts, which never leave the server.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_electorate_party_vote_summary");
  if (error) return { parties: [], error: true };

  const totals = new Map<string, { label: string; logoUrl: string | null; votes: number }>();
  for (const row of (Array.isArray(data) ? data : []) as SummaryRow[]) {
    for (const option of row.options ?? []) {
      const key = partyKey(option);
      if (NOT_DECIDED.has(key)) continue;
      const current = totals.get(key) ?? {
        label: option.short_label || SHORT_NAMES[key] || option.option_label,
        logoUrl: option.logo_url,
        votes: 0,
      };
      current.votes += Number(option.vote_count || 0);
      totals.set(key, current);
    }
  }

  const decided = Array.from(totals.values()).reduce((sum, p) => sum + p.votes, 0);
  const parties = Array.from(totals.entries())
    .map(([key, p]) => ({
      key,
      label: SHORT_NAMES[key] || p.label,
      logoUrl: p.logoUrl,
      share: decided > 0 ? (p.votes / decided) * 100 : 0,
      bloc: (GOVERNMENT_PARTIES.has(key)
        ? "government"
        : OPPOSITION_PARTIES.has(key)
          ? "opposition"
          : "other") as BlocKey,
    }))
    .filter((p) => p.share > 0)
    .sort((a, b) => b.share - a.share);

  return { parties, error: false };
}

const BLOC_ORDER: BlocKey[] = ["government", "other", "opposition"];

/** Half-donut of participating reader-vote shares, not parliamentary seats. */
function MajorityArc({ shares }: { shares: Record<BlocKey, number> }) {
  // Semicircle from left (180°) to right (0°); pathLength=100 lets dash values be percentages.
  const arc = "M 20 120 A 100 100 0 0 1 220 120";
  // Where each bloc's segment starts along the arc (cumulative share).
  const starts = BLOC_ORDER.map((_, i) =>
    BLOC_ORDER.slice(0, i).reduce((sum, bloc) => sum + Math.max(0, shares[bloc]), 0),
  );
  return (
    <svg viewBox="0 0 240 140" className="mx-auto w-full max-w-md" role="img" aria-label="Share of reader votes by bloc">
      <path d={arc} fill="none" stroke="#ece7dc" strokeWidth="34" pathLength={100} />
      {BLOC_ORDER.map((bloc, i) => {
        const share = shares[bloc];
        if (share <= 0) return null;
        return (
          <path
            key={bloc}
            d={arc}
            fill="none"
            stroke={BLOC_META[bloc].colour}
            strokeWidth="34"
            pathLength={100}
            strokeDasharray={`${share} 100`}
            strokeDashoffset={-starts[i]}
          />
        );
      })}
      <text x="120" y="112" textAnchor="middle" fontSize="10" fontWeight="700" fill="#525252" letterSpacing="0.8">
        READER VOTE SHARE
      </text>
    </svg>
  );
}

export default async function CoalitionPage() {
  const { parties, error } = await loadParties();

  const blocShare = (bloc: BlocKey) =>
    parties.filter((p) => p.bloc === bloc).reduce((sum, p) => sum + p.share, 0);
  const shares: Record<BlocKey, number> = {
    government: blocShare("government"),
    opposition: blocShare("opposition"),
    other: blocShare("other"),
  };
  const gov = shares.government;
  const opp = shares.opposition;
  const topShare = parties.reduce((max, p) => Math.max(max, p.share), 0);

  const gap = Math.abs(gov - opp);
  const leader = gov > opp ? "government" : opp > gov ? "opposition" : null;
  const verdict = parties.length === 0
    ? { eyebrow: "Waiting for responses", title: "No reader votes yet", share: null as number | null, detail: "Results will appear when readers participate.", colour: "#404040" }
    : leader === "government"
      ? { eyebrow: "Current reader-poll picture", title: "Government bloc leads", share: gov as number | null, detail: `Ahead of the opposition bloc by ${gap.toFixed(1)} percentage points among participating readers.`, colour: BLOC_META.government.colour }
      : leader === "opposition"
        ? { eyebrow: "Current reader-poll picture", title: "Opposition bloc leads", share: opp as number | null, detail: `Ahead of the government bloc by ${gap.toFixed(1)} percentage points among participating readers.`, colour: BLOC_META.opposition.colour }
        : { eyebrow: "Current reader-poll picture", title: "Blocs neck and neck", share: gov as number | null, detail: "Government and opposition blocs have equal shares among participating readers.", colour: "#6b5417" };

  const lastUpdated = new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" }).format(new Date());

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-neutral-950">
      <BrandHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9d741f]">
          Webfit News Coalition Pulse 2026
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
          How are the blocs tracking?
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
          Current party preferences from voluntary Webfit News Election Pulse readers, grouped by the parties in each bloc. This is not a parliamentary seat projection.
        </p>

        {error ? (
          <section className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-7 text-red-950">
            <p>The coalition picture could not be loaded right now. Please try again shortly.</p>
            {/* Voting can still work when the results RPC fails, so keep the CTA. */}
            <Link
              href="/electorates-2026"
              className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#7b1025] px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-[#5c0b1b]"
            >
              Vote now <ArrowRight size={18} />
            </Link>
          </section>
        ) : (
          <>
            {/* Verdict + arc: the shareable hero */}
            <section className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_90px_rgba(38,31,20,0.10)]">
              <div className="grid lg:grid-cols-[1fr_1.1fr]">
                <div className="flex flex-col justify-center p-7 text-white sm:p-10" style={{ background: verdict.colour }}>
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-white/90">
                    <Scale size={15} /> {verdict.eyebrow}
                  </p>
                  <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">
                    {verdict.title}
                  </h2>
                  {verdict.share !== null && (
                    <p className="mt-2 text-6xl font-bold tracking-[-0.04em] sm:text-7xl">{fmt(verdict.share)}</p>
                  )}
                  <p className="mt-4 max-w-md text-base leading-7 text-white/85">{verdict.detail}</p>
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Link
                      href="/electorates-2026"
                      className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-neutral-900 shadow-lg transition hover:bg-neutral-100"
                    >
                      Vote now <ArrowRight size={18} />
                    </Link>
                    <span className="text-xs text-white/85">Viewed {lastUpdated} NZ time · live totals, not a recorded snapshot</span>
                  </div>
                </div>

                <div className="p-6 sm:p-9">
                  <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                    Share of participating reader votes
                  </p>
                  <div className="mt-4">
                    <MajorityArc shares={shares} />
                  </div>
                  <ul className="mt-5 grid grid-cols-3 gap-2 text-center">
                    {(["government", "other", "opposition"] as BlocKey[]).map((bloc) => (
                      <li key={bloc}>
                        <span className="mx-auto block h-2 w-8 rounded-full" style={{ background: BLOC_META[bloc].colour }} />
                        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500">
                          {bloc === "government" ? "Government" : bloc === "opposition" ? "Opposition" : "Others"}
                        </p>
                        <p className="text-xl font-semibold sm:text-2xl" style={{ color: BLOC_META[bloc].colour }}>
                          {fmt(shares[bloc])}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {parties.length > 0 && (
              <section className="mt-6 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm sm:p-7" aria-label="Coalition bloc comparison">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-xl font-semibold">Government vs opposition</h2>
                  <p className="text-sm font-semibold text-neutral-700">{leader ? `${gap.toFixed(1)} percentage-point gap` : "Blocs tied"}</p>
                </div>
                <div className="mt-5 flex h-5 w-full overflow-hidden rounded-full bg-neutral-100" role="img" aria-label={`Government ${fmt(gov)}, opposition ${fmt(opp)}, other parties ${fmt(shares.other)}`}>
                  {(["government", "opposition", "other"] as BlocKey[]).map((bloc) => (
                    <div key={bloc} style={{ width: `${shares[bloc]}%`, background: BLOC_META[bloc].colour }} />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:text-left">
                  {(["government", "opposition", "other"] as BlocKey[]).map((bloc) => (
                    <div key={bloc} className="min-w-0">
                      <p className="text-xs text-neutral-600">{BLOC_META[bloc].name}</p>
                      <p className="text-lg font-bold tabular-nums sm:text-2xl" style={{ color: BLOC_META[bloc].colour }}>{fmt(shares[bloc])}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-neutral-500">These are reader-vote percentages, not parliamentary seats or an election outcome. Movement arrows will be added only after verified historical snapshots are available.</p>
              </section>
            )}

            {/* One card per bloc: total + its parties */}
            {parties.length > 0 && (
              <section className="mt-6 grid gap-5 lg:grid-cols-3">
                {(["government", "opposition", "other"] as BlocKey[]).map((bloc) => {
                  const list = parties.filter((p) => p.bloc === bloc);
                  const share = shares[bloc];
                  const status = bloc === "other"
                    ? "Outside the two blocs"
                    : share >= 50 ? "Over 50% of participating reader votes" : "Under 50% of participating reader votes";
                  return (
                    <div key={bloc} className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-sm">
                      <div className="h-1.5" style={{ background: BLOC_META[bloc].colour }} />
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{BLOC_META[bloc].name}</h3>
                            <p className="mt-0.5 text-xs text-neutral-500">{BLOC_META[bloc].parties}</p>
                          </div>
                          <p className="text-3xl font-semibold tracking-tight" style={{ color: BLOC_META[bloc].colour }}>
                            {fmt(share)}
                          </p>
                        </div>
                        <p
                          className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                          style={{ background: BLOC_META[bloc].soft, color: BLOC_META[bloc].colour }}
                        >
                          {status}
                        </p>

                        {list.length === 0 ? (
                          <p className="mt-5 text-sm text-neutral-500">No votes yet.</p>
                        ) : (
                          <ul className="mt-5 space-y-4">
                            {list.map((p) => (
                              <li key={p.key}>
                                <div className="flex items-center gap-3">
                                  <PartyLogo partyKey={p.key} label={p.label} logoUrl={p.logoUrl} size="sm" />
                                  <span className="flex-1 truncate font-semibold">{p.label}</span>
                                  <span className="font-semibold tabular-nums">{fmt(p.share)}</span>
                                </div>
                                {/* Bars scale to the leading party so differences are visible */}
                                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${topShare > 0 ? (p.share / topShare) * 100 : 0}%`,
                                      background: BLOC_META[bloc].colour,
                                    }}
                                  />
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {parties.length === 0 && (
              <section className="mt-6 rounded-[2rem] border border-black/10 bg-white p-8 text-center shadow-sm">
                <Users className="mx-auto text-[#7b1025]" size={32} />
                <p className="mx-auto mt-3 max-w-xl text-neutral-600">Be the first to vote in your electorate.</p>
              </section>
            )}
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <DashboardRefreshButton />
          <Link href="/election-pulse-2026" className="inline-flex items-center gap-2 text-sm font-semibold text-[#7b1025]">
            See party-by-party results <ArrowRight size={16} />
          </Link>
        </div>

        <p className="mt-6 text-xs leading-6 text-neutral-500">
          <strong className="text-neutral-700">How this works:</strong>{" "}shares are each party&apos;s
          percentage of reader votes across all electorate polls, leaving out &ldquo;undecided&rdquo; and
          &ldquo;prefer not to say&rdquo;, grouped by today&apos;s line-up in Parliament. It does not convert
          votes into seats, apply the 5% threshold or count electorate wins. Figures are recalculated when the page loads; the view time is not a vote timestamp. Voluntary Webfit News reader
          results, not a scientific poll or an election forecast.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
