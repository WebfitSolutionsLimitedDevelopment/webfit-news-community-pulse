"use client";

import { ElectoratePartyVoteForm } from "@/components/electorate-party-vote-form";

type PollOption = {
  id: string;
  label: string;
  short_label: string | null;
  description: string | null;
  logo_url: string | null;
  colour_hex: string | null;
  website_url: string | null;
};

type VotingFormProps = {
  pollId: string;
  pollSlug: string;
  votingOpen: boolean;
  options: PollOption[];
};

/** Open (no email / no OTP) single-step vote for general party-vote style polls. */
export function VotingForm(props: VotingFormProps) {
  return <ElectoratePartyVoteForm {...props} />;
}
