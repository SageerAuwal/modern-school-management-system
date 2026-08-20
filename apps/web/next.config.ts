import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict mode for catching potential issues early
  reactStrictMode: true,
  // Security headers applied via middleware — see middleware.ts
  // Images: configure allowed domains when needed
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
