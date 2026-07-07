---
title: "Deploy on Render + Supabase (Intermediate)"
tagline: "Git-push deploys with predictable pricing, minus the free-Postgres expiration trap"
category: own-your-stack
source_platform: render
target_platform: supabase
difficulty: intermediate
level: intermediate
cost_range_usd: "7-75/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Comfort with environment variables and connection strings"
  - "Understanding connection pooling (Supavisor/PgBouncer, port modes)"
  - "Reading vendor pricing tables to model monthly cost"
  - "Basic IPv4 vs IPv6 networking concepts"
  - "Git-push deploy workflow experience"
requirements:
  - "A GitHub account with a deployable repo"
  - "A Render account"
  - "A Supabase account"
  - "Knowledge of your app framework's connection-pooling requirements"
effort_hours_min: 2
effort_hours_max: 4
---

# Deploy on Render + Supabase (Intermediate)

Render is a Heroku-shaped platform: connect a repo, get a build pipeline, zero-downtime deploys, and autoscaling without touching a server yourself. It runs on top of AWS and Google Cloud rather than owning its own data centers, which matters once you start thinking about where your database should live. Supabase stays your database either way — the question is just how the two wire together, and where the friction actually is. I've deployed this pairing; here's what it costs and what to watch for.

## What it costs, precisely

> **[📸 SCREENSHOT PLACEHOLDER]** — the pricing pages referenced below
>
> _Replace this callout with the real screenshots before publishing._

- **Render web services**: free tier gives 750 instance-hours/workspace/month, but free services spin down after 15 minutes idle and take ~1 minute to wake up — fine for staging, not for production. Paid tiers: Starter $7/month (512MB RAM, 0.5 CPU), Standard $25/month (2GB RAM, 1 CPU), Pro $85/month (4GB RAM, 2 CPU), up to Pro Ultra at $450/month. Billing is prorated to the second.
- **Render static sites**: free, permanently, with no time limit — counts against your workspace's pooled bandwidth and build-minute allowances.
- **Render's own Postgres**: this is the detail that should steer your decision. Free instances are capped at 1GB storage and **expire 30 days after creation**, with a 14-day grace period before Render deletes the database entirely. Free Render Postgres also has no backups and no managed connection pooling. Paid Render Postgres starts at $7/month (Basic-256mb) and storage is billed separately at $0.30/GB/month, scaling up to $175/month (Pro Plus) for larger compute tiers.
- **Supabase**: Free tier (500MB database, 5GB egress/month, pauses after 7 days of inactivity, no hard expiration), Pro at $25/month (8GB database, 100GB storage, 500 realtime connections, $10/month in compute credits included), Team at $599/month for SOC2/ISO compliance and 14-day backup retention.
- **Supabase IPv4 add-on**: $0.0055/hour (~$4/month) if you need a static IPv4 address for direct (non-pooled) connections — relevant if your framework or ORM doesn't support connecting via Supavisor.

The practical read: pairing Render with Supabase instead of Render's own Postgres costs about the same or less once you factor in that Render Postgres's free tier isn't viable long-term (30-day expiration) and its paid tier's storage pricing adds up. Supabase Pro at $25/month flat also bundles auth, storage, and realtime — features you'd otherwise build yourself on top of a bare Postgres instance.

## Setting it up

> **[🎥 VIDEO PLACEHOLDER]** — a full run-through of the steps below, start to finish
>
> _Replace this callout with the real video before publishing._

Setup steps:

1. Connect your GitHub repo in Render's dashboard via **New → Web Service**.
2. Render auto-detects your build and start commands for most frameworks; override them if needed.
3. Set your Supabase connection string as an environment variable under the service's **Environment** tab.

The connection string matters more than it sounds like it should. Use Supabase's **Transaction pooler** string (port 6543), not the direct connection (port 5432), for two reasons specific to this pairing:

1. **IPv4/IPv6 mismatch.** Render's outbound networking is IPv4-only. Supabase's direct connection resolves to an IPv6 address by default. The Supavisor pooler is IPv4-compatible out of the box, so it's the path of least resistance unless you pay Supabase's $4/month IPv4 add-on to get a static IPv4 address for direct connections.
2. **Connection churn.** A Render web service that autoscales to multiple instances, or a serverless-style workload, opens and closes many short-lived connections. Postgres has a hard cap on simultaneous connections; Supavisor's transaction mode multiplexes many client connections over a smaller pool of real database connections, which is exactly the profile a scaled Render service produces.

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

If your app framework requires session-level features the transaction pooler doesn't support (session-scoped prepared statements, `LISTEN`/`NOTIFY`), use the pooler's session mode on port 5432 instead, or the IPv4 add-on with a direct connection.

## The cross-cloud question, answered honestly

This is worth being precise about, because it's different from the DigitalOcean+Supabase story. Render isn't running its own physical data centers — it's built on top of AWS and Google Cloud infrastructure, abstracted behind Render's own dashboard and control plane. Supabase also runs exclusively on AWS. So there's a real question: are Render and Supabase ever in the "same cloud," meaning could this pairing actually be co-located the way an app and database inside the same AWS account can be?

The honest answer is no, not in a way you can configure:

- Even though Render's underlying compute may physically sit on AWS hardware, Render doesn't expose "deploy into AWS region X inside your own VPC."
- You get one of five Render regions (Oregon, Ohio, Virginia, Frankfurt, Singapore).
- Your service talks to Supabase over the public internet like any other external database, regardless of which cloud happens to be underneath Render in that region.
- There's no peering discount or private network path between the two companies' infrastructure.

What that costs you in practice:

- Pick geographically adjacent regions — Render's Virginia or Ohio region paired with Supabase's `us-east-1`, for example.
- Expect the added round-trip from crossing this boundary to typically land in the single-digit-to-a-few-dozen-millisecond range.
- That's noticeably more than same-VPC, sub-millisecond round trips, but for a typical CRUD app making a handful of queries per page load, it's not the bottleneck.
- It becomes worth worrying about only for workloads doing many sequential round trips per request (N+1 query patterns, chatty ORMs) — and at that point, the fix is usually reducing query count, not chasing co-location.

**Bottom line: this pairing works without meaningful friction for the vast majority of apps.** The two things worth deciding deliberately:

1. Region proximity.
2. Using the Supavisor pooler (not the direct IPv6 connection) from the start, since Render's IPv4-only networking makes that the default correct choice rather than an optimization.

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — the final live site after deploy
>
> _Replace this callout with the real screenshot before publishing._

- Using Supabase's Transaction pooler connection string (port 6543), not the direct IPv6 connection
- Supabase connection string stored as an encrypted env var in Render, not in code
- Supabase project region chosen close to your Render service's region
- Confirmed you did **not** default to Render's own free Postgres for anything beyond a 30-day experiment
- SSL certificate issued (automatic on Render for custom domains)
- Custom domain DNS pointed at the CNAME/A record Render provides
- If autoscaling to multiple instances, verified your Supabase plan's connection pool limit can handle peak concurrent instances

## Sources

- [Render Pricing](https://render.com/pricing)
- [Render: Deploy for Free](https://render.com/docs/free)
- [Render Postgres: Flexible Plans](https://render.com/docs/postgresql-refresh)
- [Render: Free PostgreSQL instances now expire after 30 days](https://render.com/changelog/free-postgresql-instances-now-expire-after-30-days-previously-90)
- [Render: Regions](https://render.com/docs/regions)
- [Render: Connection Pooling](https://render.com/docs/postgresql-connection-pooling)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supavisor: Connection Terminology Explained](https://supabase.com/docs/guides/troubleshooting/supavisor-and-connection-terminology-explained-9pr_ZO)
- [Supabase: Dedicated IPv4 Address for Ingress](https://supabase.com/docs/guides/platform/ipv4-address)
- [Migrate from Render to Supabase](https://supabase.com/docs/guides/platform/migrating-to-supabase/render)
