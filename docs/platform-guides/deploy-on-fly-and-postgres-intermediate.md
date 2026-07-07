---
title: "Deploy on Fly.io + Fly Managed Postgres (Intermediate)"
tagline: "flyctl, private networking, and attaching a Postgres cluster to an app — for people who've deployed before"
category: own-your-stack
source_platform: fly
target_platform: fly-managed-postgres
difficulty: intermediate
cost_range_usd: "10-50/mo"
tags: ["hosting", "database", "requires-cli", "platform-evaluation"]
level: intermediate
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Using flyctl to manage apps and Postgres clusters"
  - "Reading and editing fly.toml configuration"
  - "Understanding Docker builds / Cloud Native Buildpacks"
  - "Basic Postgres connection pooling concepts (PgBouncer)"
  - "Weighing managed vs. self-managed Postgres trade-offs"
requirements:
  - "A Fly.io account with a credit card on file"
  - "flyctl installed locally"
  - "A Dockerfile or buildpack-compatible app"
  - "Knowledge of which Postgres extensions your app needs"
effort_hours_min: 3
effort_hours_max: 6
---

# Deploy on Fly.io + Fly Managed Postgres — Intermediate Guide

You've deployed before, you know git and basic Docker, and you don't need me to explain what a container is. Fly.io deploys are Docker-based end to end — flyctl either finds your `Dockerfile` or generates one via Cloud Native Buildpacks, builds an image, and ships it as a lightweight VM. I'll move fast through setup and spend the real time on the two things worth understanding properly: how Postgres attaches to your app over Fly's private network, and where the cost floor actually sits.

Framing note, since this is a migration guide: I checked this pairing specifically for friction, because Fly is the same vendor on both sides of the app/database line — that's rare in this series, and Fly explicitly markets it as a feature.

- **Verdict**: genuinely close to zero integration friction by design.
- **The real friction is elsewhere**: there's no free tier, and Fly's Postgres offering has changed shape more than once, so "Fly Postgres" doesn't mean one fixed thing depending on when you read about it.

## Two different things both called "Fly Postgres" — get this right first

Fly currently ships **two** distinct Postgres products, and confusing them is the single most common mistake people bring into this stack:

1. **Fly Postgres (unmanaged)** — the older pattern.
   - It's literally a Fly app: Machines, a volume, and orchestration scripts (`repmgr` for 3+ node clusters, older 2-node clusters used `stolon`) that you deploy into your own org, then manage yourself.
   - Fly explicitly documents this is now an **unsupported product** for new production use.
   - It still works and it's cheap: roughly **$2/month** for a single dev node, **$82–$164/month** for a real 3-node HA cluster.
   - Fly won't help you with scaling, patching, or point-in-time recovery on it.
2. **Fly Managed Postgres ("MPG")** — the current, actively developed product.
   - Fly runs it for you: automatic backups and recovery, HA with automatic failover, monitoring, resource scaling, encryption at rest and in transit, and a support portal.
   - This is what Fly wants new users on.
   - Plans start at **Basic ($38/mo, shared-2x/1GB)** up through **Performance ($1,922/mo, performance-8x/64GB)**, plus storage at **$0.28/GB per 30-day month** (up to 500GB at creation, 1TB max).

Worth knowing before you commit: MPG is genuinely newer and still filling in gaps. As of this writing, Fly's own docs list these as "not there yet" on MPG:

- Security patches and version upgrades
- Most third-party extensions beyond `pgvector` and PostGIS
- Customer-facing alerting
- Migration tooling

If you need a Postgres extension outside that short list, check before you build around it.

For a production app you're actually migrating onto Fly, use Managed Postgres. Reach for unmanaged Fly Postgres only if you specifically want to run your own HA topology and you're comfortable being the one who fixes it when it breaks — which pulls you into the same operational burden as the Hetzner self-hosted path elsewhere in this series, just running on Fly's compute instead of a bare VPS.

## Setup and attach flow

> **[📸 SCREENSHOT PLACEHOLDER]** — `fly mpg create` prompt sequence and the resulting cluster in the Fly dashboard
>
> _Replace this callout with the real screenshot before publishing._

```bash
# Install and authenticate
curl -L https://fly.io/install.sh | sh
fly auth login

# From your app's project directory
fly launch --no-deploy   # generates fly.toml, detects Dockerfile/buildpack, doesn't ship yet

# Create a Managed Postgres cluster
fly mpg create
# prompts: cluster name, org, region, plan (Basic/Starter/Launch/Scale/Performance)

# Attach the cluster to your app — this is the key step
fly mpg attach <cluster-id> --app <your-app-name>
```

`fly mpg attach` (and the older `fly postgres attach` for unmanaged clusters) does the actual wiring:

- Creates a database and role scoped to your app.
- Writes a `DATABASE_URL` secret directly into your app's environment — no manual copy-paste of host/port/password between dashboards.
- Points the connection string at the **pooled** endpoint (PgBouncer-backed) by default, which is what you want for anything other than a single long-lived admin connection.

```bash
fly deploy       # build and ship your app
fly status       # confirm health
fly mpg status <cluster-id>   # confirm cluster health separately — it lives outside your app
```

**Important operational note**: a Managed Postgres cluster is not owned by any one app — it's its own resource in your org. Deleting the app that was attached to it does **not** delete the cluster. Fly's own pricing docs flag this explicitly because it's a real source of surprise charges: check your dashboard when decommissioning an app, don't assume the database went with it.

## Private networking: why proximity is real, not marketing

Every Fly organization gets a private IPv6 network (6PN) connecting all Machines in that org, across every region, over WireGuard tunnels between Fly's edge nodes. When your app and your Managed Postgres cluster live in the same region, traffic between them travels this private network rather than the public internet:

- No TLS handshake to the outside world.
- No egress through a different company's load balancer.
- In Fly's own framing, potentially the same physical rack.

This is the concrete version of the "frictionless by design" claim: pick the same `primary_region` for your app and your MPG cluster, and the distance between "your code" and "your data" collapses to something close to `localhost` latency, without you configuring VPC peering, security groups, or a separate networking product. Contrast this with pairing, say, a Vercel app with a database hosted by a different company in a different cloud, where the connection always crosses the open internet regardless of how carefully you pick regions.

The trade-off: MPG currently supports fewer regions than general Fly compute. As of writing, the supported list is:

- `ams`, `fra`, `gru`, `iad`, `lax`, `lhr`, `nrt`, `ord`, `sin`, `sjc`, `syd`, `yyz`

If your app's ideal region isn't on that list, you'll either accept a small cross-region hop for the database or deploy your app in one of the supported regions instead.

## fly.toml basics

```toml
app = "your-app-name"
primary_region = "ord"        # match this to your MPG cluster's region

[build]

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true    # scales to zero when idle — saves cost on low-traffic apps
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

`auto_stop_machines`/`auto_start_machines` matter for cost control on a small app:

- Fly can stop your Machine when there's no traffic and cold-start it on the next request.
- This is how a lot of low-traffic side projects keep compute costs near $2–5/month.
- Your Managed Postgres cluster does **not** scale to zero the same way — you're paying the flat plan price continuously regardless of app traffic.

## Realistic cost model at this stage

- Small always-on app Machine (shared-cpu-1x, 512MB–1GB): **~$3–6/mo**
- MPG Basic (shared-2x, 1GB, includes HA + backups + pooling): **$38/mo** flat + storage at $0.28/GB
- Combined realistic floor for a real (not toy) production app: **~$45–50/mo**, before bandwidth
- Cheaper path if you're not ready for MPG's price: unmanaged Fly Postgres 3-node HA cluster runs **~$82–164/mo** in compute alone (no support, no managed backups) — often *more* expensive than MPG once you account for that it's compute-only pricing with no support built in, which is worth sitting with before assuming "unmanaged" means "cheaper."

## Go-live checklist

> **[🎥 VIDEO PLACEHOLDER]** — full `fly launch` → `fly mpg create` → `fly mpg attach` → `fly deploy` walkthrough
>
> _Replace this callout with the real video before publishing._

- Confirmed which Postgres product you're on — Managed Postgres vs. unmanaged Fly Postgres — and documented why
- App's `primary_region` in `fly.toml` matches (or is adjacent to) your MPG cluster's region
- `DATABASE_URL` secret confirmed present via `fly secrets list`, pointed at the pooled endpoint
- Confirmed which Postgres extensions you need are actually supported on MPG (only `pgvector` and PostGIS beyond the default 16 distribution, as of writing)
- Billing alert or Cost Management review set up before pointing real traffic at it
- Verified the MPG cluster is *not* deleted automatically if you tear down or rename the attached app

## Sources

- [Managed Postgres · Fly Docs](https://fly.io/docs/mpg/)
- [Create and Connect to a Managed Postgres Cluster](https://fly.io/docs/mpg/create-and-connect/)
- [fly mpg · Fly Docs](https://fly.io/docs/flyctl/mpg/)
- [fly postgres attach · Fly Docs](https://fly.io/docs/flyctl/postgres-attach/)
- [Fly Postgres (Unmanaged) · Fly Docs](https://fly.io/docs/postgres/)
- [This Is Not Managed Postgres · Fly Docs](https://fly.io/docs/postgres/getting-started/what-you-should-know/)
- [Private Networking · Fly Docs](https://fly.io/docs/networking/private-networking/)
- [App configuration (fly.toml) · Fly Docs](https://fly.io/docs/reference/configuration/)
- [Fly.io Resource Pricing](https://fly.io/docs/about/pricing/)
- [Regions · Fly Docs](https://fly.io/docs/reference/regions/)
