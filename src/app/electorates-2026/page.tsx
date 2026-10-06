import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPinned, ShieldCheck } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { ElectorateDirectory, type ElectorateDirectoryItem } from "@/components/electorate-directory";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ElectoratesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select("id, slug, electorate_name, electorate_code, electorate_type, status")
    .eq("poll_type", "electorate_party_vote")
    .eq("is_public", true)
    .in("status", ["open", "paused", "closed"])
    .order("electorate_name", { ascending: true });

  const items: ElectorateDirectoryItem[] = (data ?? []).map((poll) => ({
    id: poll.id,
    slug: poll.slug,
    name: poll.electorate_name || "Electorate",
    code: poll.electorate_code,
    electorateType: poll.electorate_type === "maori" ? "maori" : "general",
    status: poll.status,
  }));

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-neutral-950">
      <BrandHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#7b1025]">
          <ArrowLeft size={17} /> Back to Community Pulse
        </Link>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_30px_90px_rgba(38,31,20,0.08)]">
          <div className="h-1.5 bg-gradient-to-r from-[#7b1025] via-[#9a1730] to-[#b88a2a]" />
          <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.25fr_.75fr] lg:p-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9d741f]">2026 electorate party vote polls</p>
              <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">Choose your electorate</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-neutral-600">
                Select the electorate where you are enrolled or ordinarily live. Then pick your party and press Vote. No email or sign-up needed. One electorate vote per person across this series.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[#b88a2a]/30 bg-[#fbf8f1] p-6">
              <MapPinned className="text-[#7b1025]" size={27} />
              <h2 className="mt-4 text-xl font-semibold">Not sure which electorate?</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">Use the official Vote NZ address lookup before participating.</p>
              <a
                href="https://vote.nz/maps/find-your-electorate-2026"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 font-semibold text-[#7b1025]"
              >
                Find your electorate on Vote NZ <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-black/10 bg-[#17130f] p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#d9b45d]" size={21} />
            <p className="text-sm leading-6 text-white/75">
              No email, no codes, no sign-up. Just choose your electorate, pick a party and vote.
            </p>
          </div>
          <Link href="/election-pulse-2026" className="mt-4 inline-flex shrink-0 font-semibold text-[#d9b45d] sm:mt-0">
            View national dashboard
          </Link>
        </section>

        <section className="mt-8">
          {error ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-7 text-red-950">
              The electorate directory could not be loaded. Confirm the Phase 3 database migration has been run.
            </div>
          ) : (
            <ElectorateDirectory items={items} />
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
