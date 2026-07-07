---
title: "Deploy on DigitalOcean + Supabase (Beginner)"
tagline: "A gentle, from-scratch walkthrough for your first real deploy"
category: own-your-stack
source_platform: digitalocean
target_platform: supabase
difficulty: beginner
level: beginner
cost_range_usd: "0-25/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Creating accounts and connecting GitHub to a hosting dashboard"
  - "Setting environment variables in a dashboard UI"
  - "Reading and safely handling a database connection string"
  - "Pointing a domain's DNS at a hosting provider"
requirements:
  - "A GitHub account with your app's code in a repository"
  - "A DigitalOcean account"
  - "A Supabase account"
  - "A domain you control (optional, for a custom domain)"
effort_hours_min: 1
effort_hours_max: 3
---

# Deploy on DigitalOcean + Supabase (Beginner)

If you've never deployed a website before, welcome. I want to slow down and explain the pieces before I tell you to use them, because half the pain of a first deploy isn't the steps — it's not knowing what the steps even mean. By the end of this guide you'll have a working site on DigitalOcean, backed by a Supabase database, and you'll understand why each piece exists.

Quick vocabulary first:

- **Terminal** — a text-only window where you type commands instead of clicking buttons. It looks intimidating but it's just a very literal chat interface with your computer.
- **Environment variable** — a secret value (like a password or database connection string) that your app reads at startup, kept out of your actual code so it never ends up on GitHub by accident.
- **DNS** — the phone book that turns a domain name like `yoursite.com` into the actual server address browsers connect to.
- **SSH** — a secure way to remotely log into a server and type commands on it, as if you were sitting at that machine.
- **Nginx** — software that sits in front of your app and routes incoming web traffic to it. I'll only bring it up in the harder path below.

## The two ways to do this, and which one you want

DigitalOcean gives you two ways to run an app:

- **App Platform** — git-push-and-done, like Vercel. This is the one you want.
- **Droplet** — a bare virtual server you configure yourself. This means installing your own software, securing your own server, and fixing your own 3am outages — genuinely more than a beginner should take on for a first project.

For your first deploy, use App Platform. I'll show the Droplet path exists later, with a clear warning, but don't start there.

Supabase is your database either way. It gives you, all through a dashboard, so you never have to install or patch a database server yourself:

- A hosted Postgres database
- Login/authentication
- File storage
- Real-time features

## Setting up Supabase

> **[📸 SCREENSHOT PLACEHOLDER]** — the Supabase "New Project" screen
>
> _Replace this callout with the real screenshot before publishing._

Create a free account on supabase.com and start a new project. Pick a region close to where most of your users are — Supabase runs its database infrastructure on Amazon Web Services (AWS), and it lets you choose from 17 AWS regions worldwide, from Virginia and Oregon to Frankfurt, Singapore, and Sydney. Write down (or better, use a password manager for) the database password it asks you to set — you'll need it in a minute.

Once the project spins up:

1. Go to **Project Settings → Database** and copy your connection string. This is the "address plus password" your app will use to reach your database.
2. Never paste this into your actual code files — it goes into an environment variable instead, which I'll cover next.

What the free Supabase tier gives you:

- 500MB of database storage
- 5GB of data transfer out per month — plenty for a first project
- Automatic pausing after a week with no activity, so don't be alarmed if it goes to sleep while you're not looking

Supabase's paid Pro tier starts at $25/month, and you won't need it until this actually gets real traffic.

## Deploying on App Platform

> **[🎥 VIDEO PLACEHOLDER]** — a full run-through of the steps below, start to finish
>
> _Replace this callout with the real video before publishing._

1. Sign into DigitalOcean, click **Create → Apps**, and connect your GitHub account.
2. Pick the repository with your code. DigitalOcean will detect what kind of app it is and suggest a build plan.
3. Add your Supabase connection string as an **environment variable** in the App Platform dashboard, under your app's Settings. Mark it "Encrypted" — this keeps it hidden from logs and from anyone who isn't you. This is the one and only place that secret should live.
4. Click deploy. DigitalOcean builds your app and gives you a live URL within a few minutes.

From now on, every time you push new code to your GitHub repository, DigitalOcean rebuilds and redeploys automatically. That's the whole workflow.

What it costs to run:

- For a small app, the "Basic" tier is fine
- Dynamic web apps start at $5/month for a small always-on instance
- A free tier exists if your project is just static files (like a plain HTML/CSS site with no backend), which allows three sites and 1GiB of outbound traffic per app per month

## Does DigitalOcean + Supabase actually work well together?

Yes, and I want to be specific about why, because "it works" isn't the same as "there's zero cost to pairing two separate companies." DigitalOcean and Supabase are two different cloud providers — DigitalOcean runs its own data centers, and Supabase's databases run on AWS. That means your app server and your database aren't sitting in the same building the way they would be if you used, say, DigitalOcean's own managed database.

What that means in practice:

- If you pick a Supabase region that's geographically close to your DigitalOcean app's region (for example, DigitalOcean's New York data centers paired with Supabase's US East AWS region), the extra network hop between the two clouds adds a small amount of delay.
- Realistically that's single-digit to a few dozen milliseconds per database query — not something a beginner project will notice.
- There's no special setup required to make this work; you just connect with a normal Postgres connection string, the same as you would with any hosted database.

The one real cost consideration: data leaving DigitalOcean toward the internet (including toward Supabase) is metered once you exceed your plan's included bandwidth, at $0.02/GiB on App Platform. For a small app this rarely amounts to real money, but it's honest to flag it now rather than have it surprise you later.

## The Droplet path exists — but it's genuinely harder

> **⚠️ Warning — this path assumes comfort with the terminal**
>
> A Droplet is an empty server. Nothing is pre-installed, nothing patches itself, and if your app crashes at 2am, nothing restarts it unless you've configured that yourself. I'd skip this section on your first deploy and come back to it once App Platform feels easy.

If you want to see what it involves, here's the rough shape of it:

1. Create a Droplet (DigitalOcean's virtual server product, starting at $4/month).
2. Connect to it over SSH.
3. Install Node.js yourself.
4. Install and configure Nginx to route web traffic to your app.
5. Use a tool like PM2 to keep your app running and restart it if it ever crashes.

Since January 2026, Droplets bill per second instead of per hour, so you're never overcharged for partial usage — but you are on the hook for everything else a managed platform would normally handle for you.

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — the final live site after deploy
>
> _Replace this callout with the real screenshot before publishing._

- Supabase connection string saved as an encrypted environment variable, never hard-coded
- SSL certificate active (App Platform issues this automatically; a Droplet needs Let's Encrypt set up manually)
- Custom domain's DNS pointed at the address DigitalOcean gives you
- Confirmed your Supabase project region is geographically close to your DigitalOcean app region

## Sources

- [DigitalOcean App Platform Pricing](https://www.digitalocean.com/pricing/app-platform)
- [DigitalOcean App Platform Pricing Documentation](https://docs.digitalocean.com/products/app-platform/details/pricing/)
- [DigitalOcean Droplet Pricing](https://www.digitalocean.com/pricing/droplets)
- [DigitalOcean per-second billing announcement](https://www.digitalocean.com/blog/dropletplans-persecbilling-byoip-natgateway)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Available Regions](https://supabase.com/docs/guides/platform/regions)
- [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [DigitalOcean Global Infrastructure / Regions](https://www.digitalocean.com/solutions/global-infrastructure)
