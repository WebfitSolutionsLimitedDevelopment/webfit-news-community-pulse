import "server-only";

export const ADVANCE_SOURCE = "https://vote.nz/2026-general-election/about/overview/voting-statistics";
export const POLLS_CLOSE = Date.parse("2026-11-07T19:00:00+13:00");
const snapshot = { date: "5 November", total: 1666908, equivalent2023: 1379985, full2023: 1640204 };

function parseAdvanceVoting(html: string) {
  let total = 0;
  let cumulative2023 = 0;
  let equivalent2023 = 0;
  let date = "";
  for (const [, row] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from(row.matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi), ([, , cell]) =>
      cell.replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, "").replace(/<[^>]*>/g, " ").trim(),
    );
    if (cells.length !== 4) continue;
    const [day, , oldVotes, newVotes] = cells;
    const previous = parseVoteCount(oldVotes);
    const current = parseVoteCount(newVotes);
    if (/^totals?$/i.test(day) && date && current === total && total >= snapshot.total && previous !== null) {
      return { date, total, equivalent2023, full2023: previous };
    }
    if (!/^\d{1,2}\s+(October|November)$/i.test(day)) continue;
    cumulative2023 += previous ?? 0;
    if (current !== null) {
      total += current;
      equivalent2023 = cumulative2023;
      date = day.replace(/^0/, "");
    }
  }
  return snapshot;
}

function parseVoteCount(value: string) {
  return /^\d[\d,]*$/.test(value) ? Number(value.replace(/,/g, "")) : null;
}

export async function loadAdvanceVoting() {
  try {
    const response = await fetch(ADVANCE_SOURCE, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(4500),
    });
    if (response.ok) return parseAdvanceVoting(await response.text());
  } catch {
    // Keep showing the dated snapshot if Vote NZ is unavailable.
  }
  return snapshot;
}
