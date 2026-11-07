import "server-only";
import { getXml } from "@/lib/official-results";

export type CandidateVote = { id: string; name: string; party: string; votes: number };
export type ElectorateRace = {
  id: string; name: string; updated: string | null; reporting: number;
  candidates: CandidateVote[]; validVotes: number;
};
function value(xml: string, name: string) {
  const text = xml.match(new RegExp("<" + name + ">([\\s\\S]*?)</" + name + ">"))?.[1] ?? "";
  return text.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&").replace(/&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}
function blocks(xml: string, name: string, attribute: string) {
  return Array.from(xml.matchAll(new RegExp("<" + name + "\\s+" + attribute + '="(\\d+)"[^>]*>([\\s\\S]*?)</' + name + ">", "g")),
    ([, id, body]) => ({ id, body }));
}

export function parseReferences(electoratesXml: string, candidatesXml: string, partiesXml: string) {
  const parties = new Map(blocks(partiesXml, "party", "p_no").map(({ id, body }) => [id, value(body, "short_name") || value(body, "party_name") || value(body, "abbrev")]));
  return {
    electorates: blocks(electoratesXml, "electorate", "e_no").map(({ id, body }) => ({ id, name: value(body, "electorate_name") })),
    candidates: new Map(blocks(candidatesXml, "candidate", "c_no").map(({ id, body }) => [id, {
      name: value(body, "candidate_name"), electorate: value(body, "electorate"),
      party: parties.get(value(body, "party")) || "Independent",
    }])),
  };
}

export function parseRace(xml: string, electorate: { id: string; name: string }, reference: ReturnType<typeof parseReferences>): ElectorateRace {
  if (!new RegExp('<electorate\\s+e_no="' + electorate.id + '"').test(xml)) throw new Error("Electorate feed mismatch");
  const candidateSection = value(xml, "candidatevotes");
  const candidates = blocks(candidateSection, "candidate", "c_no").map(({ id, body }) => {
    const info = reference.candidates.get(id);
    const votes = Number(value(body, "votes"));
    if (!info || info.electorate !== electorate.id || !Number.isSafeInteger(votes) || votes < 0) throw new Error("Invalid candidate result");
    return { id, name: info.name, party: info.party, votes };
  }).sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
  const reporting = Number(value(value(xml, "statistics"), "percent_voting_places_counted"));
  if (!candidates.length || !Number.isFinite(reporting) || reporting < 0 || reporting > 100) throw new Error("Incomplete electorate result");
  return {
    ...electorate, updated: xml.match(/\bupdated="([^"]+)"/)?.[1] ?? null,
    reporting, candidates, validVotes: candidates.reduce((sum, c) => sum + c.votes, 0),
  };
}

export async function loadCandidateRaces() {
  try {
    const [electorates, candidates, parties] = await Promise.all([getXml("electorates.xml"), getXml("candidates.xml"), getXml("parties.xml")]);
    const references = parseReferences(electorates, candidates, parties);
    const results = await Promise.allSettled(references.electorates.map(async (electorate) => {
      const code = "e" + electorate.id.padStart(2, "0");
      return parseRace(await getXml(code + "/" + code + ".xml"), electorate, references);
    }));
    return results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  } catch (error) {
    console.error("Candidate results unavailable", error);
    return [];
  }
}
