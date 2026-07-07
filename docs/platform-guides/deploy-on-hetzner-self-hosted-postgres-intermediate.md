---
title: "Deploy on Hetzner + self-hosted Postgres"
tagline: "Maximum control, no third-party platform involved — and squarely advanced territory"
category: own-your-stack
source_platform: hetzner
difficulty: advanced
level: intermediate
cost_range_usd: "4-15/mo"
tags: ["hosting", "database", "requires-cli", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Comfortable with SSH and the Linux command line"
  - "Has run docker compose up before without getting nervous"
  - "Can configure a firewall (ufw or Hetzner Cloud Firewall)"
  - "Basic Postgres administration (backups, restores)"
requirements:
  - "A Hetzner VPS (or similar) with root access"
  - "An SSH key pair for key-only authentication"
  - "S3-compatible object storage for off-site backups"
  - "A domain, if routing through Coolify/Dokploy with SSL"
effort_hours_min: 12
effort_hours_max: 30
---

# Deploy on Hetzner + self-hosted Postgres (intermediate)

This is the only guide in my whole series with zero third-party platform in the stack — just a server you rent and software you run yourself. I'm assuming here that you've SSH'd into a box before, you've run `docker compose up` at least once, and none of that made you nervous. If that's you, this is a genuinely good option. If it's not quite you yet, read the beginner version of this guide first — it's not padding, it's the prerequisite list.

## What it costs, and what changed recently

Hetzner runs two relevant shared-resource lines:

- **CX line** (cost-optimized, older hardware) — starts around €4.35/month for CX22: 2 vCPU, 4GB RAM, 40GB NVMe disk
- **CPX line** (dedicated AMD vCPU, better sustained performance) — starts higher; CPX22 rose from €5.99 to €7.99/month in Germany and Finland after an April 2026 increase
- Both lines include a generous bandwidth allowance (20TB on the CX line), with overages billed at roughly €1/TB

Then a second, larger increase landed June 15, 2026, driven by a genuine industry-wide DRAM shortage — server memory contract prices jumped over 40% quarter-over-quarter through late 2025 and into 2026 as manufacturers redirected production toward the memory chips AI data centers need. What that increase did to each line:

- **CPX and CCX lines** — hit hardest, up 144-176% and 113-169% respectively on new orders
- **CX/CAX line** (cost-optimized) — rose a comparatively modest 33-38%

Two things worth knowing:

1. It only applies to new orders and rescales, not contracts you already have running
2. If raw price is your priority, the CX line is now the meaningfully cheaper choice versus CPX, not just a slightly cheaper one

> **[📸 SCREENSHOT PLACEHOLDER]** — the Hetzner Cloud pricing page, CX vs CPX comparison
>
> _Replace this callout with the real screenshot before publishing._

Budget separately for off-site backup storage (a few dollars a month for S3-compatible object storage) — more on why that's non-negotiable below.

## The pairing that's actually easy here

Every other guide in this series has you connecting your app on one company's infrastructure to a database on another company's infrastructure — Vercel talking to Supabase, Railway talking to Neon. That connection is where a lot of the friction lives:

- Network latency between providers
- Connection limits imposed by the database side
- TLS configuration across two separate vendors
- Egress fees for data crossing provider boundaries

Here, there's none of that, because Postgres runs as a process on the *same machine* as your app. Your app's database connection string points at `localhost` or a private Docker network address, not across the public internet to some other company's data center. Concretely, that means:

- No cross-provider auth handshake
- No separate billing relationship for the database
- No "why is my connection pool exhausted talking to a database three regions away" debugging sessions

This is the one pairing in the entire series that's frictionless by construction. Everything else about this stack — the part that isn't the pairing — is where the real work lives, and that's the rest of this guide.

## Setting it up: Coolify or Dokploy on top of raw Docker

You *can* hand-roll `docker-compose.yml` files and manage everything with raw Docker commands over SSH. Plenty of people do. But in 2026 the more commonly recommended path is running a self-hosted PaaS layer on top of your VPS — it handles reverse proxying, automatic SSL certificates, and container orchestration so you're not hand-writing Nginx configs.

**Coolify vs. Dokploy, side by side:**

- **Coolify**
  - The established option, in active development since 2022
  - Apache 2.0 licensed — genuinely open, forkable, resellable
  - Large template library
  - Idles at roughly 5-7% CPU baseline
- **Dokploy**
  - Newer, launched 2024, and lighter
  - Idles at roughly 1% CPU, which matters more than it sounds like on a 2-vCPU box
  - License is source-available with restrictions, not fully open

For a single project, either is fine. I lean Coolify for the license and maturity, Dokploy if you want the lightest possible footprint.

```bash
# Coolify one-line installer, run on a fresh Hetzner VPS
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Once it's running, you add Postgres as a "service" through Coolify's UI, or define it directly if you're going the raw Compose route:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: always
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

> **[🎥 VIDEO PLACEHOLDER]** — full run-through: fresh VPS to running Coolify instance with Postgres attached
>
> _Replace this callout with the real video before publishing._

## The four things that actually trip people up

1. **Leaving Postgres's port open to the world.** That `ports: "5432:5432"` line above works, but it also means anyone on the internet can attempt a connection to your database port.
   - Restrict it with a firewall — Hetzner Cloud Firewall or `ufw` on the box itself
   - Limit it to only your app's own network or a specific trusted IP
   - Don't rely on the Postgres password alone as your only line of defense

2. **Treating "a `pg_dump` ran successfully" as "I have backups."** A dump file sitting on the same disk as the database it backed up disappears the moment that disk does.
   - Push backups off-box to S3-compatible storage — Hetzner has its own Object Storage product, or use Backblaze B2
   - Actually run a restore from that backup at least once before you trust it — this is the part people skip

3. **Forgetting that pgBackRest's status changed twice this year.** Here's the timeline:
   - **April 2026** — pgBackRest archived after its sponsor situation collapsed
   - **Following weeks** — a wave of guides scrambled to recommend WAL-G as the successor
   - **May 2026** — a coalition of sponsors, including AWS, Supabase, and Percona, revived pgBackRest and it's actively maintained again
   - **Today** — check its GitHub activity yourself before you commit to it, since this space moved twice in two months

4. **Underestimating connection limits under real traffic.** Postgres handles a modest number of direct connections comfortably, then degrades sharply past a few hundred concurrent ones. If your app framework doesn't pool connections itself, you'll want PgBouncer in front of Postgres sooner than you'd expect — this is covered concretely in the expert version of this guide.

## Go-live checklist

- SSH key-only authentication, password auth disabled entirely
- Firewall restricting the Postgres port to trusted sources, not `0.0.0.0/0`
- Off-site backup running on a schedule, with at least one test restore completed
- No crypto-adjacent workloads on the box — Hetzner's terms explicitly prohibit mining, staking, and even running blockchain nodes, and they enforce it with account termination

## Sources

- [Hetzner Cloud pricing](https://www.hetzner.com/cloud/regular-performance)
- [Hetzner Price Adjustment, June 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [Hetzner Cloud Pricing After the April 2026 Increase](https://www.bitdoze.com/hetzner-cloud-cost-optimized-plans/)
- [Coolify vs Dokploy: Complete Comparison Guide 2026](https://contabo.com/blog/blog-coolify-vs-dokploy-comparison/)
- [Coolify Docker Compose docs](https://coolify.io/docs/knowledge-base/docker/compose)
- [pgBackRest will continue — Percona sponsorship announcement](https://www.globenewswire.com/news-release/2026/05/19/3297383/0/en/Open-Source-Stays-Open-Percona-Sponsors-pgBackRest-to-Keep-PostgreSQL-Backups-Running.html)
- [PostgreSQL Connection Pooling with PgBouncer: A Complete Guide](https://rivestack.io/blog/postgresql-connection-pooling-pgbouncer)
- [Why Hetzner banned cryptocurrency mining](https://serveropsmasters.com/why-hetzner-banned-cryptocurrency-mining-what-it-means-for-cloud-users-storage-performance-and-compliance/)
