import { ReaderPollPage } from "@/components/reader-poll-page";
import { getMoneyPoll } from "@/lib/money-polls";

const poll = getMoneyPoll("send-money-to-india-2026");

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${poll.title} | Webfit News Community Pulse`,
  description: poll.question,
};

export default function Page() {
  return <ReaderPollPage slug={poll.slug} />;
}
