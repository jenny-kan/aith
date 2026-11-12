# Deploying AI Tool Finder

This guide covers the recommended production setup (**Vercel + Neon**) and the
alternatives (Supabase, Railway/Render, Docker/self-host). Work top-to-bottom —
the checklist at the end is mandatory for any public deployment.

---

## 1. Vercel + Neon (recommended)

Serverless hosting + serverless Postgres, both with generous free tiers.

### 1.1 Create the Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Neon shows **two** connection strings — you need both:
   - **Pooled** (host contains `-pooler`, port `6543`) → runtime connections
   - **Direct** (port `5432`) → migrations / `prisma db push`

### 1.2 Prepare the repo

```bash
pnpm db:use-postgres   # switch prisma/schema.prisma to PostgreSQL
```

Commit the changed `schema.prisma`. (To go back to the local SQLite demo later:
`pnpm db:use-sqlite`.)

### 1.3 Push the schema to Neon and seed

```bash
# In .env locally (or export in your shell):
export DATABASE_URL="postgres://…-pooler…:5432/…?sslmode=require&connection_limit=1"
export DIRECT_DATABASE_URL="postgres://…:5432/…?sslmode=require"

pnpm db:push           # creates all tables (or: pnpm db:migrate --name init)
pnpm db:seed           # seeds the catalog + demo blog data
```

> The demo seed includes demo accounts with known passwords. For a real
> deployment you may want to run only the catalog seed (`tsx prisma/seed.ts`)
> and skip `scripts/seed-blog.ts`.

### 1.4 Deploy to Vercel

1. Push the repo to GitHub/GitLab and import it in Vercel (framework auto-detects Next.js).
2. Set the **environment variables** (Production + Preview):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon **pooled** URL (`…-pooler…:6543/…?sslmode=require&connection_limit=1`) |
   | `DIRECT_DATABASE_URL` | Neon **direct** URL (`:5432`) — used if you run migrations from CI |
   | `ADMIN_PASSWORD` | **required** — 48+ chars, random |
   | `ADMIN_SECRET` | **required** — `openssl rand -hex 32` |
   | `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` (no trailing slash) |
   | `RESEND_API_KEY` | optional — enables real email (replies + password resets) |
   | `RESEND_FROM` / `CONTACT_REPLY_TO` | optional — sender/reply-to addresses |
   | `DONATE_PROVIDER_URL` | optional — real donation page instead of the demo |
   | `SOURCE_DOWNLOAD_PUBLIC` | optional — set `"true"` only if you want the footer's source-zip download (`/api/download`) open to everyone. Default in production: **admin session required** |

3. Deploy. Vercel runs `pnpm build`; the app runs its API routes on the Node.js
   runtime, which works with the standard Prisma client.

**Without `ADMIN_PASSWORD` + `ADMIN_SECRET` the admin dashboard refuses to
authenticate in production (fail closed)** — that's by design. The demo
password only works when `NODE_ENV !== "production"`.

### 1.5 Custom domain

Add the domain in Vercel → Settings → Domains. Update `NEXT_PUBLIC_SITE_URL`
to match, redeploy, then (optionally) submit the domain to
[hstspreload.org](https://hstspreload.org) — the app already sends HSTS with
`preload`.

---

## 2. Supabase (alternative database)

Works identically to Neon — Supabase is Postgres.

1. Create a project at [supabase.com](https://supabase.com).
2. Connection strings (Project Settings → Database):
   - **Transaction pooler** (port `6544`) → `DATABASE_URL`
   - **Session/direct** (port `5432`) → `DIRECT_DATABASE_URL`
3. Append `?sslmode=require` and (for the pooled URL) `&connection_limit=1`.
4. Follow the same steps as Vercel + Neon above (`pnpm db:use-postgres`,
   `db:push`, `db:seed`, deploy).

---

## 3. Railway / Render (single-instance hosting)

Single long-running instances are the simplest target — the in-memory rate
limiters and challenge nonces work exactly as designed.

```bash
pnpm db:use-postgres
```

- **Build command:** `pnpm install && pnpm build`  
  (Prisma 7 note: the CLI reads its URLs from `prisma.config.ts` — set
  `DIRECT_DATABASE_URL` there for migrations, `DATABASE_URL` (pooled) for the app)
- **Start command:** `pnpm start`
- **Env vars:** same table as Vercel (DATABASE_URL points at any Postgres —
  Railway/Render can provision one for you).
- Run `pnpm db:push` (or `db:migrate`) once against the production database
  before the first start, then `pnpm db:seed` if you want demo data.

---

## 4. Docker / self-hosting

The Next.js config uses `output: "standalone"`, so the build produces a
self-contained server:

```bash
pnpm install
pnpm db:use-postgres        # Postgres is strongly recommended for persistence
pnpm build                  # produces .next/standalone (see note below)
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
cd .next/standalone
DATABASE_URL=… ADMIN_PASSWORD=… ADMIN_SECRET=… NEXT_PUBLIC_SITE_URL=… \
  node server.js            # listens on PORT (default 3000)
```

> The repo's `build` script already performs the two `cp` steps on unix
> systems. If you deploy to Vercel instead, use a plain `next build` (Vercel
> ignores the standalone output).

Minimal `Dockerfile` sketch:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/standalone/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Put a reverse proxy (Caddy/nginx) in front for TLS. **Note:** SQLite is only
viable here with a mounted volume — Postgres is the recommended target.

---

## 5. Production checklist

**Must do (the app enforces or assumes these):**

- [ ] `ADMIN_PASSWORD` (48+ chars) and `ADMIN_SECRET` (random) set — admin is
      disabled without them
- [ ] `DATABASE_URL` is the **pooled** Postgres URL (Neon `:6543` / Supabase
      `:6544`) — serverless functions otherwise exhaust connections
- [ ] `NEXT_PUBLIC_SITE_URL` set to the public domain (emails, sitemap, OG)
- [ ] `pnpm db:use-postgres` committed; schema pushed; migrations under
      version control if you use them
- [ ] Secrets only in the platform's env settings — never in git (`.env` is
      gitignored; the shipped repo has no `.env` or database file)
- [ ] Password-reset + admin-reply emails: set `RESEND_API_KEY` (without it the
      app stays in dry-run mode and reset links are returned by the API — fine
      for demos, not for production)

**Should do (operational):**

- [ ] Uptime probe on `/api` (returns `{"status":"ok","database":"up"}`) — it
      reports 503 when the database is unreachable
- [ ] Skip the demo blog seed (`scripts/seed-blog.ts`) if you don't want the
      public demo accounts
- [ ] Review [SECURITY.md](./SECURITY.md) — especially the sections on
      distributed rate limiting and the donation confirmation endpoint
- [ ] Decide on the source-package endpoint (`GET /api/download`): leave it
      admin-gated (default) or set `SOURCE_DOWNLOAD_PUBLIC="true"`; remove
      the footer button in `src/components/app/footer.tsx` if you don't want
      it offered at all
- [ ] Set up log retention/drain (Prisma query logging is disabled in
      production; only errors and warnings are printed)

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Admin sign-in says "disabled" | `ADMIN_PASSWORD`/`ADMIN_SECRET` missing in the deployed environment |
| `P1001: Can't reach database` | `DATABASE_URL` wrong, or you forgot `pnpm db:push` |
| Many `Timed out fetching a new connection` errors | You're using the **direct** (non-pooled) URL at runtime — switch `DATABASE_URL` to the pooled connection |
| Reset emails not arriving | No `RESEND_API_KEY` (dry-run) — check the server logs for `[email:dry-run]` |
| Cross-origin 403 on your own forms | The request reached the app through an unexpected proxy chain — check that `Sec-Fetch-Site` headers aren't stripped by your proxy, and see `isSameOrigin` in `src/lib/security.ts` |
| Prisma `did not initialize yet` on serverless | Ensure `prisma generate` runs during build (it does — the `postinstall` script runs it; don't skip it) |
| `better-sqlite3` fails to load (native module) | The SQLite adapter is dev/demo only; in production use Postgres (`pnpm db:use-postgres`). If you must run SQLite, install build tools (python3, make, g++) — pnpm compiles it via the `allowBuilds` entry |
