import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function BrandHeader() {
  return (
    <header className="border-b border-black/10 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-4">
          <div className="relative h-[72px] w-[210px] overflow-hidden">
            <Image
              src="/co.nz.png"
              alt="Webfit News"
              fill
              priority
              className="object-contain object-left"
              sizes="210px"
            />
          </div>

          <div className="hidden border-l border-black/10 pl-4 md:block">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b88a2a]">
              Community Pulse
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              2026
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-600 md:flex">
          <ShieldCheck size={16} className="text-[#7b1025]" />
          Independent community polling
        </div>
      </div>
    </header>
  );
}