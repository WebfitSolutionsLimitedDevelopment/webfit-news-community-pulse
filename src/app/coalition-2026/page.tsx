import Link from "next/link";
import { ArrowRight, Crown, Scale, Users } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button";
import { PartyLogo } from "@/components/party-logo";
import { SiteFooter } from "@/components/site-footer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Coalition Pulse 2026 | Webfit News",
  description:
    "Who would form the government? Live coalition picture from Webfit News Election Pulse reader votes.",
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

export default async function CoalitionPage() {
  const { parties, error } = await loadParties();

  const blocShare = (bloc: BlocKey) =>
    parties.filter((p) => p.bloc === bloc).reduce((sum, p) => sum + p.share, 0);
  const gov = blocShare("government");
  const opp = blocShare("opposition");
  const other = blocShare("other");
  const others = parties.filter((p) => p.bloc === "other");

  // Kingmaker: an outside party that would push a bloc past 50% on its own.
  const kingmakers =
    gov <= 50 && opp <= 50
      ? others.filter((p) => gov + p.share > 50 || opp + p.share > 50)
      : [];

  let verdict: { title: string; detail: string; colour: string };
  if (parties.length === 0) {
    verdict = {
      title: "Waiting for the first votes",
      detail: "The coalition picture appears as soon as readers start voting.",
      colour: "#525252",
    };
  } else if (gov > 50) {
    verdict = {
      title: "The current government would be returned",
      detail: `National, ACT and NZ First together hold ${fmt(gov)} of reader votes, a majority on their own.`,
      colour: BLOC_META.government.colour,
    };
  } else if (opp > 50) {
    verdict = {
      title: "A change of government",
      detail: `Labour, the Greens and Te Pāti Māori together hold ${fmt(opp)} of reader votes, a majority on their own.`,
      colour: BLOC_META.opposition.colour,
    };
  } else {
    const leader = gov === opp ? null : gov > opp ? "government" : "opposition";
    verdict = {
      title: "No bloc has a majority",
      detail: leader
        ? `${leader === "government" ? "The current government" : "The opposition"} is ahead, but would need support from outside its bloc to govern.`
        : "The two blocs are tied, so smaller parties decide who governs.",
      colour: BLOC_META.other.colour,
    };
  }

  const lastUpdated = new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-neutral-950">
      <BrandHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Hero + verdict */}
        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_30px_90px_rgba(38,31,20,0.08)]">
          <div className="h-1.5 bg-gradient-to-r from-[#1f4e8c] via-[#b88a2a] to-[#b3202a]" />
          <div className="p-6 sm:p-9 lg:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9d741f]">
              Webfit News Coalition Pulse 2026
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Who would form the government?
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
              A live coalition picture from Election Pulse reader votes, grouped the way
              Parliament lines up today.
            </p>

            {!error && (
              <div
                className="mt-8 rounded-[1.5rem] border-l-4 bg-neutral-50 p-6"
                style={{ borderColor: verdict.colour }}
              >
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em]" style={{ color: verdict.colour }}>
                  <Scale size={16} /> Current picture
                </p>
                <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{verdict.title}</h2>
                <p className="mt-2 max-w-3xl leading-7 text-neutral-600">{verdict.detail}</p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/electorates-2026"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#7b1025] px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-[#5c0b1b]"
              >
                Vote now <ArrowRight size={18} />
              </Link>
              <DashboardRefreshButton />
              <p className="text-sm text-neutral-500">Last updated {lastUpdated} NZ time</p>
            </div>
          </div>
        </section>

        {error ? (
          <section className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-7 text-red-950">
            The coalition picture could not be loaded right now. Please try again shortly.
          </section>
        ) : parties.length > 0 ? (
          <>
            {/* Majority bar */}
            <section className="mt-8 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-2xl font-semibold">Race to a majority</h2>
                <p className="text-sm text-neutral-500">More than 50% needed to govern alone</p>
              </div>

              <div className="relative mt-6">
                <div className="flex h-14 overflow-hidden rounded-2xl bg-neutral-100">
                  {(["government", "other", "opposition"] as BlocKey[]).map((bloc) => {
                    const share = bloc === "government" ? gov : bloc === "opposition" ? opp : other;
                    if (share <= 0) return null;
                    return (
                      <div
                        key={bloc}
                        className="flex items-center justify-center text-sm font-bold text-white"
                        style={{ width: `${share}%`, background: BLOC_META[bloc].colour }}
                        title={`${BLOC_META[bloc].name}: ${fmt(share)}`}
                      >
                        {share >= 8 ? fmt(share) : ""}
                      </div>
                    );
                  })}
                </div>
                {/* 50% line */}
                <div className="pointer-events-none absolute inset-y-[-8px] left-1/2 w-0.5 -translate-x-1/2 bg-neutral-900" />
                <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-neutral-700">
                  50% majority line
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {(["government", "opposition", "other"] as BlocKey[]).map((bloc) => {
                  const share = bloc === "government" ? gov : bloc === "opposition" ? opp : other;
                  const gap = 50 - share;
                  return (
                    <div key={bloc} className="rounded-2xl p-4" style={{ background: BLOC_META[bloc].soft }}>
                      <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: BLOC_META[bloc].colour }}>
                        {BLOC_META[bloc].name}
                      </p>
                      <p className="mt-1 text-3xl font-semibold">{fmt(share)}</p>
                      <p className="mt-1 text-xs text-neutral-600">
                        {bloc === "other"
                          ? BLOC_META.other.parties
                          : share > 50
                            ? "Majority on its own"
                            : `${fmt(gap)} short of a majority`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Kingmakers */}
            {kingmakers.length > 0 && (
              <section className="mt-8 rounded-[2rem] border border-[#b88a2a]/40 bg-[#fbf8f1] p-6 sm:p-8">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#9d741f]">
                  <Crown size={16} /> Kingmaker
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {kingmakers.length === 1 ? "One party holds the balance" : "These parties hold the balance"}
                </h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {kingmakers.map((p) => {
                    const withGov = gov + p.share > 50;
                    const withOpp = opp + p.share > 50;
                    return (
                      <div key={p.key} className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-4">
                        <PartyLogo partyKey={p.key} label={p.label} logoUrl={p.logoUrl} />
                        <div className="min-w-0">
                          <p className="font-semibold">{p.label} · {fmt(p.share)}</p>
                          <p className="text-sm leading-6 text-neutral-600">
                            Could give a majority to{" "}
                            {withGov && withOpp
                              ? "either side"
                              : withGov
                                ? "the current government"
                                : "the opposition"}
                            .
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Party breakdown by bloc */}
            <section className="mt-8 grid gap-6 lg:grid-cols-3">
              {(["government", "opposition", "other"] as BlocKey[]).map((bloc) => {
                const list = parties.filter((p) => p.bloc === bloc);
                return (
                  <div key={bloc} className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: BLOC_META[bloc].colour }} />
                      <h3 className="font-semibold">{BLOC_META[bloc].name}</h3>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">{BLOC_META[bloc].parties}</p>

                    {list.length === 0 ? (
                      <p className="mt-5 text-sm text-neutral-500">No votes yet.</p>
                    ) : (
                      <ul className="mt-5 space-y-4">
                        {list.map((p) => (
                          <li key={p.key}>
                            <div className="flex items-center gap-3">
                              <PartyLogo partyKey={p.key} label={p.label} logoUrl={p.logoUrl} size="sm" />
                              <span className="flex-1 truncate text-sm font-semibold">{p.label}</span>
                              <span className="text-sm font-semibold" style={{ color: BLOC_META[bloc].colour }}>
                                {fmt(p.share)}
                              </span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.min(100, p.share)}%`, background: BLOC_META[bloc].colour }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </section>
          </>
        ) : (
          <section className="mt-8 rounded-[2rem] border border-black/10 bg-white p-8 text-center shadow-sm">
            <Users className="mx-auto text-[#7b1025]" size={32} />
            <h2 className="mt-4 text-2xl font-semibold">No votes yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-neutral-600">Be the first to vote in your electorate.</p>
          </section>
        )}

        <section className="mt-8 rounded-[2rem] border border-[#b88a2a]/30 bg-[#fbf8f1] p-6 sm:p-8">
          <h2 className="text-xl font-semibold">How this works</h2>
          <p className="mt-3 text-sm leading-7 text-neutral-600">
            Shares are each party&apos;s percentage of reader votes across all electorate polls,
            leaving out &ldquo;undecided&rdquo; and &ldquo;prefer not to say&rdquo;. Parties are
            grouped by today&apos;s line-up in Parliament. This is a simplified picture: it does not
            convert votes into seats, apply the 5% threshold or count electorate wins. These are
            voluntary Webfit News reader results, not a scientific poll or an election forecast.
          </p>
          <Link href="/election-pulse-2026" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#7b1025]">
            See party-by-party results <ArrowRight size={16} />
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
