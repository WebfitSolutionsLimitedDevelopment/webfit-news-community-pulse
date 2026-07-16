export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-black/10 bg-[#171717] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 text-sm md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <p className="font-semibold">Webfit News Community Pulse 2026</p>
          <p className="mt-1 text-white/60">
            Independent, transparent and community-focused.
          </p>
        </div>
        <p className="text-white/70">
          Powered by{" "}
          <a
            href="https://webfitt.co.nz"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#e9c96d] hover:underline"
          >
            Webfit Solutions Limited
          </a>
        </p>
      </div>
    </footer>
  );
}
