"use client";

import { useMemo, useState } from "react";

const OFFICIAL_PARTY_DOMAINS: Record<string, string> = {
  act_new_zealand: "act.org.nz",
  new_zealand_first_party: "nzfirst.nz",
  new_zealand_labour_party: "labour.org.nz",
  opportunity_party: "top.org.nz",
  te_pati_maori: "maoriparty.org.nz",
  the_green_party_of_aotearoa_new_zealand: "greens.org.nz",
  the_new_zealand_national_party: "national.org.nz",
};

function getInitials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function PartyLogo({
  partyKey,
  label,
  logoUrl,
  size = "md",
}: {
  partyKey?: string | null;
  label: string;
  logoUrl: string | null;
  size?: "sm" | "md";
}) {
  const officialFallbackUrl = useMemo(() => {
    if (!partyKey) return null;
    const domain = OFFICIAL_PARTY_DOMAINS[partyKey];
    return domain
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
      : null;
  }, [partyKey]);

  const sources = useMemo(
    () => [logoUrl, officialFallbackUrl].filter(Boolean) as string[],
    [logoUrl, officialFallbackUrl],
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const containerClass = size === "sm" ? "h-11 w-11" : "h-14 w-14";
  const currentSource = sources[sourceIndex] ?? null;

  return (
    <div
      className={`flex ${containerClass} shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white p-1.5 shadow-sm`}
      aria-label={`${label} logo`}
    >
      {currentSource ? (
        <img
          src={currentSource}
          alt={`${label} logo`}
          className="block h-full w-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setSourceIndex((current) => current + 1)}
        />
      ) : (
        <span className="text-xs font-bold tracking-wide text-neutral-500">
          {getInitials(label) || "?"}
        </span>
      )}
    </div>
  );
}
