import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Security headers (OWASP 2025 A02 — security misconfiguration).
 *  - CSP: dev keeps 'unsafe-eval' (Turbopack HMR); production drops it.
 *    'unsafe-inline' for scripts stays until a nonce-based CSP is adopted
 *    (Next.js inline hydration scripts need it) — see SECURITY.md.
 *  - object-src / frame-ancestors / base-uri are fully locked down.
 *  - HSTS (prod only) with preload so browsers enforce HTTPS before the first
 *    visit once the domain is submitted to hstspreload.org.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Production drops 'unsafe-eval' — nothing legit needs it in a build.
      `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Self-hosting friendly (Vercel ignores this; Docker/bare-metal use it).
  output: "standalone",
  // The file tracer otherwise snapshots db/custom.db into .next/standalone
  // (it sees the path literal in src/lib/db.ts). A stale database copy
  // inside the build output is a footgun — the runtime database must live
  // outside .next so rebuilds can't wipe it.
  outputFileTracingExcludes: {
    "/**": ["./db/**"],
  },
  // Prisma 7 driver adapters: keep the native SQLite binding and the pg
  // driver out of the server bundle (required for standalone builds).
  serverExternalPackages: [
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
    "@prisma/adapter-pg",
    "pg",
  ],
  poweredByHeader: false,
  reactStrictMode: true,
  typescript: {
    // Type errors FAIL the build — the codebase is kept type-clean on purpose.
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
