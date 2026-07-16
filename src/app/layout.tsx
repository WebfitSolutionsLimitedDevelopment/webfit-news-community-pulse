import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webfit News Community Pulse 2026",
  description:
    "An independent, transparent community sentiment platform by Webfit News.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://poll.webfitnews.co.nz"
  ),
  openGraph: {
    title: "Webfit News Community Pulse 2026",
    description:
      "Independent community sentiment and public-interest polling.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
