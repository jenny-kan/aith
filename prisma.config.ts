import "dotenv/config";
import path from "path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration (replaces the old `package.json#prisma` key and the
 * deprecated `url`/`directUrl` fields in the schema's datasource block).
 *
 *  - Loads `.env` explicitly — Prisma 7 no longer auto-loads env vars.
 *  - Resolves relative SQLite `file:` URLs against the project root, so the
 *    behavior is identical no matter which directory a command is run from
 *    (Prisma 6 resolved them relative to the schema file; `file:./db/custom.db`
 *    is the documented convention now).
 *  - `DIRECT_DATABASE_URL` (optional) is used for migrations when present —
 *    the standard Neon/Supabase setup (pooled runtime URL, direct URL for DDL).
 */

function resolveUrl(raw: string | undefined, fallback: string): string {
  const url = raw?.trim() || fallback;
  if (url.startsWith("file:")) {
    const filePath = url.slice("file:".length);
    if (!path.isAbsolute(filePath)) {
      return `file:${path.resolve(process.cwd(), filePath)}`;
    }
  }
  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts && tsx scripts/seed-blog.ts",
  },
  datasource: {
    // Migrations/CLI use DIRECT_DATABASE_URL when set (Neon/Supabase direct
    // connection), otherwise the main DATABASE_URL.
    url: resolveUrl(
      process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL,
      "file:./db/custom.db"
    ),
  },
});
