---
title: "Deploy on Vercel + Supabase (Intermediate)"
tagline: "The fastest path from git push to a live site with a real Postgres database — for people who've deployed before"
category: own-your-stack
source_platform: vercel
target_platform: supabase
difficulty: intermediate
level: intermediate
cost_range_usd: "0-45/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Comfortable with git and a git-based, push-to-deploy workflow"
  - "Can configure environment variables in a dashboard, including per-environment values"
  - "Understands (or can learn) pooled vs. direct Postgres connections for serverless"
  - "Basic familiarity with an ORM like Prisma or Drizzle"
  - "Can run CLI tools (Vercel CLI, Supabase CLI) from a terminal"
requirements:
  - "A GitHub repository already connected to a Vercel project"
  - "A Supabase project (Pro tier if you want to avoid the 7-day free-tier auto-pause)"
  - "Vercel CLI and Supabase CLI installed locally"
  - "A domain you control if you're setting up a custom domain"
  - "Vercel Spend Management configured with an actual dollar limit"
effort_hours_min: 2
effort_hours_max: 5
---

# Deploy on Vercel + Supabase — Intermediate Guide

You've shipped something before. You know git, you've run `npm install` more times than you can count, and you understand a connection string is a URL with credentials baked in. What you might not have done is this specific pairing, so I'll move fast on the basics and slow down on the one thing that actually trips people up.

I want to be direct about the framing here, because it matters for a migration guide specifically: this isn't just "here's a stack that works." I checked whether Vercel and Supabase create friction for each other — connection handling, env var wiring, migration tooling — because the whole point of documenting a migration path is that the destination shouldn't fight you. Short version: it mostly doesn't. Here's what I actually checked, and where it landed:

- **Connection handling** — one real gotcha, and it's connection pooling (covered in detail below).
- **Env var wiring** — low-friction; an official integration auto-populates most of what you need.
- **Migration tooling** — low-friction; the Supabase CLI handles schema migrations cleanly alongside Vercel's own CLI.

Everything outside connection pooling is genuinely low-friction.

## Current pricing (re-verified, not carried over from an old draft)

> **[📸 SCREENSHOT PLACEHOLDER]** — Vercel pricing page and Supabase pricing page
>
> _Replace this callout with the real screenshots before publishing._

**Vercel Hobby** (free):
- 100GB bandwidth/mo, 1M edge requests, 1M function invocations, 100 build minutes, 4 CPU-hours of compute
- Explicitly non-commercial per the Fair Use Guidelines — client work, even unpaid, and revenue-generating projects require Pro

**Vercel Pro**:
- $20/seat/mo including a $20 usage credit
- 1TB bandwidth included
- $0.15/GB overage beyond that (roughly $40/100GB), with no hard cap unless you configure one

**Supabase Free**:
- 500MB database, 50K MAUs, 1GB storage, 5GB egress
- The thing to plan around: the project **pauses after 7 days of inactivity**. Data isn't lost, but the API goes dark until you manually resume it from the dashboard.

**Supabase Pro**:
- From $25/mo, no auto-pause
- 8GB database, 100K MAUs, 100GB storage, 500 realtime connections
- $10/mo compute credit toward your instance size

**Realistic steady-state cost** once you're past both free tiers: ~$45/mo (Vercel Pro + Supabase Pro base), before any usage overage.

> **🚨 The overage problem is real, not theoretical**
>
> Multiple 2025–2026 reports document Vercel bill shock from bandwidth:
>
> - A $23,000 bill from DDoS traffic
> - A $1,100+ bill from bots crawling a not-yet-launched site
> - Another from an unexpected Hacker News spike
>
> Vercel doesn't rate-limit or block bad traffic for you — you pay for every byte served regardless of who's requesting it. Turn on Spend Management (Settings > your team > Spend Management) and set an actual dollar ceiling with pause-on-limit enabled, not just alert thresholds. Alerts fire at 50/75/100% of a configured amount, but on a fast enough spike (a DDoS burst, a scraper storm), notification lag has reportedly let bills run past the alert before anyone could react. If you're security-conscious, put Cloudflare (or similar) in front for bot filtering and caching — it's commonly cited as cutting Vercel bandwidth 60–80% for content-heavy sites.

## The one real friction point: pooled vs. direct connections

This is the thing worth understanding properly rather than cargo-culting. Supabase's Postgres database can be reached three ways:

1. **Direct connection** (port 5432, `db.[project-ref].supabase.co`) — a straight TCP connection to Postgres. Fine for long-lived servers, bad for serverless.
2. **Supavisor session mode** (port 5432 via the pooler) — one pooled connection held for the life of a client session, supports prepared statements, but the pool can queue clients up to 60 seconds under load.
3. **Supavisor transaction mode** (port 6543) — a connection is checked out only for the duration of a single transaction, then immediately returned to the pool. This is what you want.

Vercel functions are serverless: each invocation can spin up a fresh process, and under real traffic you can have dozens or hundreds of concurrent invocations. Postgres itself has a hard cap on simultaneous connections (dependent on your compute size — the free/Micro tier caps in the double digits). If your app opens a direct connection per function invocation, you will exhaust that limit under any meaningful concurrency and start seeing `too many connections` errors. This is the single most common "Vercel + Supabase" support complaint, and it's entirely avoidable: **use the transaction-mode pooled connection string (port 6543) as your `DATABASE_URL`.**

The one caveat: transaction mode doesn't support session-level features like prepared statement caching the same way a direct connection does. What that means in practice:

- If you're using an ORM (Prisma, Drizzle) with these connections, check their Supabase-specific docs first.
- Some ORMs require a `?pgbouncer=true` flag to disable client-side prepared statement caching.
- Schema migrations should run over the direct or session connection, not the transaction pooler — which is why you typically need a separate `directUrl` alongside your pooled `DATABASE_URL`.

```bash
# Runtime queries — pooled, transaction mode
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Migrations / long-lived admin tasks — direct connection
DIRECT_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

## Env var wiring: mostly automatic

If you use the official "Supabase for Vercel" marketplace integration (from Vercel's dashboard: Storage > Browse Marketplace > Supabase), it provisions or links a Supabase project as a first-class Vercel resource and auto-populates your environment variables for you, including preview deployments tied to PR branches:

- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- A few Prisma-flavored variants

This removes almost all manual copy-paste. The one thing to watch: variable sync for persistent preview branches can lag or require a manual re-trigger, per Supabase's own troubleshooting docs, so don't assume a renamed or rotated key has propagated to preview until you check.

If you set it up manually instead (create the Supabase project separately, then paste values into Vercel yourself), it's the same three or four variables, just typed instead of injected. Either way there's no format mismatch or auth handshake to debug — this is the "frictionless" part holding up under scrutiny.

## Deploy flow

> **[🎥 VIDEO PLACEHOLDER]** — full deploy walkthrough, start to finish
>
> _Replace this callout with the real video before publishing._

```bash
npm i -g vercel
vercel link
vercel env pull .env.local   # pulls whatever's set in the Vercel dashboard
vercel --prod
```

For the database side, once you've got a Supabase project linked, prefer the Supabase CLI over hand-editing the dashboard for anything beyond a quick prototype:

```bash
npx supabase init
npx supabase link --project-ref [project-ref]
npx supabase db pull          # bring remote schema into local migrations
npx supabase db push          # apply local migrations to remote
```

`db push` diffs your local `supabase/migrations/` folder against a migration-history table it maintains on the remote database and applies only what's new, in order. Two rules follow from that:

- The moment you start using the CLI, stop making schema edits through the SQL Editor or Table Editor UI.
- Direct dashboard edits bypass migration history and will desync `db push` — Supabase's own docs call this out explicitly as the "golden rule."

> **💡 Tip — custom domains**
>
> Work on every Vercel tier, including Hobby. Apex domain (`yoursite.com`) gets an A record, subdomain (`www.yoursite.com`) gets a CNAME, both configured at your DNS registrar. Allow up to 24 hours for propagation, though it's often much faster.

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — live site plus Vercel deployment dashboard showing a green "Ready" status
>
> _Replace this callout with the real screenshot before publishing._

- `DATABASE_URL` points at the port-6543 transaction pooler; a separate `DIRECT_URL` (or equivalent) exists for migrations if your ORM needs it
- Spend Management configured with pause-on-limit, not just alerts
- Decided if Supabase needs Pro to avoid the 7-day auto-pause
- Schema changes flow through `supabase/migrations/`, not ad hoc dashboard edits
- Custom domain DNS propagated, SSL issued (automatic on Vercel)

## Sources

- [Vercel Pricing](https://vercel.com/pricing)
- [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- [Vercel Spend Management docs](https://vercel.com/docs/spend-management)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supavisor and connection terminology explained](https://supabase.com/docs/guides/troubleshooting/supavisor-and-connection-terminology-explained-9pr_ZO)
- [Connect to your database — Supabase Docs](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Vercel Marketplace integration docs](https://supabase.com/docs/guides/integrations/vercel-marketplace)
- [Database Migrations — Supabase Docs](https://supabase.com/docs/guides/deployment/database-migrations)
- [The $23,000 Vercel bill — UsageBox](https://usagebox.com/articles/vercel-23000-dollar-bill-usage-based-platform-bill-shock-2026)
- [Vercel bandwidth bill-shock reports, 2026 — Deploybase](https://deploybase.app/blog/vercel-bill-shock-1100-bandwidth-costs-alternatives-2026)
