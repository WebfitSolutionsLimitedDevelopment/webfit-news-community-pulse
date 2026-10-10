import { ReaderPollPage } from "@/components/reader-poll-page";
import { getCommunityPoll } from "@/lib/community-polls";

const poll = getCommunityPoll("children-future-nz-2026");

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${poll.title} | Webfit News Community Pulse`,
  description: poll.question,
};

export default function Page() {
  return <ReaderPollPage slug={poll.slug} config={poll} />;
}
