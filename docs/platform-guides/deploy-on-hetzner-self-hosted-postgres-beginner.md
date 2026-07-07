---
title: "Deploy on Hetzner + self-hosted Postgres"
tagline: "Maximum control, no third-party platform involved — and squarely advanced territory"
category: own-your-stack
source_platform: hetzner
difficulty: advanced
level: beginner
cost_range_usd: "4-15/mo"
tags: ["hosting", "database", "requires-cli", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Comfortable with SSH and the Linux command line"
  - "Basic understanding of Docker and containers"
  - "Willingness to learn Postgres administration basics"
  - "Ability to follow a firewall configuration guide"
requirements:
  - "A throwaway VPS (a few dollars) to practice on"
  - "A laptop with Docker Desktop for local practice first"
  - "An SSH key pair (or willingness to generate one)"
  - "Time to build terminal and SSH fluency before deploying for real"
effort_hours_min: 8
effort_hours_max: 20
---

# Deploy on Hetzner + self-hosted Postgres (beginner)

I need to be straight with you before you read another word: this is the one guide in my whole "own your stack" series where I'm not going to cheerfully walk you through it. Every other guide I've written assumes you can follow along even if you've never touched a terminal. This one assumes the opposite, and I'd be doing you a disservice if I pretended otherwise.

So here's what this beginner version actually is. It's not a tutorial. It's an honest map of the terrain — what all these unfamiliar words mean, why this path is harder than the others, and what I'd actually tell a friend who wants to get here eventually. If you finish this and decide "not yet," that's the correct read of the material, not a failure on your part.

## What "Hetzner + self-hosted Postgres" even means

Every other guide in this series has you renting *some* piece of managed infrastructure — a database company runs your database, a hosting company runs your servers. This one has you renting a bare computer (that's what a VPS, or "virtual private server," is) from a German company called Hetzner, and then you personally install and run everything on it: your web app, and Postgres, the database software that stores your data.

Nobody is running anything for you here. Here's exactly what you're now responsible for, that someone else was handling in every other guide in this series:

- Backing up your own data, on your own schedule, verified by you
- Being the support team when something breaks at 2 a.m.
- Catching your own typos before they delete a table — there's no safety net
- Patching the operating system and the database software
- Watching for intrusions, because nobody else is

That's the appeal for the right person — total control, no recurring platform fees beyond the raw server cost — and it's the danger for everyone else.

## The vocabulary you'll need before any of this makes sense

- **VPS (Virtual Private Server):** A slice of a physical computer in a data center, rented by the month, that you control like your own machine. Hetzner's cheapest options run about €4-8/month.
- **SSH (Secure Shell):** The way you remotely log into and control your VPS from your own laptop, using an encrypted connection instead of a password typed over the open internet. You'll generate an "SSH key" — a cryptographic pair of files, one you keep private, one you give to the server — and use that to log in instead of a password.
- **Firewall:** Software that decides which types of network traffic are allowed to reach your server. Left wide open, every port on your VPS is visible to random scanners on the internet within minutes of it going live. That's not hypothetical — it's the default state of a fresh, unconfigured server.
- **Postgres (PostgreSQL):** The specific database software you'd be installing yourself. It's excellent, free, and open source — but "you install it" means you're also responsible for patching it, backing it up, and tuning it.
- **WAL (Write-Ahead Log):** Postgres's internal record of every change made to your data, written before the change is applied. It's the mechanism that makes real backups and point-in-time recovery possible — "restore my database to exactly 3:47 p.m. yesterday, right before I ran that bad migration." Managed database providers handle this invisibly. Here, you'd be the one setting it up.
- **Connection pooling:** A layer (commonly a tool called PgBouncer) that sits between your app and Postgres to manage how many simultaneous connections hit the database, because Postgres chokes if too many arrive directly at once. Managed providers bake this in. Self-hosted, it's another piece you install and configure.
- **Docker / Docker Compose:** A way of packaging software (your app, your database) into isolated, portable units called "containers" so they run consistently regardless of what else is on the machine. Almost every modern self-hosting approach, including the one I recommend for the intermediate version of this guide, is built on Docker.

## Why I'd steer most beginners away from this — for now

Every credible source on this topic agrees on the same short list of things you have to get right, and getting any one of them wrong has real consequences:

- **SSH hardening** — get it wrong, and it's an open door for anyone scanning the internet
- **Firewall rules** — get it wrong, and every service on the box is exposed by default
- **PostgreSQL tuning** — get it wrong, and the database falls over under load it should easily handle
- **Connection pooling** — get it wrong, and a modest traffic spike takes the whole site down
- **WAL-based backups** — get it wrong, and a bad migration or a deleted table is gone for good, with no way back

This isn't gatekeeping; it's the same warning I'd give if a friend asked whether they should rewire their house without an electrician's training. You *can* learn to do it. It's just not a first house.

The other guides in this series — Vercel, Supabase, Neon, Railway, DigitalOcean's managed app platform — exist precisely because someone else has already solved SSH hardening, backups, and patching for you, and bakes the cost of doing it right into what you pay them. That's not a lesser path. For almost everyone, it's the smarter one, right up until:

- Your managed hosting bill climbs past roughly $150/month, or
- You have a specific reason — compliance, data residency, raw cost at scale — to want full control

## A realistic roadmap, if you want to get here eventually

1. **Get comfortable in a terminal first**, on your own machine, before you ever touch a remote server. Learn to navigate directories, edit a file, and run a command without a GUI holding your hand.
2. **Learn SSH on a throwaway VPS.** Spin up the cheapest Hetzner box (a few dollars, cancel it when you're done), generate an SSH key pair, and practice logging in and locking password auth out. Break it. Rebuild it. That's the point of a $4 server — it's cheap to destroy.
3. **Run Docker locally before you run it remotely.** Install Docker Desktop on your own laptop and get a simple app running in a container before you try to orchestrate one on a rented server over SSH.
4. **Deploy something disposable with Coolify or Dokploy** (self-hosted platforms that sit on top of a VPS and handle a lot of the networking and SSL complexity for you — I cover them concretely in the intermediate version of this guide). Treat your first deploy as a practice run, not production.
5. **Only then, put real data on it** — and only after you've tested an actual restore from backup, not just confirmed a backup file exists. A backup you've never restored from is a hope, not a plan.

## The one place this pairing is actually easy

Here's the honest bright spot: Hetzner-the-server and Postgres-the-database, specifically, pair together with zero friction, because Postgres just runs as a program on the same machine as everything else — it's talking to itself over `localhost`, not across the internet. That means, compared to every other guide in this series:

- No network configuration between app and database
- No separate vendor relationship for the database layer
- No connection string pointing at some other company's infrastructure
- No cross-provider latency or egress fees to think about

The friction isn't in the *pairing*. It's in the fact that choosing this stack means you've also silently signed up to be your own database administrator, security team, and backup engineer — jobs that, in every other guide in this series, someone else was doing for a monthly fee.

## Sources

- [Hetzner Cloud pricing](https://www.hetzner.com/cloud/regular-performance)
- [Hetzner Price Adjustment, June 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [Hetzner Cloud Review 2026: Benchmarks, Pricing, and the Real Trade-offs](https://betterstack.com/community/guides/web-servers/hetzner-cloud-review/)
- [Managed PostgreSQL Comparison (2026): $0 to $475/month](https://selfhost.dev/blog/managed-postgresql-comparison-2026/)
- [AWS RDS vs Self-Hosted PostgreSQL: Real Cost Comparison (2026)](https://selfhost.dev/blog/aws-rds-vs-self-hosted-postgresql-cost-comparison/)
- [Ubuntu Server Security Hardening Guide 2026](https://www.101howto.com/ubuntu-server-security-hardening-guide-2026/)
- [pgBackRest is archived, what now?](https://percona.community/blog/2026/04/28/pgbackrest-is-archived-what-now/)
- [Why Hetzner banned cryptocurrency mining](https://serveropsmasters.com/why-hetzner-banned-cryptocurrency-mining-what-it-means-for-cloud-users-storage-performance-and-compliance/)
