---
title: "Starting from scratch? Here's the stack I'd pick (Expert)"
tagline: "Cost modeling, multi-region tradeoffs, and staying portable even while adopting a managed stack"
category: own-your-stack
level: expert
difficulty: advanced
cost_range_usd: "0-2000+/mo"
tags: ["platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Can model infrastructure costs at scale (per-user, per-GB, per-request)"
  - "Working knowledge of Terraform/IaC and multi-region architecture tradeoffs"
  - "Understand the tradeoffs between managed and self-hosted databases"
requirements:
  - "Projected 12-month usage/traffic figures for your product"
  - "Familiarity with the nine stacks this hub compares"
  - "1-2 hours to work through cost modeling, multi-region, and lock-in sections"
effort_hours_min: 1
effort_hours_max: 2
---

# Starting from scratch? Here's the stack I'd pick (Expert)

If you're planning for scale from day one, the beginner and intermediate framing of this guide — "which free tier is easiest" — mostly doesn't apply to you. Your real question is cost curve shape, operational ownership, and how much of your infrastructure decision you can unwind later without a rewrite. This is still, fundamentally, a guide about avoiding lock-in — it's just that at your stage, lock-in shows up as Terraform state you can't port, a database engine with vendor-specific extensions, or a region topology you can't replicate elsewhere, not just "my export button is broken."

I'll reference all nine stacks this hub covers:

1. <a href='/guides/deploy-on-vercel-and-supabase'>Vercel + Supabase</a>
2. <a href='/guides/deploy-on-vercel-and-neon'>Vercel + Neon</a>
3. <a href='/guides/deploy-on-digitalocean-and-supabase'>DigitalOcean + Supabase</a>
4. <a href='/guides/deploy-on-railway'>Railway</a>
5. <a href='/guides/deploy-on-cloudflare-pages-and-d1'>Cloudflare Pages + D1</a>
6. <a href='/guides/deploy-on-hetzner-self-hosted-postgres'>Hetzner + self-hosted Postgres</a>
7. Render + Supabase
8. Fly.io + Postgres
9. Netlify + Supabase

## Cost modeling as usage grows

The trap at your stage isn't picking a bad platform — it's extrapolating linearly from a demo's cost and getting blindsided by a step function later. Model three regimes, not one:

1. **Launch** — near-zero traffic
2. **Growth** — real but modest traffic
3. **Crossover** — the point where a managed platform's usage-based pricing crosses over flat infrastructure pricing

Serverless platforms — Vercel, Netlify, Cloudflare Pages — are cheap or free at the launch regime and stay reasonable through moderate growth, but their overage pricing compounds fast:

- **Vercel** — bandwidth overage runs $40 per 100GB above the Pro plan's 1TB allowance, which adds up quickly for a media-heavy or high-traffic app.
- **Supabase** — Pro tier starts at $25/month but adds usage-based charges once you exceed any of these thresholds, and they arrive faster than founders expect once a product has real usage:
  - 8GB database size
  - 100K monthly active users
  - 100GB storage

Fly.io's Managed Postgres pricing is worth studying specifically because it makes the step function explicit:

- Basic instance: about $38/month
- Starter: around $72/month
- Climbing through $282, $962, and $1,922/month tiers as you need more CPU and memory headroom
- Plus $0.28/GB/month for storage on top

That's not a criticism of Fly — it's an honest, itemized version of a cost curve that other platforms bundle less transparently. DigitalOcean and Hetzner both give you flatter, more predictable pricing because you're renting compute directly rather than paying for a managed abstraction on top of it — a Hetzner VPS with self-hosted Postgres can run a real production workload for a fraction of the equivalent managed-service cost, but every dollar you save shows up as ops time you now owe: patching, backups, failover, monitoring.

The actual expert move is to model cost per unit of your specific usage driver for each candidate stack at your projected 12-month volume, not just today's:

- Cost per active user
- Cost per GB of user-generated content
- Cost per request

A stack that's $10/month cheaper today can be $500/month more expensive at 50x the traffic if its pricing curve is steeper.

## When Hetzner or Fly.io's ops overhead becomes worth it

Full self-hosting on Hetzner earns its ops overhead once your managed-platform bill has grown large enough that the delta funds real engineering time — roughly, once you're paying more per month for managed database and compute than a junior ops hire's fully-loaded hourly cost would consume in maintenance time for a comparable self-hosted setup. Below that threshold, the ops burden is a distraction from product work, not a savings.

Fly.io sits in a different category. You'd reach for it not primarily to save money but because you need genuine multi-region compute:

- An application that needs to run physically close to users in multiple continents with low latency, not just a CDN caching static assets close to them
- Fly's regional Machine placement and its `fly-replay` request-forwarding model solve a real infrastructure problem — routing a write to the region that owns the primary database, while serving reads from replicas near the user
- Vercel, Netlify, and Cloudflare Pages don't natively solve this for you at the database layer, because their compute is stateless and edge-distributed but your Postgres primary still lives in one place

## Multi-region considerations

Multi-region is frequently adopted for the wrong reason — "we might need it eventually" — at real ongoing complexity cost:

- Read replicas that can serve stale data
- Write conflicts if you're not careful about which region owns which data
- Meaningfully harder debugging when a request's behavior depends on which region served it

Before adopting it, separate two distinct problems:

1. **Serving static assets and cacheable responses close to users globally** — solved well and cheaply by Cloudflare's network, or Vercel/Netlify's edge CDNs, regardless of where your database lives.
2. **Needing your actual application logic and database writes to happen close to users worldwide** — the harder problem Fly.io and, to a lesser extent, DigitalOcean's multi-region App Platform droplets are built for.

Most products need only the first for years. Reach for genuine multi-region compute when you have measured latency complaints from a specific geography, not as a precautionary default.

## Staying portable even while adopting a managed stack

This is the crux of the whole hub's thesis applied at your level: you can use Supabase, Render, or Fly's managed Postgres and still avoid getting re-locked-in, if you're deliberate about which layer you let the vendor own.

- **Keep your infrastructure definitions in Terraform** (or OpenTofu, the open-source fork, if you want to hedge against Terraform's own licensing changes) rather than clicking through a vendor's dashboard. Render, Fly, and DigitalOcean all have Terraform providers, and codifying your setup means you can read exactly what you depend on and rebuild it elsewhere if you need to.
- **Prefer vendor-neutral primitives at each layer:**
  - Standard Postgres over a vendor's proprietary database variant
  - Standard Docker containers over a platform-specific build system
  - S3-compatible object storage (which DigitalOcean Spaces, Cloudflare R2, and Backblaze all support) over a storage API that only works on one platform
- **Treat your auth provider as the layer most likely to bite you** — Supabase Auth, Clerk, and similar services all store users in a format that doesn't trivially export to a competitor. If you adopt one, at minimum keep your own copy of core user records synced to your primary database rather than treating the auth vendor as the sole source of truth:
  - Email
  - Hashed credentials or OAuth identifiers
  - User IDs
- **Run a real `pg_dump` on a schedule**, store it somewhere you control (not just the vendor's own backup system), and actually test restoring it periodically. This is the single highest-leverage lock-in insurance available to you, and it costs almost nothing to set up.

> **💡 Tip — Export first, choose second**
>
> The rule doesn't change at your level, it just gets more specific: confirm you can get your schema, your data, and your infrastructure definitions out in open formats before you scale anything on top of them. For a gentler on-ramp into these same tradeoffs, see the <a href='/guides/starting-fresh-which-stack-intermediate'>intermediate guide</a>; for the plain-language version, the <a href='/guides/starting-fresh-which-stack-beginner'>beginner guide</a>.

## Sources

- [Fly.io Managed Postgres docs](https://fly.io/docs/mpg/) — tiered pricing from Basic through Performance plans, storage cost per GB
- [Fly.io Resource Pricing](https://fly.io/docs/about/pricing/) — compute and bandwidth pricing structure
- [Fly.io Regions docs](https://fly.io/docs/reference/regions/) — multi-region deployment model
- [Fly.io multi-region fly-replay docs](https://fly.io/docs/blueprints/multi-region-fly-replay/) — request routing across regions
- [Vercel Pricing](https://vercel.com/pricing) — Pro plan bandwidth overage rates
- [Supabase Pricing](https://supabase.com/pricing) — Pro tier thresholds and usage-based overage
- [Render vs Vercel comparison](https://render.com/docs/render-vs-vercel-comparison) — always-on compute and Docker-based deployment model
