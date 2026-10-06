/**
 * Money and banking reader polls. Each slug must match a row in `polls`
 * (created by supabase/money-polls-2026.sql) and a page under /polls.
 */
export type MoneyPoll = {
  slug: string;
  eyebrow: string;
  title: string;
  question: string;
  choiceHint: string;
};

export const MONEY_POLLS: MoneyPoll[] = [
  {
    slug: "send-money-to-india-2026",
    eyebrow: "Sending money to India",
    title: "Sending money to India",
    question: "Which app or bank do you use to send money to India?",
    choiceHint: "Choose the app or bank you use most often.",
  },
  {
    slug: "term-deposits-2026",
    eyebrow: "Savings",
    title: "Term deposits",
    question: "Which bank do you use for term deposits?",
    choiceHint: "Choose the bank that holds your main term deposit.",
  },
  {
    slug: "home-loans-2026",
    eyebrow: "Home loans",
    title: "Home loans",
    question: "Which bank is your home loan with?",
    choiceHint: "Choose the bank your main home loan is with.",
  },
];

export const MONEY_POLL_SLUGS = new Set(MONEY_POLLS.map((poll) => poll.slug));

export function getMoneyPoll(slug: string) {
  const poll = MONEY_POLLS.find((item) => item.slug === slug);
  if (!poll) throw new Error(`Unknown money poll: ${slug}`);
  return poll;
}
