import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.POLL_BASE_PATH === "/poll" ? { basePath: "/poll" } : {}),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  }
};

export default nextConfig;
