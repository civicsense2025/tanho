---
title: "Deploy on Vercel + Neon (Intermediate)"
tagline: "Serverless hosting paired with serverless Postgres — a database branch for every preview deploy"
category: own-your-stack
source_platform: vercel
target_platform: neon
level: intermediate
difficulty: intermediate
cost_range_usd: "0-40/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Comfortable with git, npm, and a git-based deploy workflow"
  - "Understands pooled vs. unpooled/direct Postgres connection strings"
  - "Can run pg_dump/pg_restore to migrate data into a new database"
  - "Can configure environment variables scoped per environment (production/preview/development)"
  - "Can decide between Vercel-managed and Neon-managed billing integration modes"
requirements:
  - "A GitHub repository already connected to a Vercel project"
  - "A Neon account, added via the Vercel Marketplace or Neon-managed integration"
  - "Vercel CLI installed locally"
  - "An existing Postgres database to migrate from, if moving in existing data"
  - "A domain you control if you're setting up a custom domain"
effort_hours_min: 2
effort_hours_max: 5
---

# Deploy on Vercel + Neon (Intermediate)

You've deployed before, you know git and npm, and you understand a connection string is just an address-plus-credentials your app uses to reach a database. So I'll skip the hand-holding and get straight to what's actually different about this pairing, where the real friction hides, and what to configure so you don't find it the hard way.

Vercel shut down its own "Vercel Postgres" product in 2025 and rebuilt it directly on Neon, so this isn't two vendors awkwardly bolted together — it's Vercel's own recommended database path, sold through its Storage tab and Marketplace with a purpose-built "native integration." That's the headline reason this pairing is worth taking seriously over rolling your own Postgres-somewhere-else setup.

## Confirming this pairing is actually frictionless

Since Tan's whole premise for this hub is that every pairing here has to work without a fight — these are migration guides meant to get you onto your own infrastructure, not into a new trap — I want to be explicit about what "frictionless" means here and where it isn't quite true.

What works cleanly: the Vercel Marketplace integration wires up automatically.

- Adding Neon from Storage → Create Database (or via the Marketplace listing) provisions a project
- Environment variables are generated and scoped correctly across your Production, Preview, and Development environments
- Zero manual connection-string copying is required

There are actually two integration paths, and both are officially supported:

- **Vercel-managed integration** — the Neon project lives inside Vercel's umbrella, billed through Vercel
- **Neon-managed integration** — you manage the Neon project directly and just link it to Vercel

Pick based on whether you want billing consolidated on your Vercel invoice or itemized separately on Neon's.

The one real friction point, and it's not a Vercel/Neon-specific quirk so much as an inherent property of connection pooling, is **pooled versus unpooled connections.** Neon fronts your database with PgBouncer running in transaction-pooling mode to let serverless functions share a small number of real Postgres connections instead of exhausting your connection limit on every cold start. That's exactly what you want for your running app. But pooled connections have real limits:

- They don't support session-level features like prepared statements
- They don't support the `SET` commands that `pg_dump` relies on
- Schema migrations, seed scripts, and `pg_dump`/`pg_restore` all need the **unpooled** (direct) connection string instead
- Mixing them up gets you cryptic failures, not helpful errors

The fix is mechanical:

- Neon's dashboard gives you both strings side by side
- The pooled one is identifiable by a `-pooler` suffix on the hostname
- Keep two environment variables — something like `DATABASE_URL` (pooled, for the app) and `DATABASE_URL_UNPOOLED` (direct, for migrations)
- Point each tool at the right one deliberately rather than by habit

> **[📸 SCREENSHOT PLACEHOLDER]** — the Neon dashboard's Connection Details panel, showing pooled vs. direct connection strings side by side
>
> _Replace this callout with the real screenshot before publishing._

## Wiring it up

Add the integration from Vercel's Storage tab or the Neon Marketplace listing. Vercel provisions the Neon project and injects connection-string environment variables automatically, scoped per environment.

_.env.local_

```bash
# Pooled — use for the running app (serverless functions, API routes)
DATABASE_URL=postgresql://[user]:[password]@[endpoint]-pooler.neon.tech/[dbname]?sslmode=require

# Unpooled/direct — use for migrations, seed scripts, pg_dump/pg_restore
DATABASE_URL_UNPOOLED=postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require
```

```bash
# Migrating an existing Postgres database into Neon
pg_dump -Fc --no-tablespaces --no-owner --no-acl -d $OLD_DATABASE_URL -f backup.dump
pg_restore --no-owner --no-acl -d $DATABASE_URL_UNPOOLED backup.dump
```

> **⚠️ Warning — Pooled vs. unpooled is the one gotcha that will bite you**
>
> Every other part of this integration is close to zero-config. This one isn't automatic — you have to route the right tool to the right string yourself. Run migrations against the pooled URL and expect either silent failures or connections that hang until they time out.

## Database branching for previews

Neon's branching is copy-on-write: creating a branch doesn't copy your data, it creates a new reference point in storage that only diverges from its parent once you write to it. That's why branch creation is near-instant regardless of database size — a 2GB database and a 200GB database both branch in roughly the same amount of time.

Here's what branching gives you when the native Vercel integration is turned on:

- Every preview deployment can get its own branch automatically
- Each branch is seeded with a live copy of your actual data, not empty tables
- The branch's connection string is injected as a preview-scoped environment variable — no manual wiring
- A pull request that alters your schema, seeds test data, or runs a migration does all of that against an isolated copy
- Your production database, and every other open PR's database, stay untouched
- Branches are torn down automatically when the preview deployment is deleted, so you're not accumulating orphaned databases

This is the feature that most clearly justifies choosing Neon over a plain single-database Postgres host if you're doing any real team collaboration — testing a migration against a stale local dump is a much weaker signal than testing it against an actual branch of production data.

> **[🎥 VIDEO PLACEHOLDER]** — opening a pull request and watching Vercel provision a preview deploy with its own Neon branch attached
>
> _Replace this callout with the real video before publishing._

## What it costs

**Vercel:**

- Hobby: free, but non-commercial only
- Pro: $20/seat/month, includes $20 of usage credit
- Bandwidth and function-execution overages bill separately once you exceed included credit

**Neon's free tier includes:**

- 100 compute-hours per project per month (doubled from 50 in October 2025)
- 0.5GB storage per project
- Up to 10 branches
- Scale-to-zero mandatory (not optional) after a few minutes of inactivity — which is exactly what keeps a low-traffic project free indefinitely

**Past the free tier, Neon bills usage-based with no monthly minimum:**

- About $0.106/compute-hour
- $0.35/GB-month for storage
- Extra branches beyond your plan's included count run $1.50/branch-month
- For a small production app with modest preview-branch usage, budget somewhere in the $10-40/month range depending on how many branches stay alive at once and how much compute your app actually burns outside of idle scale-to-zero periods

Worth flagging since it changes nothing about your bill but confuses people:

- Neon was acquired by Databricks in May 2025 (~$1B)
- Databricks has since shipped "Lakebase," a separate enterprise product built on Neon's storage engine, which reached general availability in February 2026
- Lakebase is not what you're signing up for here — Neon.tech continues operating as an independent product with its own pricing, dashboard, and Vercel integration

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — the finished, live site with the Neon integration status panel showing "Connected"
>
> _Replace this callout with the real screenshot before publishing._

- App code uses the pooled connection string exclusively; migrations/seed scripts/`pg_dump` use the unpooled one
- Preview-branch integration enabled if your team opens PRs against schema or data changes regularly
- Confirmed which Neon plan tier you're on and modeled a rough compute-hour cost before a traffic spike surprises you
- Verified the Vercel-managed vs. Neon-managed integration choice matches how you want billing consolidated
- Custom domain DNS propagated and SSL certificate issued on Vercel's side

## Sources

- [Vercel Pricing](https://vercel.com/pricing)
- [Neon Pricing](https://neon.com/pricing)
- [Neon plans documentation](https://neon.com/docs/introduction/plans) — free tier limits, October 2025 compute-hour increase
- [Neon: new usage-based pricing](https://neon.com/blog/new-usage-based-pricing)
- [Neon connection pooling docs](https://neon.com/docs/connect/connection-pooling) — pooled vs. direct, PgBouncer transaction mode
- [Neon: migrate from Postgres via pg_dump/pg_restore](https://neon.com/docs/import/migrate-from-postgres)
- [Connecting with the Vercel-managed integration](https://neon.com/docs/guides/vercel-managed-integration)
- [Connecting with the Neon-managed integration](https://neon.com/docs/guides/neon-managed-vercel-integration)
- [Neon: Vercel-native integration announcement](https://neon.com/blog/neon-vercel-native-integration)
- [TechCrunch: Databricks buys Neon for $1B](https://techcrunch.com/2025/05/14/databricks-to-buy-open-source-database-startup-neon-for-1b/)
