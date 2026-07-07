---
title: "Starting from scratch? Here's the stack I'd pick (Intermediate)"
tagline: "A decision framework for builders who've shipped before and want the real tradeoffs across nine stacks"
category: own-your-stack
level: intermediate
difficulty: intermediate
cost_range_usd: "0-90/mo"
tags: ["platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Have shipped or deployed at least one small project before"
  - "Basic understanding of what a database and vendor lock-in mean"
  - "Can weigh tradeoffs between serverless and always-on compute"
requirements:
  - "A sense of your project's expected traffic and whether you need long-running processes"
  - "Willingness to skim the six linked deploy guides this comparison references"
  - "45-60 minutes to read through the nine-stack comparison and pricing caveats"
effort_hours_min: 0.75
effort_hours_max: 1.5
---

# Starting from scratch? Here's the stack I'd pick (Intermediate)

You've shipped at least one small project before, so I'm going to skip the "what is a database" preamble and get into where the real tradeoffs live. Everything else in this hub is about escaping a platform after the fact. Starting fresh means you get to skip that pain — but only if you pick with your eyes open about where each of these platforms quietly narrows your options later.

I'm covering nine stacks here:

- The original six I've written full deploy guides for:
  1. <a href='/guides/deploy-on-vercel-and-supabase'>Vercel + Supabase</a>
  2. <a href='/guides/deploy-on-vercel-and-neon'>Vercel + Neon</a>
  3. <a href='/guides/deploy-on-digitalocean-and-supabase'>DigitalOcean + Supabase</a>
  4. <a href='/guides/deploy-on-railway'>Railway</a>
  5. <a href='/guides/deploy-on-cloudflare-pages-and-d1'>Cloudflare Pages + D1</a>
  6. <a href='/guides/deploy-on-hetzner-self-hosted-postgres'>Hetzner + self-hosted Postgres</a>
- Plus three newer pairings worth putting on your radar:
  7. Render + Supabase
  8. Fly.io + Postgres
  9. Netlify + Supabase

## Free tier realism: read the fine print, not the headline number

Free tiers are a marketing surface, not a reliable planning input. A few specifics worth knowing before you build a habit around one:

- **Vercel Hobby** — 100GB of bandwidth and a million function invocations, but it's explicitly licensed for non-commercial use. The instant your project earns revenue, you're expected to move to a $20/seat/month Pro plan, and Hobby has no overage option at all; you just get paused until the next billing cycle.
- **Supabase free tier** — pauses your database automatically after seven days of inactivity, which matters if you're prototyping something you check on sporadically. You'll come back to a paused project more often than you'd expect.
- **Netlify free tier** — structurally stricter than it looks: if any single project on your account exceeds its limits, Netlify pauses *everything* on the account, not just that one project.
- **Render free Postgres** — expires entirely 30 days after creation. Not throttled, deleted, no grace period. Fine for a demo, actively dangerous for anything you intend to keep.
- **Fly.io** — no longer has a permanent free tier at all as of 2024. New accounts get a small trial credit and that's it, so budget for real spend from day one if you pick it.
- **Cloudflare Pages + D1** — the outlier with the most genuinely generous free tier of the group: tens of millions of D1 reads per day, no bandwidth charges ever, at any tier. The tradeoff is Cloudflare's Workers programming model, which has real edge-runtime quirks (no persistent filesystem, different Node compatibility story) that a straightforward Express or Next.js background job won't hit on Vercel or Render.

## Vendor lock-in risk exists even inside "self-hosted-ish" platforms

This is the part intermediate builders underestimate. Choosing a platform that *feels* more open than Vercel doesn't automatically mean you're safe.

- Render and Fly.io both let you deploy arbitrary Docker containers, which is a real portability advantage — a Dockerfile runs basically anywhere.
- But once you're using Render's managed Postgres, Fly's Managed Postgres product, or Supabase's bundled auth and storage layer, you've absorbed a dependency that isn't just "some code in a container." It's data gravity and product-specific APIs that don't move with a `docker push`:
  - Supabase's row-level security policies
  - Its auth JWT format
  - Fly's volume and replication model
- The fix isn't to avoid managed services — it's to know, specifically, which parts of your stack are portable and which aren't, and to keep an actual export path for the parts that aren't:
  - Portable: your app code, your container
  - Not portable: your auth provider's user table format, your database vendor's specific extensions
- Even Hetzner, the most "own your own infrastructure" option on this list, isn't lock-in-free — you can still write yourself into a corner with Hetzner-specific load balancer configuration or snapshot formats if you're not deliberate about using portable tooling (plain Postgres, standard Docker Compose, Terraform) on top of it.

## When to pick DigitalOcean or Render over pure-serverless Vercel or Netlify

Serverless platforms like Vercel and Netlify are optimized for a specific shape of app: mostly static content plus short-lived functions. They start to strain once you need long-running processes:

- A background worker
- A websocket connection
- A job that takes more than a few seconds
- Predictable memory across requests

Here's how the alternatives stack up:

- **Render** — explicitly supports this shape: web services with persistent memory, background workers, and cron jobs that can run up to 12 hours, plus native Docker support that neither Vercel nor Netlify offers.
- **DigitalOcean App Platform** — closer to a traditional server than a serverless function, and its pricing is flatter and more predictable than usage-based serverless billing, which matters once you have real, sustained traffic rather than bursty demo traffic.
- **Railway** — sits in an interesting middle spot: closer to Render/DigitalOcean in supporting long-running services and Docker, but with a more usage-metered pricing model than DigitalOcean's flatter droplet-style pricing. Worth checking against your actual usage pattern before assuming either is cheaper.

The rule of thumb I use:

- If you can describe your backend entirely as "responds to a request and returns within a few seconds," serverless is fine and often cheaper at low volume.
- If you have anything that runs continuously — a queue processor, a scheduled scraper, a chat server holding open connections — move to Render, DigitalOcean, Railway, or Fly.io before you fight your platform into pretending to be something it isn't.

## A quick note on the three newer stacks

- **Render + Supabase** — pairs Render's always-on, Docker-friendly compute with Supabase's managed Postgres/auth/storage bundle. A solid choice if you want DigitalOcean-style backend flexibility without managing your own droplet.
- **Fly.io + Postgres** — the most infrastructure-literate of the nine: real multi-region deployment, your app running physically close to users worldwide. But real monthly cost from the first day (a minimal Postgres setup runs a few dollars a month at the low end, climbing quickly on the managed tiers) and more operational surface than a beginner needs.
- **Netlify + Supabase** — functionally the closest sibling to Vercel + Supabase: same Jamstack-pioneer DNA, same deploy-from-git workflow. Worth picking over Vercel specifically if you're already inside Netlify's ecosystem (forms, split testing, its own edge functions) rather than for any sharp technical differentiator.

## Where I land

For most intermediate builders without a specific reason to do otherwise, I still start people on <a href='/guides/deploy-on-vercel-and-supabase'>Vercel + Supabase</a> or <a href='/guides/deploy-on-cloudflare-pages-and-d1'>Cloudflare Pages + D1</a>:

- The free tiers are real
- The tooling is mature
- You can always migrate the backend later without touching your frontend

The moment you know you need long-running processes or predictable flat pricing at real traffic, that's your signal to move to <a href='/guides/deploy-on-digitalocean-and-supabase'>DigitalOcean + Supabase</a> or Render + Supabase instead of fighting a serverless platform to do something it wasn't built for.

> **💡 Tip — Export first, choose second**
>
> This is the rule underneath every guide in this hub: confirm on day one that you can get your own data out in a real, portable format. A `pg_dump` you can run yourself beats a "data export" button that only that one vendor understands. For deeper cost modeling and infrastructure control tradeoffs — multi-region, IaC portability, when Hetzner or Fly.io's ops overhead pays for itself — see the <a href='/guides/starting-fresh-which-stack-expert'>expert version of this guide</a>.

## Sources

- [Vercel Hobby Plan docs](https://vercel.com/docs/plans/hobby) — non-commercial licensing terms and overage policy
- [Supabase Pricing](https://supabase.com/pricing) — free tier project pause after inactivity
- [Netlify Supabase integration](https://www.netlify.com/integrations/supabase/) — integration mechanics
- [Render Postgres pricing docs](https://render.com/docs/postgresql-refresh) — free database 30-day expiration policy
- [Fly.io Pricing](https://fly.io/pricing/) — removal of permanent free tier, trial credit terms
- [Fly.io Managed Postgres docs](https://fly.io/docs/mpg/) — managed Postgres tier pricing
- [Render vs Vercel comparison](https://render.com/docs/render-vs-vercel-comparison) — Docker support, always-on services, long-running process limits
- [Cloudflare D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/) — free tier limits and no-bandwidth-charge policy
