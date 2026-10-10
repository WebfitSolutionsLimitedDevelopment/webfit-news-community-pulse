import type { MoneyPoll } from "@/lib/money-polls";

/** October 2026 community polls using the shared browser voting flow. */
export const COMMUNITY_POLLS: MoneyPoll[] = [
  {
    "slug": "same-party-2026",
    "eyebrow": "Changed your mind?",
    "title": "Would you vote for the same party again?",
    "question": "Would you vote for the same party you backed in 2023?",
    "choiceHint": "Think about your party vote in the 2023 general election."
  },
  {
    "slug": "children-future-nz-2026",
    "eyebrow": "The next generation",
    "title": "A future in New Zealand?",
    "question": "Would you encourage your children to build their future in New Zealand?",
    "choiceHint": "Choose the answer closest to your view, even if you do not have children."
  },
  {
    "slug": "buy-your-home-today-2026",
    "eyebrow": "The home affordability test",
    "title": "Could you buy your home today?",
    "question": "Could you afford your current home if you had to buy it today?",
    "choiceHint": "Consider today's price, your deposit and your current borrowing capacity."
  },
  {
    "slug": "mp-median-wage-2026",
    "eyebrow": "What should MPs earn?",
    "title": "MPs on the median wage?",
    "question": "Should MPs receive the median New Zealand wage?",
    "choiceHint": "Consider MPs' base salary, excluding work expenses. Median means the middle wage, not the average."
  }
];

export function getCommunityPoll(slug: string) {
  const poll = COMMUNITY_POLLS.find((item) => item.slug === slug);
  if (!poll) throw new Error(`Unknown community poll: ${slug}`);
  return poll;
}
