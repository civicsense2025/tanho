---
title: "Deploy on Render + Supabase (Beginner)"
tagline: "A gentle, from-scratch walkthrough for your first real deploy"
category: own-your-stack
source_platform: render
target_platform: supabase
difficulty: beginner
level: beginner
cost_range_usd: "0-25/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Comfort using web dashboards (GitHub, Render, Supabase)"
  - "Basic grasp of environment variables and secrets"
  - "Connecting a GitHub repo to a deploy platform"
  - "Basic DNS concepts (pointing a domain at a host)"
requirements:
  - "A GitHub account with your project's code pushed to a repo"
  - "A Render account"
  - "A Supabase account"
  - "A domain you control (optional, for the custom domain step)"
  - "A password manager or safe place to store your DB password"
effort_hours_min: 1
effort_hours_max: 3
---

# Deploy on Render + Supabase (Beginner)

If you've never deployed a website before, welcome. I want to slow down and explain the pieces before I tell you to use them, because half the pain of a first deploy isn't the steps — it's not knowing what the steps even mean. By the end of this guide you'll have a working site on Render, backed by a Supabase database, and you'll understand why each piece exists.

Quick vocabulary first:

- **Terminal** — a text-only window where you type commands instead of clicking buttons. It looks intimidating, but it's just a very literal chat interface with your computer.
- **Environment variable** — a secret value (like a password or database connection string) that your app reads at startup, kept out of your actual code so it never ends up on GitHub by accident.
- **DNS** — the phone book that turns a domain name like `yoursite.com` into the actual server address browsers connect to.
- **Git push deploy** — you save your code to GitHub, and the hosting platform notices and automatically rebuilds and republishes your site. No manual uploading.
- **Managed Postgres database** — a database (Postgres is the specific kind) that someone else runs, patches, and backs up for you, so you just connect to it and use it.

## What Render is, and why you still need Supabase

Render is a hosting platform: you connect a GitHub repository, and it builds and runs your app, giving you a live URL. It's built on top of major cloud infrastructure (AWS and Google Cloud) but wraps it in a much simpler dashboard than using those clouds directly.

Render also sells its own Postgres database. I'm steering you away from it for a beginner project, and it comes down to a few specific limitations of Render's **free** Postgres tier:

- **30-day expiry** — the database automatically expires 30 days after you create it.
- **A short grace period** — you get 14 days after that to upgrade to a paid plan before Render deletes it, data and all.
- **No backups** — if something goes wrong before you upgrade, there's nothing to restore from.
- **No connection pooling** — the free tier doesn't manage connections for you the way a production setup needs.

That's a fine trial, but a bad foundation for a real first project, because you don't want a countdown timer on your own data. Supabase's free database, by contrast, doesn't have a hard expiration date — it just pauses after a week of inactivity, and you can wake it back up with one click. That's a much safer place to start.

Supabase gives you, all through one dashboard:

- A hosted Postgres database
- Login/authentication
- File storage
- Some real-time features

So you never have to install or patch a database server yourself.

## Setting up Supabase

> **[📸 SCREENSHOT PLACEHOLDER]** — the Supabase "New Project" screen
>
> _Replace this callout with the real screenshot before publishing._

Steps to get set up:

1. Create a free account at supabase.com and start a new project.
2. Pick a region close to where most of your users are. Supabase runs its database infrastructure on Amazon Web Services (AWS) across many regions worldwide, from Virginia and Oregon to Frankfurt, Singapore, and Sydney.
3. Write down (or better, use a password manager for) the database password it asks you to set — you'll need it in a minute.
4. Once the project spins up, go to **Connect** in the dashboard and copy the **Transaction pooler** connection string, not the direct one. This is the "address plus password" your app will use to reach your database.

You want the pooler version, not the direct one, for two reasons:

- **It handles connection churn well** — it's built to handle many short connections opening and closing, which is exactly what a small web app does.
- **It avoids an IPv4/IPv6 mismatch** — Render's outbound connections are IPv4-only, while Supabase's direct connection is IPv6 by default. The pooler sidesteps that mismatch entirely.

Never paste this connection string into your actual code files — it goes into an environment variable instead, which I'll cover next.

What the free Supabase tier gives you:

- 500MB of database storage
- 5GB of data transfer out per month
- Plenty of headroom for a first project

Two things worth knowing: a free project pauses itself after a week with no activity, so don't be alarmed if it goes to sleep while you're not looking — one click wakes it back up. And Supabase's paid Pro tier starts at $25/month, which you won't need until this actually gets real traffic.

## Deploying on Render

> **[🎥 VIDEO PLACEHOLDER]** — a full run-through of the steps below, start to finish
>
> _Replace this callout with the real video before publishing._

Steps to deploy:

1. Sign into Render, click **New → Web Service**, and connect your GitHub account.
2. Pick the repository with your code. Render detects what kind of app it is and suggests a build command and start command.
3. Before you deploy, add your Supabase connection string as an **environment variable** in Render's dashboard, under your service's **Environment** tab. Render keeps these values encrypted and hidden from your logs. This is the one and only place that secret should live.
4. Click **Create Web Service**. Render builds your app and gives you a live URL within a few minutes.

From now on, every time you push new code to your GitHub repository, Render rebuilds and redeploys automatically. That's the whole workflow — this is what people mean by "git push to deploy."

A few things worth knowing about pricing and behavior at this stage:

- For a small app, the free tier or the $7/month Starter instance is fine to begin with.
- If your project is just static files (plain HTML/CSS with no backend), Render's static site hosting is free with no time limit.
- Render's free web services spin down after 15 minutes without traffic and take about a minute to wake back up on the next visit. That's fine for a personal project or portfolio, but budget for the $7/month Starter tier once this is more than a hobby and needs to load instantly.

## Does Render + Supabase actually work well together?

Yes, with one honest detail worth understanding. Render doesn't run its own physical data centers — it deploys onto AWS and Google Cloud infrastructure in five regions: Oregon, Ohio, Virginia, Frankfurt, and Singapore. Supabase also runs on AWS, across a wider set of regions. That means your Render app and your Supabase database are still two separate services talking over the internet, even when Render happens to be using AWS underneath — Render doesn't currently let you deploy directly into "the same AWS account or VPC" as your Supabase project.

What this means for you in practice:

- Pick a Supabase region close to your Render region (for example, Render's Ohio region paired with Supabase's US East AWS region).
- Expect a small added delay per database query — realistically single-digit to a few dozen milliseconds, not something a beginner project will notice.

The one real setup detail, not a cost, is a networking mismatch between the two platforms:

- **Render** only supports IPv4 for outbound network traffic.
- **Supabase's default direct database connection** is IPv6-only, unless you pay for an add-on.
- **Do this:** use Supabase's **pooled** connection string from the start. It works over IPv4 for free and sidesteps the issue completely.
- **Not this:** don't use Supabase's direct connection string — it won't connect from Render without the paid IPv4 add-on.

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — the final live site after deploy
>
> _Replace this callout with the real screenshot before publishing._

- Used Supabase's **Transaction pooler** connection string, not the direct one
- Supabase connection string saved as an environment variable in Render, never hard-coded
- SSL certificate active (Render issues this automatically for custom domains)
- Custom domain's DNS pointed at the address Render gives you
- Confirmed your Supabase project region is geographically close to your Render service's region

## Sources

- [Render Pricing](https://render.com/pricing)
- [Render: Deploy for Free](https://render.com/docs/free)
- [Render Postgres: Flexible Plans](https://render.com/docs/postgresql-refresh)
- [Render: Regions](https://render.com/docs/regions)
- [Render: Connection Pooling](https://render.com/docs/postgresql-connection-pooling)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: IPv4 and IPv6 compatibility](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP)
- [Migrate from Render to Supabase](https://supabase.com/docs/guides/platform/migrating-to-supabase/render)
