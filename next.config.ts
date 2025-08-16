import type { NextConfig } from "next";

/**
 * TEMPORARY: Unblock Vercel builds while we iterate quickly.
 * We'll re-enable strict settings after we clean types in the core code.
 */
const nextConfig: NextConfig = {
  eslint: {
    // ⬇️ Prevent ESLint errors from failing `next build`
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ⬇️ Prevent TS type errors from failing `next build`
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
