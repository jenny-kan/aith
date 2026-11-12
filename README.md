# AI Tool Finder

A production-ready directory of free and paid AI tools — with a blogger-powered
editorial blog, a full admin dashboard, and privacy-friendly analytics. Built as
a single-page Next.js 16 application with Prisma, Tailwind CSS 4 and shadcn/ui.

![Next.js 16](https://img.shields.io/badge/Next.js-16.4-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6) ![Prisma](https://img.shields.io/badge/Prisma-7-2d3748) ![Tailwind](https://img.shields.io/badge/Tailwind-4.3-38bdf8)

## Features

**Public site** (everything lives on `/` — client-side routing with shareable URLs)

- 🔍 **Tool catalog** — 80+ curated AI tools across 9 categories with task-based
  search, category / price / free-trial filters, and detail pages with free-plan
  limits and pricing notes
- ✍️ **Editorial blog** — markdown articles from approved writers, tags,
  related posts, JSON-LD structured data, sitemap + robots
- 👤 **Blogger studio** — apply to write (with writing samples), get approved by
  an editor, then draft / submit / track posts through an editorial review queue
  with server-enforced quality gates
- 🔑 **Forgot-password flow** — one-time, 60-minute, SHA-256-hashed reset tokens
  delivered by email (Resend; dry-run mode without an API key)
- 📬 **Contact form** — layered anti-spam (honeypot, timing trap, HMAC-signed
  single-use math challenge, per-IP rate limits); admins reply by email
- 💝 **Donations** — demo donation flow with admin tracking
- 📊 **Privacy-friendly analytics** — anonymous page views, no cookies, no PII
- 🌗 Light/dark theme, responsive from 360 px up, accessible (ARIA, keyboard nav)

**Admin dashboard** (`/?view=admin`, single-password auth)

- Full tool CRUD + publish / archive workflow, bulk import (CSV/TSV/JSON/SQLite)
- Category manager, blog review queue (approve/reject writers, publish posts)
- Message inbox with email replies, donations manager, analytics dashboard,
  security audit log

## Quickstart (local, SQLite)

> **Prerequisites:** Node.js 20+ and [pnpm](https://pnpm.io)
> (`npm install -g pnpm`). Bun also works if you prefer it.

```bash
pnpm install                # install dependencies
cp .env.example .env       # local SQLite config (works as-is)
pnpm db:push                # create the SQLite database (db/custom.db)
pnpm db:seed                # seed the catalog + demo blog data
pnpm dev                    # http://localhost:3000
```

Demo credentials (development only — production requires real env vars):

| What | Value |
| --- | --- |
| Admin dashboard | `/?view=admin` → the demo password is shown on the sign-in card |
| Blogger account | `demo@aitoolfinder.dev` / `Blogger-Demo-2025-Pass-Abc123` |

Two applications are seeded as **PENDING** so you can try the approval flow:
sign in as admin → *Blog* tab → approve or reject them.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server on port 3000 |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript check |
| `pnpm db:push` | Apply `prisma/schema.prisma` to the database |
| `pnpm db:seed` | Seed the tool catalog + demo blog data (idempotent) |
| `pnpm db:migrate` / `pnpm db:deploy` | Create migrations locally / apply them in CI |
| `pnpm db:use-postgres` | Switch the Prisma schema to PostgreSQL (production) |
| `pnpm db:use-sqlite` | Switch back to SQLite (local demo) |
| `pnpm package` | Build the clean source zip (`download/ai-tool-finder-<version>.zip`) |

## Download the source package

The footer of every page has a **“Download source package”** button — one
click streams a clean, deploy-ready `.zip` (`GET /api/download`) built from
the same manifest as `pnpm package`.

Inside the zip: all source, configs, docs and the pnpm lockfile under a
single `ai-tool-finder/` folder. Never inside: `.env`, the SQLite database,
`node_modules`, build output, logs or git history. After unzipping:

```bash
pnpm install && cp .env.example .env && pnpm db:push && pnpm db:seed && pnpm dev
```

Access policy: public while `NODE_ENV !== "production"` (demo/sandbox
convenience); in production it requires an admin session unless
`SOURCE_DOWNLOAD_PUBLIC="true"` is set explicitly.

## Export the tool catalog as CSV

`GET /api/tools/export` (footer → **“Download tools as CSV”**) streams every
published tool as a spreadsheet-friendly CSV: UTF-8 BOM + CRLF so Excel and
Google Sheets open it cleanly, every field quoted (RFC 4180), sorted by
category. The column headers deliberately match the bulk-importer's
auto-mapping, so **export → edit in a spreadsheet → re-import round-trips**
(`/?view=admin` → Tools → Bulk import).

## Environment variables

Copy `.env.example` to `.env`. Local SQLite only needs `DATABASE_URL`; a
production deployment needs the admin + email + site variables. See
[.env.example](./.env.example) for the full annotated list.

## Deployment

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — step-by-step guides for
  **Vercel + Neon** (recommended), Supabase, Railway/Render, and Docker
  self-hosting, plus a production hardening checklist.
- **[SECURITY.md](./SECURITY.md)** — the security model, the audit it passed,
  and what to harden further at scale.

## Project structure

```
prisma/                  schema.prisma (active) + sqlite/postgres variants, seed.ts
prisma.config.ts         Prisma 7 config: datasource URL, seed command
scripts/seed-blog.ts     demo blog data (portable Prisma, no raw SQL)
src/app/                 the single "/" route + API routes (app router)
src/app/api/             public, blog, admin, contact, donations, analytics
src/components/app/      feature components (views, admin, blog)
src/components/ui/       shadcn/ui primitives (only the 15 in use)
src/lib/                 security, auth, db, email, validation, services
```

## Tech stack

Next.js 16 (App Router) · TypeScript 5 (strict) · Tailwind CSS 4 · shadcn/ui ·
Prisma 7 with driver adapters (better-sqlite3 locally, pg for PostgreSQL) · Resend (email, REST) · pnpm

## License

MIT — do what you like, attribution appreciated.
