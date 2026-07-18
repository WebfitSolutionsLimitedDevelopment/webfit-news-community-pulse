"use client";

import { useState } from "react";

function getInitials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function PartyLogo({
  label,
  logoUrl,
  size = "md",
}: {
  label: string;
  logoUrl: string | null;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);
  const containerClass = size === "sm" ? "h-11 w-11" : "h-14 w-14";

  return (
    <div
      className={`flex ${containerClass} shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white p-1.5 shadow-sm`}
      aria-label={`${label} logo`}
    >
      {logoUrl && !failed ? (
        <img
          src={logoUrl}
          alt={`${label} logo`}
          className="block h-full w-full object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-xs font-bold tracking-wide text-neutral-500">
          {getInitials(label) || "?"}
        </span>
      )}
    </div>
  );
}
