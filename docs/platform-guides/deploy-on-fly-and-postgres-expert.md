---
title: "Deploy on Fly.io + Fly Managed Postgres (Expert)"
tagline: "Multi-region strategy, Postgres HA internals, fly.toml as infrastructure-as-code, and how portable this stack really is"
category: own-your-stack
source_platform: fly
target_platform: fly-managed-postgres
difficulty: expert
cost_range_usd: "50-2500+/mo"
tags: ["hosting", "database", "requires-cli", "platform-evaluation"]
level: expert
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Multi-region Fly deployment strategy and Anycast routing"
  - "Writing fly.toml as infra-as-code (health checks, bluegreen deploys)"
  - "Postgres HA internals (repmgr/stolon, failover, replicas)"
  - "Cost modeling across compute, Postgres plan, storage, and egress"
  - "Evaluating platform portability and vendor lock-in"
requirements:
  - "A Fly.io account with production billing configured"
  - "flyctl installed locally"
  - "A Dockerfile-based app ready for multi-region deployment"
  - "Familiarity with Postgres HA concepts and failover procedures"
  - "A defined cost and region strategy for scale"
effort_hours_min: 6
effort_hours_max: 12
---

# Deploy on Fly.io + Fly Managed Postgres — Expert Guide

You've run production infrastructure before. I'll skip the click-through and go straight to what actually differentiates this stack: multi-region placement as a first-class concern, what "HA Postgres" actually means on Fly's two different Postgres products, `fly.toml` as version-controlled infra, cost modeling once you're past hobby scale, and — since this is a migration guide — an honest answer to how locked-in you actually get.

Verdict up front, since I checked this pairing specifically for friction as part of a migration series: same-vendor app+database proximity is real and load-bearing, not marketing copy — Fly's private network and region-matching genuinely collapse app-to-database latency close to `localhost`. The friction that exists is real too: no free tier, a Postgres product line that has changed shape more than once (unmanaged → MPG), and MPG's region list and feature set both currently lag general Fly compute. None of that is disqualifying; all of it should be priced in before you commit.

## Multi-region strategy: Fly's actual differentiator

Fly's core pitch versus a single-region PaaS (Vercel, Render, Railway) is that you can run app Machines in multiple regions simultaneously, with Anycast routing sending each request to the nearest healthy one, without you operating a CDN or a separate load-balancer product. Practically:

```toml
app = "your-app-name"
primary_region = "iad"

[[vm]]
  size = "shared-cpu-2x"
  memory = "1gb"
```

```bash
fly scale count 3 --region iad,fra,syd   # spread Machines across three regions
```

`primary_region` sets where `fly deploy` creates new Machines by default and populates the `PRIMARY_REGION` env var inside each Machine — this matters more than it sounds, because for a stateful app talking to a single-writer Postgres cluster, "primary" should mean "co-located with your database's write node," not just "closest to most users."

- **Read-heavy workloads** benefit from replicas in secondary regions reading local data.
- **Write-heavy workloads** should keep the app's primary region pinned to wherever Postgres's leader lives, and accept that requests routed to other regions incur a cross-region round trip for writes.

This is the actual trade-off multi-region deployments force you to confront everywhere, not just on Fly: you can make reads fast globally, but a single-writer relational database means writes are only as close as your nearest write-capable node. Fly doesn't solve that with magic — it just gives you the primitives (regions, private networking, Anycast) cheaply enough that you can actually experiment with the trade-off instead of it being an enterprise-only exercise.

## Postgres HA: two different mechanisms depending on which product

**Unmanaged Fly Postgres** clusters implement HA themselves, as ordinary Fly apps running orchestration software:

- 3+ node clusters use `repmgr` for leader election and streaming replication.
- Older 2-node topologies used `stolon`; current tooling defaults to `repmgr`-based clusters.
- Failover is manual-triggerable: `fly postgres failover --app <name>` promotes a replica if you need to force it, and automatic failover kicks in if the primary becomes unhealthy — but you are the one who set up and validated that this works, and you're the one debugging it at 2 a.m. if `repmgr` misbehaves.
- Adding a replica: `fly machine clone` against an existing Postgres Machine, targeting a new region, then letting the cluster's orchestration pick it up as a standby.
- Cost for a real 3-node HA unmanaged cluster: roughly **$82–164/month** in Machine and volume costs alone — no support included, no managed backup verification, no version-upgrade tooling.

**Fly Managed Postgres** takes this off your plate entirely. Every MPG plan includes these as baseline features, not an add-on tier:

- HA with automatic failover
- Encrypted backups
- Monitoring
- Connection pooling

You don't choose `repmgr` vs. `stolon`; you don't run `fly postgres failover` yourself. The trade-off is control and maturity: MPG is the newer product, and Fly's own docs currently list these as not yet available on MPG:

- Security patching and version upgrades
- Most third-party extensions (only `pgvector` and PostGIS ship beyond the stock Postgres 16 contrib set as of writing)
- Customer alerting
- Migration tooling

If your workload needs an extension outside that list, or you need to control upgrade timing precisely, that's a real constraint to validate before committing production data to MPG.

Pricing scales by plan, not by node count you configure yourself:

- **Basic**: $38/mo, shared-2x/1GB
- **Performance**: $1,922/mo, performance-8x/64GB
- **Storage**: $0.28/GB/month, up to 1TB

You're paying for a managed HA topology as a unit, the same conceptual shape as RDS Multi-AZ or a Neon/Supabase paid tier, not for N raw compute nodes you wire together yourself.

## fly.toml as infrastructure-as-code

`fly.toml` is a genuinely declarative, git-committable config — closer to a lightweight Terraform resource than a dashboard-driven PaaS config. Worth treating it that way:

```toml
app = "your-app-name"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[deploy]
  strategy = "bluegreen"
  wait_timeout = "10m"

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "suspend"
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  interval = "15s"
  timeout = "5s"
  grace_period = "10s"
  method = "GET"
  path = "/healthz"

[[vm]]
  size = "performance-1x"
  memory = "2gb"
```

Practical notes at this level:
- `deploy.strategy = "bluegreen"` runs new Machines alongside old ones and cuts over on health checks passing — the closest thing Fly has to a zero-downtime deploy guarantee without you hand-rolling it.
- Health checks (`http_service.checks`) gate the bluegreen cutover — without one, "successful deploy" only means "the Machine started," not "the app is actually serving correctly."
- `auto_stop_machines = "suspend"` (vs. `"stop"`) preserves memory state and resumes faster, at the cost of continuing to pay for the underlying resources while suspended — pick based on whether cold-start latency or idle cost matters more for your workload.
- Treat `fly.toml` plus your `Dockerfile` as the complete, portable definition of your app's runtime — commit both, review changes to both in PRs, and resist configuring anything load-bearing only through the dashboard, for the same reason you wouldn't want undocumented manual changes on any other piece of infra.
- MPG cluster configuration currently lives outside `fly.toml` (it's an org-level resource managed via `fly mpg` commands, not app-scoped config) — worth tracking your `fly mpg create` invocation and plan choice in a README or a script, since it isn't captured as code the way your app config is.

## Cost modeling at scale

Compute and Postgres scale independently and need to be modeled together:

| Layer | Small production | Growing production | Heavy production |
|---|---|---|---|
| App Machines | 1× shared-cpu-1x, ~$4-6/mo | 3× performance-1x multi-region, ~$90-125/mo | 6-12× performance-2x/4x, $500-1,500+/mo |
| MPG plan | Basic, $38/mo | Launch, $282/mo | Scale/Performance, $962-1,922/mo |
| MPG storage | ~10GB, ~$2.80/mo | ~100GB, ~$28/mo | 500GB+, $140+/mo |
| Data transfer | Minimal, often <$5/mo | Regional egress, $20-100/mo depending on traffic mix | Meaningful line item, easily $100s/mo on high-egress workloads |
| Support plan (optional) | Community (free) | Standard, $29/mo | Premium $199/mo or Enterprise from $2,500/mo |

A few things that surprise people moving from a simpler PaaS:

- **Data transfer is billed per region-group**: North America/Europe at $0.02/GB egress, Asia Pacific/Oceania/South America at $0.04/GB, Africa/India at $0.12/GB.
- **Starting February 2026, inter-region private network traffic between your app and an MPG cluster in a different region is billed at the same rate** — same-region traffic stays free, which is one more concrete reason to keep app and database co-located rather than spread for its own sake.
- **Stopped Machines aren't free either** — you pay $0.15/GB/month for the root filesystem even while stopped.
- **MPG clusters bill continuously regardless of app-side traffic**, since they don't scale to zero.

Reservation blocks (pay upfront annually, get a 40% discount on a fixed monthly compute allowance) are worth modeling once your compute spend is predictable — available in $20/mo, $200/mo, and $2,000/mo performance-Machine tiers, and equivalent smaller tiers for shared Machines.

## How portable is this stack, really?

This is the question that matters most for a migration guide, and the honest answer is: **more portable than it looks, less portable than raw self-hosted Postgres.**

**What's genuinely portable**: Fly deploys are Docker-image-based. Fly doesn't run your container under literal `dockerd` — your image boots as a lightweight Firecracker microVM — but the packaging format is standard OCI/Docker images built from a `Dockerfile` you own. That matters in practice because:

- That `Dockerfile` runs unmodified on any other Docker-compatible host: another VPS, ECS, Cloud Run, Railway, a Hetzner box with `docker compose`.
- You are not writing to a Fly-proprietary runtime API for your application code.
- This is a meaningfully different position than, say, deploying to a platform that requires you to structure your app around its specific serverless function format.

**What's Fly-specific and needs an adapter if you leave:**

- `fly.toml` itself — regions, scaling rules, health checks in Fly's schema.
- The `fly mpg` / `fly postgres` CLI surface.
- Fly's private networking (6PN/WireGuard).
- Anycast-based multi-region routing.

None of these have a drop-in equivalent elsewhere — leaving Fly means re-implementing your region strategy and health-check config in whatever the new platform's config format is, and re-plumbing how your app finds its database.

**Your database is the least locked-in part of the whole stack.** Fly Managed Postgres and unmanaged Fly Postgres are both just Postgres underneath:

- `pg_dump`/`pg_restore` (or Fly's own `fly mpg import` for cluster-to-cluster migration) move your actual data to any other Postgres host with no format conversion.
- This is the same portability story as every other Postgres-based pairing in this guide series: the database was never the trap.
- The plain-SQL schema, if you keep it in version-controlled migrations rather than ad hoc changes, moves with you as ordinary `.sql` files regardless of which company is running the server underneath.

Net assessment: choosing Fly + Fly Managed Postgres is a reasonable middle ground between "fully managed, fully opaque" (a black-box PaaS) and "fully self-hosted, fully your responsibility" (bare Hetzner VPS). You get real infrastructure control (regions, scaling, `fly.toml` as code) and a real emergency exit (Docker image portability, plain Postgres underneath), at the cost of a same-vendor pairing that — like all same-vendor pairings — optimizes hardest for staying inside that one vendor's private network.

## Sources

- [Regions · Fly Docs](https://fly.io/docs/reference/regions/)
- [App configuration (fly.toml) · Fly Docs](https://fly.io/docs/reference/configuration/)
- [Architecture · Fly Docs](https://fly.io/docs/reference/architecture/)
- [Builders and Fly.io · Fly Docs](https://fly.io/docs/reference/builders/)
- [Managed Postgres · Fly Docs](https://fly.io/docs/mpg/)
- [High Availability & Global Replication · Fly Docs](https://fly.io/docs/postgres/advanced-guides/high-availability-and-global-replication/)
- [How We Built Fly Postgres · The Fly Blog](https://fly.io/blog/how-we-built-fly-postgres/)
- [Private Networking · Fly Docs](https://fly.io/docs/networking/private-networking/)
- [Fly.io Resource Pricing](https://fly.io/docs/about/pricing/)
- [Import data from another postgres cluster · Fly Docs](https://fly.io/docs/mpg/import/)
