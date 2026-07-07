---
title: "Deploy on Netlify + Supabase (Intermediate)"
tagline: "A Netlify-first path to a live site with a real Postgres database — for people who've deployed before"
category: own-your-stack
source_platform: netlify
target_platform: supabase
difficulty: intermediate
level: intermediate
cost_range_usd: "0-45/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Comfortable with git and pushing code to GitHub"
  - "Familiar with command-line tools like npm and CLI installs"
  - "Understand environment variables and connection strings"
  - "Basic grasp of database connection pooling concepts"
requirements:
  - "A GitHub repository with a working project"
  - "Node.js and npm installed locally"
  - "A Netlify account and a Supabase account"
  - "Netlify CLI and Supabase CLI installed (netlify-cli, supabase)"
  - "2-4 hours to complete the deploy, pooling setup, and migration workflow"
effort_hours_min: 2
effort_hours_max: 4
---

# Deploy on Netlify + Supabase — Intermediate Guide

You've shipped something before. You know git, you've run `npm install` more times than you can count, and you understand a connection string is a URL with credentials baked in. This guide assumes you're choosing Netlify specifically — maybe you like its build UI, its native forms handling, or you're already running other sites there — and want the Supabase pairing without re-learning deployment from scratch.

Framing note, since this is a migration guide: I checked whether Netlify and Supabase create friction for each other, because the entire point of documenting a migration path is that the destination shouldn't fight you. Verdict — it doesn't, on the integration side. Two things are worth flagging before you commit:

- The same connection-pooling consideration you'd hit with any serverless host talking to Postgres
- One real business-model difference from Vercel: how each platform behaves when you go over your usage allowance

## Current pricing (re-verified, not carried over from an old draft)

> **[📸 SCREENSHOT PLACEHOLDER]** — Netlify pricing page and Supabase pricing page
>
> _Replace this callout with the real screenshots before publishing._

- **Netlify Free** — $0/mo
  - 300 credits/month, hard limit, no overage purchase option
  - Credits meter bandwidth (20 credits/GB), requests (2 credits/10K), function compute (10 credits/GB-hour), and production deploys (15 credits each)
  - One concurrent build
- **Netlify Personal** — $9/mo
  - 1,000 credits/month
  - Auto-recharge option (500 credits for $5)
- **Netlify Pro** — $20/mo flat
  - Unlimited seats (changed April 14, 2026 — previously per-seat)
  - 3,000 credits/month, three concurrent builds
  - Auto-recharge option (1,500 credits for $10)
- **Supabase Free**
  - 500MB database, 50K MAUs, 1GB storage, 5GB egress
  - Project **pauses after 7 days of inactivity** — data isn't lost, but the API goes dark until manually resumed
- **Supabase Pro** — from $25/mo
  - No auto-pause
  - 8GB database, 100K MAUs, 100GB storage, 500 realtime connections
  - $10/mo compute credit
- **Realistic steady-state cost** once you're past both free tiers: ~$45/mo (Netlify Pro + Supabase Pro base), before any usage overage on either side

> **🚨 The real difference from Vercel: pause vs. bill**
>
> This is the thing to internalize before picking Netlify over Vercel for a project you actually care about.
>
> - **Vercel's default failure mode on usage overage is an uncapped bill.** Bandwidth overage keeps getting charged (about $0.15/GB on Pro) unless you manually turn on Spend Management with a hard cap.
> - **Netlify's free-plan failure mode is the opposite — a hard, un-overridable pause.** Once your account's 300 monthly credits are spent, whether from one site or several sharing the account, every site on that account goes dark with a "Site not available" page, no exceptions, until the next billing cycle or an upgrade.
> - **Personal and Pro plans soften this** because they support optional auto-recharge (buying more credits automatically instead of pausing) — but that has to be turned on deliberately, it isn't the default.
> - **Practically**: Netlify Free is safer for your wallet and riskier for your uptime; Vercel Pro without Spend Management configured is the reverse.
> - **If you're running more than one site under a single Netlify account**, a spike on Project A can take Project B offline too — plan your account structure (one team per client, for instance) with that in mind.

## Connection pooling: the same consideration as any serverless host

Netlify Functions run on AWS Lambda under the hood — regional, short-lived, and capable of high concurrency under real traffic. Supabase's Postgres database has a hard cap on simultaneous connections tied to your compute tier. If your functions open a direct connection per invocation, you'll exhaust that cap under load and start seeing `too many connections` errors. This isn't Netlify-specific — it's the same problem Vercel or any serverless platform has talking to Postgres — but it's worth restating because it's the one thing that will actually break your app if you skip it.

Supabase exposes the database three ways:

1. **Direct connection** (port 5432, `db.[project-ref].supabase.co`) — fine for a long-lived server, wrong for serverless functions.
2. **Supavisor session mode** (port 5432 via the pooler) — one pooled connection per client session, supports prepared statements, queues excess clients up to ~60s under load.
3. **Supavisor transaction mode** (port 6543) — a connection is checked out only for the duration of a single transaction, then returned immediately. This is what you want for Netlify Functions.

If you use Netlify's official Supabase extension (Team > Extensions > Supabase, then connect it per-site under Project configuration > General > Supabase), it auto-populates three environment variables for you via OAuth:

- `SUPABASE_DATABASE_URL` — your database connection string
- `SUPABASE_ANON_KEY` — the public, RLS-scoped key for client-facing code
- `SUPABASE_SERVICE_ROLE_KEY` — the private, all-access key for server-only code

Double-check which connection string it wires in for your framework — for raw Postgres access from a function (rather than the Supabase JS client, which handles pooling for you over HTTPS automatically), make sure you're pointing at the port-6543 pooled string, not the direct one, and add a separate direct connection only for migration tooling.

```bash
# Runtime queries from Netlify Functions — pooled, transaction mode
SUPABASE_DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Migrations / long-lived admin tasks — direct connection
DIRECT_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

Note that most Netlify + Supabase setups use the Supabase JS client (`@supabase/supabase-js`) talking over HTTPS to Supabase's API layer rather than raw Postgres connections — in that case pooling is handled for you server-side and this is a non-issue. The pooling question only bites if you're connecting directly to Postgres from a function (an ORM like Prisma or Drizzle, or raw `pg`).

## Deploy flow

> **[🎥 VIDEO PLACEHOLDER]** — full deploy walkthrough, start to finish
>
> _Replace this callout with the real video before publishing._

```bash
npm i -g netlify-cli
netlify link
netlify env:pull .env       # pulls whatever's set in the Netlify dashboard
netlify deploy --prod
```

For local development against your real Supabase project, `netlify dev` automatically injects the environment variables the Supabase extension configured, so you can test functions locally without hand-managing a `.env` file:

```bash
netlify dev
```

For the database side, use the Supabase CLI rather than hand-editing the dashboard for anything beyond a quick prototype:

```bash
npx supabase init
npx supabase link --project-ref [project-ref]
npx supabase db pull          # bring remote schema into local migrations
npx supabase db push          # apply local migrations to remote
```

`db push` diffs your local `supabase/migrations/` folder against a migration-history table on the remote and applies only what's new, in order. Once you're using the CLI, stop editing schema through the SQL Editor UI — dashboard edits bypass migration history and will desync `db push`.

> **💡 Tip — custom domains**
>
> Work on every Netlify tier, including Free. Apex domain gets an A record, subdomain gets a CNAME, both at your DNS registrar. SSL is automatic once DNS resolves.

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — live site plus Netlify deploy log showing a successful "Published" status
>
> _Replace this callout with the real screenshot before publishing._

- Confirmed whether your database access goes through the Supabase JS client (pooling handled for you) or raw Postgres (needs the port-6543 pooled string explicitly)
- Understand that Netlify Free pauses the *entire account* on overage, with no purchase-more-credits option — budget accordingly if multiple sites share the account
- Auto-recharge configured deliberately on Personal/Pro if you'd rather pay for a spike than go offline
- Decided if Supabase needs Pro to avoid the 7-day auto-pause
- Schema changes flow through `supabase/migrations/`, not ad hoc dashboard edits
- Custom domain DNS propagated, SSL issued automatically

## Sources

- [Netlify Pricing](https://www.netlify.com/pricing/)
- [Credit-based pricing plans — Netlify Docs](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [What happens when bandwidth is exceeded? — Netlify Support Forums](https://answers.netlify.com/t/what-happens-when-bandwidth-is-exceeded/13772)
- [Netlify pricing updates, April 2026 — Netlify Changelog](https://www.netlify.com/changelog/2026-04-14-pricing-updates-april-2026/)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supavisor and connection terminology explained — Supabase Docs](https://supabase.com/docs/guides/troubleshooting/supavisor-and-connection-terminology-explained-9pr_ZO)
- [Connect to your database — Supabase Docs](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase integration — Netlify Docs](https://docs.netlify.com/extend/install-and-use/setup-guides/supabase-integration/)
- [Database Migrations — Supabase Docs](https://supabase.com/docs/guides/deployment/database-migrations)
