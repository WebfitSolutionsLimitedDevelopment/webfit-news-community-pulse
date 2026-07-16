import {
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Newspaper,
} from "lucide-react";

const footerLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/webfitnews/",
    icon: Instagram,
  },
  {
    label: "Facebook NZ",
    href: "https://www.facebook.com/webfitnewsnz",
    icon: Facebook,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/webfitNews/",
    icon: Facebook,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/webfit-news-168490392/",
    icon: Linkedin,
  },
  {
    label: "Read News",
    href: "https://webfitnews.co.nz/",
    icon: Newspaper,
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#171717] text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <p className="text-lg font-semibold">
              Webfit News Community Pulse 2026
            </p>

            <p className="mt-2 max-w-xl leading-7 text-white/60">
              Independent, transparent and community-focused polling from
              Webfit News.
            </p>

            <a
              href="https://webfitnews.co.nz/"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 font-semibold text-[#e9c96d] hover:underline"
            >
              Read the latest news
              <ExternalLink size={16} />
            </a>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">
              Follow Webfit News
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {footerLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white/75 transition hover:border-[#e9c96d] hover:bg-white/10 hover:text-[#e9c96d]"
                  >
                    <Icon size={19} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-7 text-sm md:flex-row md:items-center md:justify-between">
          <p className="text-white/45">
            © {new Date().getFullYear()} Webfit News. All rights reserved.
          </p>

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
      </div>
    </footer>
  );
}