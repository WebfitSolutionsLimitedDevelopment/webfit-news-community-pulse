"use client";

import { useState } from "react";

const LOGOS: Record<string, string> = {
  "ACT": "https://elections.nz/assets/Party-logos/the-act-party-logo-august-2019__ScaleWidthWzMwMF0.jpg",
  "Alliance": "https://elections.nz/assets/Party-logos/ALLIANCE-HR-v2__ScaleWidthWzMwMF0.jpg",
  "Animal": "https://elections.nz/assets/Party-logos/ANIMAL2__ScaleWidthWzMwMF0.JPG",
  "ALCP": "https://elections.nz/assets/Party-logos/The-Cannabis-Party_270720__ScaleWidthWzMwMF0.jpg",
  "Conservative": "https://elections.nz/assets/Party-logos/HIGHRE1__ScaleWidthWzMwMF0.JPG",
  "NZF": "https://elections.nz/assets/Party-logos/NZF_Logo-72dpi_300px_RGB.jpg",
  "LAB": "https://elections.nz/assets/Party-logos/labour-party-logo-june-2016.jpg",
  "Outdoors": "https://elections.nz/assets/Party-logos/OF_Logo_RGB_Gradient-1__ScaleWidthWzMwMF0.jpg",
  "OPP": "https://elections.nz/assets/Party-logos/Opportunity_Logo_Colour_RGB-v2__ScaleWidthWzMwMF0.jpg",
  "TPMAO": "https://elections.nz/assets/Party-logos/Maori-part-logo-Final_Maaeori-full-colour-002__ScaleWidthWzMwMF0.jpg",
  "TTTP": "https://elections.nz/assets/Party-logos/Tohu-v2__ScaleWidthWzMwMF0.jpg",
  "GP": "https://elections.nz/assets/Party-logos/green-party-logo-june-2017.jpg",
  "NAT": "https://elections.nz/assets/Party-logos/Low-Resolution-300px.jpg",
  "Vision": "https://elections.nz/assets/Party-logos/Vision-New-Zealand-logo-October-2019.png",
  "Women": "https://elections.nz/assets/Party-logos/Womens-Rights-Party-Logo-hi-res__ScaleWidthWzMwMF0.jpg",
  "Loyal": "https://nzloyal.com/wp-content/uploads/2025/02/New_Zealand_Loyal_Logo.jpg"
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

export function PartyLogo({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  const key = ALIASES[name] ?? name;
  const source = LOGOS[key];
  return (
    <span className="inline-flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5" title={name}>
      {source && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source} alt={name + " logo"} width={80} height={48} loading="lazy" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" onError={() => setFailed(true)} />
      ) : <span className="text-center text-[10px] font-bold leading-3 text-slate-500">{name}</span>}
    </span>
  );
}
