---
title: "Deploy on Hetzner + self-hosted Postgres"
tagline: "Maximum control, no third-party platform involved — and squarely advanced territory"
category: own-your-stack
source_platform: hetzner
difficulty: advanced
level: expert
cost_range_usd: "4-15/mo"
tags: ["hosting", "database", "requires-cli", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "PostgreSQL performance tuning (memory, connections)"
  - "Configuring PgBouncer connection pooling"
  - "WAL-based backup and point-in-time recovery tooling"
  - "Linux security hardening (fail2ban, unattended-upgrades)"
requirements:
  - "A production-grade Hetzner VPS (4 vCPU/8GB+, e.g. CX32/CPX32)"
  - "Root/sudo access to the server"
  - "S3-compatible off-site storage for WAL archiving"
  - "An existing self-hosted Postgres instance to tune and harden"
effort_hours_min: 18
effort_hours_max: 40
---

# Deploy on Hetzner + self-hosted Postgres (expert)

You know how to run production infrastructure, so I'll skip the setup narrative and go straight at the parts that matter: what the pairing actually costs you at the margin, tuning, PITR, and the hardening that separates "runs fine in a demo" from "survives an incident."

## The pairing, precisely stated

Hetzner-the-VPS and Postgres-the-database pair with zero network friction because they're the same box. The connection is over `localhost` or a private Docker bridge network, not a public endpoint, so you skip:

- TLS-in-transit overhead
- Cross-provider egress fees
- Connection-limit surprises that come from a managed database sitting behind a shared pooler you don't control

That's the entire frictionless part of this stack. Everything downstream of "the database process can reach the app process" is now fully your responsibility, with no vendor SLA backstopping any of it:

- Tuning
- Pooling
- Backup
- Patching
- Network segmentation
- Intrusion response

That trade is the actual subject of this guide.

## PostgreSQL tuning for a small-to-mid VPS

Defaults are conservative because Postgres doesn't know your box's specs. On a CX32 or CPX32 (4 vCPU / 8GB RAM) — a reasonable single-app production tier — start from these, then measure:

- **`shared_buffers`**: ~25% of RAM (2GB on an 8GB box). Higher rarely helps past this because the OS page cache absorbs the rest.
- **`effective_cache_size`**: ~50-75% of RAM (4-6GB) — this doesn't allocate memory, it just tells the query planner how much cache it can assume, so err generous.
- **`work_mem`**: start low (4-16MB) and raise per-workload; this is allocated *per sort/hash operation, per connection*, so overshooting under concurrent load is a fast way to OOM the box.
- **`maintenance_work_mem`**: 256MB-1GB is reasonable; it's used for vacuum and index builds, not per-connection, so you can be more generous.
- **`max_connections`**: keep this low at the Postgres level (50-100) and push concurrency handling to a pooler instead — this is the single most consequential tuning decision on a small box.

## Connection pooling: PgBouncer in transaction mode

Postgres's per-connection memory cost means direct high-concurrency access degrades badly well before you hit hard connection limits. PgBouncer in transaction-pooling mode assigns a real Postgres connection to a client only for the duration of one transaction, then returns it to the pool:

- Reported gains go from roughly 8,000 req/s to 50,000 req/s under equivalent load in typical OLTP benchmarks
- The benefit shows up starting around 150 concurrent clients

Practical config:

- Size each pool so the sum of `default_pool_size` across all database/user pairs stays under `max_connections` minus 10-20 reserved for admin and replication
- Start `default_pool_size` at 20-30 for a typical OLTP workload
- Watch `cl_waiting` / `avg_wait_time` in `SHOW POOLS` before scaling up
- Use transaction pooling by default — it covers the large majority of stateless web app workloads
- Only fall back to session pooling if your app relies on session-level state like prepared statements or advisory locks that transaction mode breaks
- If you want a Supavisor-style dual-mode setup (transaction pooling for app traffic, session mode for migrations/admin tooling), run two PgBouncer instances on different ports rather than trying to force one pool to do both jobs

## WAL-based PITR: the pgBackRest situation, resolved

Anyone researching this in the last few months hit a moving target. Here's the timeline:

- **April 27, 2026** — pgBackRest archived when its funding model, dependent on a single corporate sponsor, collapsed
- **Following weeks** — a wave of guides pivoted to recommending WAL-G as the successor
- **May 19, 2026** — a sponsor coalition (AWS, Supabase, pgEdge, Tiger Data, Percona, Eon, Xata, Dalibo, and Data Egret) funded pgBackRest's revival and brought the original maintainer back
- **Since then** — Percona has been actively onboarding additional maintainers specifically so the project isn't a single-point-of-failure again

Net recommendation as of this writing:

- **pgBackRest** — a legitimate choice again, and remains the more feature-complete option for pure-Postgres PITR: delta backups, parallel compression, mature retention policies
- **WAL-G** (currently v3.0.8, actively maintained, written in Go) — the better call if you run a mixed database stack, since it isn't Postgres-specific
- **Barman** — worth a look if you want a more enterprise/compliance-postured tool with a vendor-backed support story

Whichever you choose, verify current maintenance status yourself before committing — this space had two status changes in six weeks, and a guide written last quarter may already be stale.

Minimum viable setup regardless of tool:

- Continuous WAL archiving to off-box S3-compatible object storage (Hetzner Object Storage or Backblaze B2 both work)
- A base backup on a regular schedule
- A documented retention policy
- The step most self-hosted setups skip: actually execute a point-in-time restore into a scratch environment on a schedule, not just once at setup

A backup pipeline you haven't tested recently is a liability you're carrying, not a mitigation.

## Security hardening beyond SSH keys and a firewall

The basics — key-only SSH, `ufw` or Hetzner Cloud Firewall restricting the Postgres port — are table stakes, not the finish line:

- **fail2ban** — watch `journald` for SSH auth failures, ban offenders after 3 attempts with an escalating bantime; pairs with UFW's own rate limiting (`ufw limit 22/tcp` or whatever port you've moved SSH to) for defense in depth against brute force
- **unattended-upgrades** — configure for security-only updates, paired with a monthly scheduled reboot, since kernel and libc security fixes don't fully apply until the box restarts, and a server that never reboots is a server quietly running vulnerable code it thinks it's already patched
- **Network segmentation** — put Postgres on a private Docker network or Hetzner private network with no public IP exposure at all, and reach it only from the app container or through an SSH tunnel/bastion for admin work; the goal is that the database port never appears in a public port scan in the first place, firewall rule or not
- **No crypto-adjacent workloads, full stop** — Hetzner's terms explicitly prohibit mining, staking, and even passively running blockchain nodes or storing chain data; this isn't a soft guideline, it's enforced with account termination, and Hetzner currently represents a large enough share of Ethereum and Solana node infrastructure that they've clearly been actively enforcing it

## Cost-crossover math

Raw compute numbers:

- A CX32 (4 vCPU/8GB) runs roughly €10-13/month post-June-2026 pricing
- Add object storage for backups and you're realistically at $15-20/month all-in for a single production app plus database

Compare that to a managed equivalent:

- Supabase Pro plus compute add-ons lands around $25-50/month for comparable specs
- AWS RDS gets expensive fast — a modest db.t3.medium with 50GB lands around $80/month before backups, bandwidth, or Multi-AZ

The self-hosted number looks like an easy win until you price in your own time. The honest crossover point isn't a dollar figure on the hosting bill — it's the hour or two a month of patching, monitoring, and backup verification you're now on the hook for, plus the tail-risk hours if something breaks and you're the entire on-call team. If that time is worth more to you than roughly $150-200/month, managed hosting remains the better trade even though this stack is cheaper on paper.

This stack starts winning decisively once:

- You're running multiple apps/databases off one box, so the fixed ops overhead amortizes
- You have a specific compliance or data-residency reason to control the physical stack yourself
- You've already built the operational muscle (this guide's prerequisite list) such that the "extra" work is marginal rather than net-new

## Sources

- [Hetzner Price Adjustment, June 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [Hetzner's June 2026 price increase: how to scale around it](https://cloudtally.eu/blog/hetzner-june-2026-price-increase)
- [PgBouncer config](https://www.pgbouncer.org/config.html)
- [PostgreSQL Connection Scaling: PgBouncer Transaction Pooling](https://markaicode.com/postgresql-connection-pooling-pgbouncer/)
- [pgBackRest will continue — Percona sponsorship announcement](https://www.globenewswire.com/news-release/2026/05/19/3297383/0/en/Open-Source-Stays-Open-Percona-Sponsors-pgBackRest-to-Keep-PostgreSQL-Backups-Running.html)
- [After pgBackRest — the build (Christophe Pettus)](https://thebuild.com/blog/2026/04/30/after-pgbackrest/)
- [Ubuntu Server Security Hardening Guide 2026](https://www.101howto.com/ubuntu-server-security-hardening-guide-2026/)
- [AWS RDS vs Self-Hosted PostgreSQL: Real Cost Comparison (2026)](https://selfhost.dev/blog/aws-rds-vs-self-hosted-postgresql-cost-comparison/)
- [Managed PostgreSQL Comparison (2026): $0 to $475/month](https://selfhost.dev/blog/managed-postgresql-comparison-2026/)
- [Why Hetzner banned cryptocurrency mining](https://serveropsmasters.com/why-hetzner-banned-cryptocurrency-mining-what-it-means-for-cloud-users-storage-performance-and-compliance/)
