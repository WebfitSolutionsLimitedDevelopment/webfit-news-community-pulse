const PARTY_COLOURS: Record<string, string> = {
  NAT: "#1766c5", "National": "#1766c5", "National Party": "#1766c5",
  LAB: "#c52c43", "Labour": "#c52c43", "Labour Party": "#c52c43",
  GP: "#16824b", "Green": "#16824b", "Green Party": "#16824b",
  ACT: "#966c00", "ACT New Zealand": "#966c00",
  NZF: "#424b5c", "NZ First": "#424b5c", "New Zealand First Party": "#424b5c",
  TPMAO: "#9c3045", "Te Pāti Māori": "#9c3045",
  OPP: "#087f89", "Opportunity Party": "#087f89",
};

export function partyColour(name: string) {
  return PARTY_COLOURS[name] ?? "#64748b";
}
