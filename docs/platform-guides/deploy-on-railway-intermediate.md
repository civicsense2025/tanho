---
title: "Deploy on Railway (Intermediate Guide)"
tagline: "The most beginner-friendly all-in-one — app and Postgres in the same dashboard"
category: own-your-stack
source_platform: railway
difficulty: intermediate
level: intermediate
cost_range_usd: "5-20/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Using the Railway CLI (login, link, up)"
  - "Understanding Nixpacks vs. Dockerfile/Compose builds"
  - "Configuring private networking between services"
  - "Monitoring usage-based billing to establish a cost baseline"
  - "Setting up custom domain DNS records (CNAME/TXT)"
requirements:
  - "A GitHub account with your app's code in a repository"
  - "A Railway account with billing enabled"
  - "Node.js and npm installed locally to run the Railway CLI"
  - "A domain you control for custom domain setup"
effort_hours_min: 2
effort_hours_max: 5
---

# Deploy on Railway — Intermediate Guide

You've deployed things before, you're comfortable in a terminal, and you don't need me to explain what an environment variable is. What you want is the actual CLI workflow, a clear read on how the Postgres pairing works under the hood, and an honest read on whether the platform is stable enough to build a habit around. Here's that.

Railway earns its "easiest deploy in the set" reputation because the entire app + database setup lives in one project canvas with one bill, one dashboard, and zero cross-provider wiring. The tradeoff is a usage-based bill that needs a monitoring habit, and a rockier 2025–2026 reliability record than the hyperscalers. Both are manageable if you go in with eyes open.

## CLI deploy, start to finish

Install the CLI, authenticate, link a project, and ship:

```bash
npm i -g @railway/cli
railway login
railway link
railway up
```

What each step actually does:

- `railway login` authenticates the CLI against your Railway account
- `railway link` connects your local repo to an existing Railway project (or lets you create one on the spot)
- `railway up` builds and deploys your current directory using whatever builder Railway detects — Nixpacks by default, or a Dockerfile if one sits at your repo root with that exact capitalization

Docker Compose deploys are also supported directly if your project already has a `docker-compose.yml` — Railway will read it and provision matching services.

For ongoing work, `railway up` on every push is fine for solo iteration, but connecting your GitHub repo through the dashboard (Settings → Source) gets you auto-deploys on push without touching the CLI again. I'd do both: CLI for quick one-off deploys and debugging, GitHub integration for your actual deploy pipeline.

> **[🎥 VIDEO PLACEHOLDER]** — full CLI walkthrough from `railway login` to a live URL
>
> _Replace this callout with the real video before publishing._

## The Postgres template, and why the pairing is genuinely frictionless

Add Postgres via Cmd/Ctrl+K → "Database" → "Add PostgreSQL," or from the template marketplace at railway.com/deploy/postgres. Either path deploys Railway's SSL-enabled Postgres image (built on the official Docker Hub Postgres image) as a new service inside your existing project — same billing, same dashboard, no separate signup.

The part worth understanding, not just trusting: Railway auto-populates connection variables on the Postgres service —

- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `DATABASE_URL`

— and your app service can reference them directly via Railway's variable-referencing syntax without you copying a connection string by hand. Traffic between the two services routes over Railway's private network: encrypted WireGuard tunnels, internal DNS under `<service-name>.railway.internal`, scoped to the same project and environment. Two consequences that matter at this level:

- Private-network traffic doesn't count against your egress bill
- There's no public exposure to lock down unless you deliberately enable the TCP proxy for external access (which does bill egress)

This is what "zero-config" actually means here — it's not marketing, it's the internal DNS and variable injection doing real work.

One gotcha I've seen trip people up: if you're getting connection errors and only `DATABASE_PUBLIC_URL` works, you're probably not on the same environment as your Postgres service, or you referenced the variable before the database finished provisioning. Re-check that both services sit in the same Railway environment (production vs. a preview environment are isolated networks).

> **[📸 SCREENSHOT PLACEHOLDER]** — project canvas with app + Postgres services connected, variables panel open
>
> _Replace this callout with the real screenshot before publishing._

## Build the usage-dashboard habit

This is the concrete monitoring habit I'd build in week one, not month three: check Workspace Settings → Usage after your first week of real traffic. The billing rates:

- RAM: $10/GB/month
- vCPU: $20/vCPU/month
- Egress: $0.05/GB

That's on top of a $5 (Hobby) or $20 (Pro) subscription that already includes that much usage. Your bill only grows past the flat subscription fee once combined usage crosses the included amount — so watching the trend line for a week gives you a real cost baseline before you scale anything.

Two ways people get an unpleasant surprise here:

- **Connecting over the public URL instead of the private one.** Using your database's **public** connection string routes traffic through the TCP proxy and bills egress you didn't need to pay for. Use the private hostname (`postgres.railway.internal` or whatever your service is named) for any service that lives in the same project.
- **Forgetting about PR/preview deploys.** If you have ephemeral environments enabled, each one spins up a mirrored copy of your services and bills separately.

## Reliability, contextualized honestly

Railway's incident history over the past eight months is real and worth weighing, not glossing over:

- **December 16, 2025** — attackers exploited a critical Next.js/React Server Components vulnerability (CVE-2025-55182) to run a cryptominer across a subset of customer workloads, causing fleet-wide CPU starvation and a ~4-hour Major Outage, concentrated in Railway's EU West region.
- **February 18–21, 2026** — nine separate DDoS waves plus a Cloudflare BGP outage, compounded by an upstream fiber cut two days earlier that had already reduced Railway's spare network capacity. Individual customer impact windows ranged from 30 seconds to 48 minutes across four days of intermittent disruption.
- **March 30, 2026** — a Railway engineer's CDN configuration change accidentally enabled response caching on ~0.05% of domains that had it disabled, for 52 minutes, meaning some authenticated responses could have been served to the wrong user. Railway disclosed this proactively and notified affected users by email.
- **May 19, 2026** — Google Cloud suspended Railway's production GCP account without warning as part of a broader automated action; because Railway's edge routing control plane depended on GCP-hosted infrastructure, the outage cascaded to workloads not even hosted on GCP, causing an ~8-hour platform-wide disruption. Railway's founder has since said GCP is being demoted to backup-only infrastructure.

I checked for anything newer: Railway's status history shows a handful of smaller, shorter incidents since (brief regional deployment disruptions, sub-hour edge network latency blips), nothing at the scale of the four above. None of this is disqualifying for a side project or an early-stage product, and Railway's public, detailed incident reports are genuinely more transparent than most hosts. But if your app has real users and real uptime expectations, this is a pattern — not a one-off — and it should inform your backup and failover thinking (more on that in the expert guide).

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — final live site with custom domain attached
>
> _Replace this callout with the real screenshot before publishing._

- Usage dashboard checked after one week of real traffic, so you have an actual cost baseline
- Confirmed your app connects to Postgres over the private `railway.internal` hostname, not the public proxy URL
- Custom domain added under Settings → Public Networking with the required CNAME/TXT records
- Native Backups feature (Volumes → Backups) turned on for your Postgres volume
- Card on file confirmed current — Railway requires post-paid billing as of March 30, 2026, and stops workloads on payment failure

## Sources
- [Railway Pricing Plans](https://docs.railway.com/pricing/plans)
- [Railway Pricing FAQs](https://docs.railway.com/pricing/faqs)
- [Railway PostgreSQL docs](https://docs.railway.com/databases/postgresql)
- [Railway Private Networking docs](https://docs.railway.com/networking/private-networking)
- [Railway Dockerfiles docs](https://docs.railway.com/builds/dockerfiles)
- [Railway Incident Report: December 16, 2025 (cryptominer)](https://blog.railway.com/p/incident-report-december-16-2025)
- [Railway Incident Report: February 19, 2026 (DDoS + Cloudflare outage)](https://blog.railway.com/p/incident-report-february-19-2026)
- [Railway Incident Report: March 30, 2026 (CDN caching)](https://blog.railway.com/p/incident-report-march-30-2026-accidental-cdn-caching)
- [Railway Incident Report: May 19, 2026 (GCP account suspension)](https://blog.railway.com/p/incident-report-may-19-2026-gcp-account-outage)
- [The Register: Google Cloud suspended Railway without cause](https://www.theregister.com/off-prem/2026/05/20/google-cloud-suspended-major-customer-railwaycom-without-cause-causing-outage/)
