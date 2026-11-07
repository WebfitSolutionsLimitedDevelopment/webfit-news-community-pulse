"use client";

import { useState } from "react";

const LOGOS: Record<string, string> = {
  "ACT": "/party-logos/ACT.jpg",
  "Alliance": "/party-logos/Alliance.jpg",
  "Animal": "/party-logos/Animal.jpg",
  "ALCP": "/party-logos/ALCP.jpg",
  "Conservative": "/party-logos/Conservative.jpg",
  "NZF": "/party-logos/NZF.jpg",
  "LAB": "/party-logos/LAB.jpg",
  "Outdoors": "/party-logos/Outdoors.jpg",
  "OPP": "/party-logos/OPP.jpg",
  "TPMAO": "/party-logos/TPMAO.jpg",
  "TTTP": "/party-logos/TTTP.jpg",
  "GP": "/party-logos/GP.jpg",
  "NAT": "/party-logos/NAT.jpg",
  "Vision": "/party-logos/Vision.png",
  "Women": "/party-logos/Women.jpg",
  "Loyal": "/party-logos/Loyal.jpg"
};
const ALIASES: Record<string, string> = {
  "National": "NAT",
  "National Party": "NAT",
  "Labour": "LAB",
  "Labour Party": "LAB",
  "Green": "GP",
  "Green Party": "GP",
  "ACT New Zealand": "ACT",
  "NZ First": "NZF",
  "New Zealand First Party": "NZF",
  "Opportunity Party": "OPP",
  "Te Pāti Māori": "TPMAO",
  "Alliance Party": "Alliance",
  "Animal Justice Party Aotearoa New Zealand": "Animal",
  "Aotearoa Legalise Cannabis Party": "ALCP",
  "Conservative Party NZ": "Conservative",
  "NZ Outdoors & Freedom Party": "Outdoors",
  "Te Tai Tokerau Party": "TTTP",
  "Vision New Zealand": "Vision",
  "Women’s Rights Party": "Women",
  "Women's Rights Party": "Women",
  "New Zealand Loyal": "Loyal"
};

export function PartyLogo({ name, compact = false }: { name: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const key = ALIASES[name] ?? name;
  const source = LOGOS[key];
  return (
    <span className={`inline-flex ${compact ? "h-8 w-12 p-1" : "h-12 w-20 p-1.5"} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white`} title={name}>
      {source && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source} alt={name + " logo"} width={80} height={48} loading="lazy" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" onError={() => setFailed(true)} />
      ) : <span className="text-center text-[10px] font-bold leading-3 text-slate-500">{name}</span>}
    </span>
  );
}
