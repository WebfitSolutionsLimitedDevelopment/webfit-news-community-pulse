"use client";

import Link from "next/link";
import { Search, ArrowRight, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

export type ElectorateDirectoryItem = {
  id: string;
  slug: string;
  name: string;
  code: string | null;
  electorateType: "general" | "maori";
  status: string;
};

export function ElectorateDirectory({ items }: { items: ElectorateDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "general" | "maori">("all");

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("en-NZ");
    return items.filter((item) => {
      const matchesType = type === "all" || item.electorateType === type;
      const matchesQuery = !term || item.name.toLocaleLowerCase("en-NZ").includes(term);
      return matchesType && matchesQuery;
    });
  }, [items, query, type]);

  return (
    <div>
      <div className="rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-sm sm:p-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={19} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search electorate name"
            className="min-h-12 w-full rounded-xl border border-black/10 bg-[#faf8f3] py-3 pl-12 pr-4 text-base outline-none transition focus:border-[#7b1025] focus:ring-4 focus:ring-[#7b1025]/10"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["all", `All (${items.length})`],
            ["general", `General (${items.filter((item) => item.electorateType === "general").length})`],
            ["maori", `Māori (${items.filter((item) => item.electorateType === "maori").length})`],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value as "all" | "general" | "maori")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                type === value
                  ? "bg-[#7b1025] text-white"
                  : "border border-black/10 bg-white text-neutral-700 hover:border-[#7b1025]/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-sm text-neutral-500">
        Showing {filtered.length} electorate{filtered.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-black/15 bg-white p-10 text-center">
          <MapPin className="mx-auto text-[#7b1025]" size={30} />
          <h2 className="mt-4 text-xl font-semibold">No electorate found</h2>
          <p className="mt-2 text-neutral-600">Check the spelling or clear the filters.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/polls/${item.slug}`}
              className="group flex min-h-32 flex-col justify-between rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b88a2a]/60 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9d741f]">
                    {item.electorateType === "maori" ? "Māori electorate" : "General electorate"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">{item.name}</h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">
                  {item.status}
                </span>
              </div>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#7b1025]">
                Open party vote poll
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
