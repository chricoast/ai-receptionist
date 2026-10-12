import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: almost every page here is personal
  // (logged-in owner, chosen language), so the classic "render on each request"
  // model is simpler and matches Supabase's guides. Revisit before Next.js 17.
  cacheComponents: false,
  async headers() {
    return [
      {
        // The app itself must never be shown inside another website (protects
        // against "clickjacking"). Only the chat window may be embedded.
        source: "/((?!widget/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/widget/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/widget.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=300" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
