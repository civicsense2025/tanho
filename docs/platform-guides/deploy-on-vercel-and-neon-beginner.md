---
title: "Deploy on Vercel + Neon (Beginner)"
tagline: "Serverless hosting paired with serverless Postgres — a database branch for every preview deploy"
category: own-your-stack
source_platform: vercel
target_platform: neon
level: beginner
difficulty: beginner
cost_range_usd: "0-40/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Comfortable creating accounts and clicking through a marketplace integration flow"
  - "Can read and absorb new vocabulary (environment variables, connection strings) as explained"
  - "Basic comfort opening a terminal, though it's not required for the core setup"
  - "Can create a GitHub account and push code to a repository"
requirements:
  - "A GitHub account with your site's code in a repository"
  - "A free Vercel account"
  - "A Neon account, added via the Vercel Marketplace"
  - "A domain name if you want a custom URL instead of a .vercel.app address"
effort_hours_min: 1
effort_hours_max: 2
---

# Deploy on Vercel + Neon (Beginner)

If you've never opened a terminal before, welcome — this guide is written for you specifically. I'm going to slow down and explain the words before I use them, because most deploy guides assume you already speak the jargon, and that's exactly how people get stuck or scared off. By the end of this you'll have a real website with a real database behind it, hosted on infrastructure that plenty of funded startups also run on.

Two quick definitions before anything else. A **terminal** is a plain text window where you type commands instead of clicking buttons — it looks intimidating but it's really just a very literal-minded text chat with your computer. An **environment variable** is a small piece of secret information (like a password or a database address) that your app reads when it starts up, kept separate from your actual code so you never accidentally publish a password to the internet. You'll see both terms again below.

## What you're actually building

You're pairing two services:

- **Vercel** hosts your website's code and serves it to visitors, rebuilding and redeploying automatically every time you push a change.
- **Neon** is a "serverless Postgres" database — Postgres is one of the most popular and trusted database systems in the world, and "serverless" means you don't have to rent, configure, or maintain an actual server yourself. Neon runs it for you, scales it up when there's traffic, and — this is the unusual part — can shrink itself down to essentially nothing (and stop billing you for compute) when nobody's using it.

Here's the detail that makes this pairing special, and worth explaining early: Vercel actually used to sell its own database product, called "Vercel Postgres." In 2025 they shut it down and rebuilt it directly on top of Neon. So when you connect Neon to Vercel today, you're not bolting together two unrelated companies — you're using the same setup Vercel itself now recommends and sells under its own storage tab. That matters for beginners because it means:

- Official support from both companies, not a community-maintained workaround
- Official documentation that stays current as both products change
- A setup flow designed to be a few clicks, not a manual wiring job

## Is this pairing actually friction-free? Here's what I checked

Tan's rule for every guide in this hub is that the database provider has to work with the hosting provider without a fight — because these guides exist to help you move to your own setup, not to trade one lock-in for another. So I verified this specific pairing directly rather than assuming it.

The honest answer: yes, this is about as friction-free as database pairings get in 2026, for one simple reason — Vercel and Neon built a joint "native integration" specifically so that adding Neon to a Vercel project takes about the same number of clicks as adding any first-party Vercel feature. What that gets you, concretely:

- You add it from the Vercel Marketplace in a few clicks
- Vercel automatically stores your database connection details as environment variables in your project
- There's no manual copy-pasting of passwords or addresses between two dashboards

There is exactly one piece of real friction, and it shows up for everyone eventually, so I'll explain it now rather than let you discover it the hard way. Neon gives you two slightly different addresses (called "connection strings") for the same database:

- A **pooled** connection string — your running website should always use this one
- An **unpooled** connection string — any one-time setup task, like moving data in from an old database, needs this one instead

Mixing them up causes confusing errors. I'll flag exactly where this matters below.

## Setting up your database

> **[📸 SCREENSHOT PLACEHOLDER]** — the Vercel Marketplace listing for Neon, showing the "Add Integration" button
>
> _Replace this callout with the real screenshot before publishing._

Follow these steps:

1. From your project's dashboard on Vercel, open the "Storage" tab
2. Choose "Create Database," then pick Neon from the list — or find "Neon" in the Vercel Marketplace and click "Add Integration"
3. Vercel will ask which of your projects should be connected — pick yours and confirm
4. Vercel provisions a real Postgres database for you in the background (no terminal required for this part)
5. Once it's created, Vercel automatically writes your database's connection string into your project's environment variables

You don't need to memorize what a connection string looks like — just know that it's the address-plus-password combo your code needs to reach your database, and Vercel is handling that handoff for you automatically instead of you having to copy and paste it by hand.

## Understanding "branches" (the feature that makes this pairing special)

This is the single best reason to pick Neon over a plain, non-branching Postgres provider, so it's worth a plain-English explanation. Think of a database branch like a saved copy of your data that you can freely experiment on — delete things, break things, test a risky change — without any chance of touching your real, live data. When you're done, you either throw the copy away or apply what you learned to the real thing.

Here's what branching actually gives you, in concrete terms:

- Every time you or a collaborator opens a "preview" version of your site (Vercel automatically creates one of these for every proposed change before it goes live), Neon can spin up a fresh branch of your database to go with it
- That branch is seeded with a real copy of your actual data, not empty tables or fake test data
- It's ready in seconds, no matter how large your real database is
- It's deleted automatically once that preview is no longer needed, so you're not left cleaning up after yourself
- You get to test real features against real-shaped data with zero risk to your live site
- All of this happens without you writing any extra code once the integration is turned on

> **[🎥 VIDEO PLACEHOLDER]** — a full run-through of connecting Neon to a Vercel project and triggering a preview-branch deploy
>
> _Replace this callout with the real video before publishing._

## What it costs

**Vercel:**

- Free "Hobby" plan: $0/month, but restricted to non-commercial projects
- Paid "Pro" plan: $20/month once you're running a real business off it, includes $20 of usage credit toward extra traffic

**Neon's free plan includes:**

- 100 hours of active database compute time per month
- Half a gigabyte of storage
- Up to 10 branches

That's genuinely enough to build and test a real first project. Past the free tier, Neon charges usage-based pricing with no fixed monthly minimum:

- Roughly $0.106 per compute-hour
- $0.35 per gigabyte of storage per month
- A small live app typically runs somewhere between a few dollars and about $20 a month total

One more thing worth knowing, purely for context, not because it changes your bill:

- Neon was bought by Databricks in May 2025 for roughly $1 billion
- Databricks has since built its own separate product called "Lakebase" using Neon's underlying technology
- Lakebase is a Databricks-branded, enterprise-focused product — a different thing from the Neon.tech service and pricing you'll actually be signing up for here
- Neon.tech continues to run independently under its own name and its own pricing page

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — the finished, live site after deploy, with the Neon database connected
>
> _Replace this callout with the real screenshot before publishing._

- Your Neon integration shows as "Connected" on your Vercel project's Storage tab
- You know which connection string is pooled (for the live app) versus unpooled (for one-time data moves) — see the intermediate guide if you need to run a migration
- You've confirmed you're still within Neon's free-tier compute and storage limits, or you've upgraded before a traffic spike surprises you
- Your custom domain (if you have one) has finished pointing its DNS records — the settings that tell the internet which server owns your domain name — at Vercel, and Vercel has issued your site's SSL certificate (the padlock that makes a site show as secure)

If any of this still feels unfamiliar, that's normal for a first deploy — the intermediate guide in this same hub picks up right where this one leaves off, once you're comfortable with the basics.

## Sources

- [Vercel Pricing](https://vercel.com/pricing) — Hobby and Pro plan terms and limits
- [Vercel Hobby Plan docs](https://vercel.com/docs/plans/hobby) — non-commercial usage restriction
- [Neon Pricing](https://neon.com/pricing) — current usage-based rates
- [Neon plans documentation](https://neon.com/docs/introduction/plans) — free tier compute-hour, storage, and branch limits
- [Neon: new usage-based pricing](https://neon.com/blog/new-usage-based-pricing) — explains the no-minimum billing model
- [Neon for Vercel — Vercel Marketplace listing](https://vercel.com/marketplace/neon) — official integration entry point
- [Neon: Vercel-native integration announcement](https://neon.com/blog/neon-vercel-native-integration) — how branch-per-preview works
- [TechCrunch: Databricks buys Neon for $1B](https://techcrunch.com/2025/05/14/databricks-to-buy-open-source-database-startup-neon-for-1b/) — acquisition context
