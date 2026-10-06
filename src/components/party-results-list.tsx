"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { PartyLogo } from "@/components/party-logo";

type PartyResult = {
  key: string;
  label: string;
  shortLabel: string | null;
  logoUrl: string | null;
  rawShare: number;
  equalElectorateShare: number;
  electorateLeads: number;
};

const SHORT_PARTY_NAMES: Record<string, string> = {
  act_new_zealand: "ACT",
  animal_justice_party_aotearoa_new_zealand: "Animal Justice Party",
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

function getPartyDisplayName(party: PartyResult) {
  return party.shortLabel || SHORT_PARTY_NAMES[party.key] || party.label;
}

function getCompetitionRank(party: PartyResult, parties: PartyResult[]) {
  return (
    1 +
    parties.filter((item) => item.rawShare > party.rawShare).length
  );
}

export function PartyResultsList({ parties }: { parties: PartyResult[] }) {
  const [showAll, setShowAll] = useState(false);
  const partiesWithVotes = parties.filter((party) => party.rawShare > 0);
  const zeroVoteParties = parties.filter((party) => party.rawShare === 0);
  const visibleParties = showAll ? parties : partiesWithVotes;
  // The equal-electorate view only exists once at least one electorate has unlocked results.
  const hasEqualAverage = parties.some((party) => party.equalElectorateShare > 0);

  return (
    <div className="mt-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {visibleParties.map((party) => (
          <PartyResultCard
            key={party.key}
            party={party}
            rank={getCompetitionRank(party, parties)}
            showEqualAverage={hasEqualAverage}
          />
        ))}
      </div>

      {zeroVoteParties.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-[#b88a2a] hover:bg-[#fbf8f1]"
          aria-expanded={showAll}
        >
          {showAll ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          {showAll
            ? "Show fewer parties"
            : `Show all parties (${zeroVoteParties.length} with no votes yet)`}
        </button>
      )}
    </div>
  );
}

function PartyResultCard({
  party,
  rank,
  showEqualAverage,
}: {
  party: PartyResult;
  rank: number;
  showEqualAverage: boolean;
}) {
  return (
    <article className="rounded-[1.25rem] border border-black/10 p-3.5 sm:p-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="w-6 shrink-0 text-center text-sm font-bold text-neutral-400">
          {rank}
        </span>
        <PartyLogo
          partyKey={party.key}
          label={party.label}
          logoUrl={party.logoUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">
                {getPartyDisplayName(party)}
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                Leading {party.electorateLeads}{" "}
                electorate poll{party.electorateLeads === 1 ? "" : "s"}
              </p>
            </div>
            <p className="shrink-0 text-lg font-semibold text-[#7b1025]">
              {party.rawShare.toFixed(1)}%
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7b1025] to-[#b88a2a]"
              style={{ width: `${Math.min(100, party.rawShare)}%` }}
            />
          </div>
          {showEqualAverage && (
          <p className="mt-2 text-[11px] text-neutral-500">
            Equal-electorate average:{" "}
            <strong className="text-neutral-700">
              {party.equalElectorateShare.toFixed(1)}%
            </strong>
          </p>
          )}
        </div>
      </div>
    </article>
  );
}
