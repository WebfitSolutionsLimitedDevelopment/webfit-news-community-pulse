import { loadCandidateRaces } from "@/lib/candidate-results";
import { LiveSideRails } from "@/components/live-side-rails";

export async function CompletedCounts() {
  const races = await loadCandidateRaces();
  return <LiveSideRails races={races} />;
}
