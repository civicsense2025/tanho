---
title: "Deploy on Fly.io + Fly Managed Postgres (Beginner)"
tagline: "Same-vendor hosting and database, built for proximity — but there's no free tier, so know the cost floor before you start"
category: own-your-stack
source_platform: fly
target_platform: fly-managed-postgres
difficulty: beginner
cost_range_usd: "5-15/mo"
tags: ["hosting", "database", "requires-cli", "platform-evaluation"]
level: beginner
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Basic command-line / terminal usage"
  - "Basic understanding of Docker/container images"
  - "Basic environment variables / secrets concept"
  - "Basic DNS configuration for a custom domain"
requirements:
  - "A credit card (Fly.io has no free tier)"
  - "flyctl installed locally"
  - "A Fly.io account"
  - "Terminal access on your computer"
  - "A domain you control (optional, for the custom domain step)"
effort_hours_min: 2
effort_hours_max: 4
---

# Deploy on Fly.io + Fly Managed Postgres — Beginner Guide

If you've never opened a terminal before, I'll explain every term the first time it shows up. But I want to be honest with you before you go any further: this is the one guide in my "own your stack" series where I have to open with a warning about money, not just mechanics. Fly.io has no free tier. Not "a limited free tier" — none. You will be asked for a credit card before you can deploy anything, and you will be charged from day one. I'd rather tell you that now than have you find out after you've already invested an afternoon.

That said, once you accept the cost floor, this pairing has something genuinely special going for it: Fly.io built its whole company around running your app and your database physically close together, sometimes in the same building. I'll explain exactly what that means and why it matters for a migration guide specifically.

## First, the vocabulary

- **Terminal**: a text-based window on your computer where you type commands instead of clicking buttons. On a Mac it's Terminal (in Applications > Utilities). On Windows it's PowerShell or the terminal built into VS Code. Fly.io is a command-line-first platform — there's a web dashboard, but you'll do most of your work by typing commands.
- **Environment variable**: a named piece of secret or configuration text (a password, a web address) that your app reads while running, instead of being written directly into your code. Fly.io calls these "secrets" when they're sensitive.
- **Region**: a physical data center location — Fly.io runs machines in cities like Chicago, Amsterdam, Tokyo, and São Paulo. When you deploy, you pick which region(s) your app lives in.
- **Anycast**: a networking trick where the same internet address is broadcast from many physical locations at once, and each visitor is automatically routed to whichever location is nearest to them. In plain terms: someone in Tokyo and someone in Paris can type the exact same web address and each get routed to a server near them, without you configuring separate addresses for each city. Fly.io uses this so a single app can feel fast worldwide.
- **Docker / container image**: a way of packaging your app and everything it needs to run into one self-contained unit. Fly.io deploys are Docker-based — if your app has a `Dockerfile`, or Fly can generate one for your language automatically, you're most of the way to a working deploy.
- **Postgres (PostgreSQL)**: a free, open-source, extremely popular type of database. Fly.io's "Managed Postgres" gives you one that Fly operates for you.
- **Private network**: an internal-only network that connects your Fly app to your Fly database directly, without either one going out over the public internet. This is part of why Fly's app-and-database pairing is fast — the two are never more than a short internal hop apart.

## The honest cost floor — read this first

> **[📸 SCREENSHOT PLACEHOLDER]** — Fly.io pricing page (fly.io/docs/about/pricing) and Managed Postgres pricing table (fly.io/docs/mpg)
>
> _Replace this callout with the real screenshots before publishing._

Fly.io used to offer free allowances — a handful of small always-on machines, some free bandwidth — under old plans called Hobby, Launch, and Scale. **Those plans stopped being offered to new customers on October 7, 2024.**

What that means today:

- Every new organization signs up for Pay As You Go.
- Every Pay As You Go organization must have a credit card on file.
- New signups get a short free trial (a small one-time credit, not an ongoing free tier).
- Once the trial credit is used up, billing starts automatically.

Here's what that means in real dollars:

- **Smallest possible app machine**: `shared-cpu-1x` with 256MB of RAM runs about **$1.94/month** if left on continuously — but realistically you'll want at least 512MB–1GB (roughly **$3.19–$5.70/month**) for anything beyond a toy.
- **Fly Managed Postgres, cheapest plan ("Basic")**: **$38.00/month** flat, for a shared-2x/1GB cluster, plus storage at $0.28/GB per month. This is a real floor — there is no smaller managed Postgres tier.
- **A cheaper alternative for a beginner project**: Fly's older, self-managed "unmanaged" Postgres option (you run Postgres yourself as a Fly app) costs roughly **$2/month** for a single-node dev-grade cluster — dramatically less than Managed Postgres, but it comes with zero hand-holding: no automatic failover, no managed backups, and you're responsible for keeping it patched and running. I cover that trade-off more in the intermediate and expert guides. For a true beginner, I don't recommend starting there.
- **Realistic beginner total**: roughly **$5–$15/month** for a small always-on app plus the cheap unmanaged Postgres option, or **$40+/month** the moment you want Fly to manage your database for you.

> **🚨 There is no way around the credit card requirement**
>
> Every Fly.io organization (other than special "linked" enterprise arrangements) must have a credit card on file to deploy anything beyond the initial trial. If your budget genuinely needs to start at $0, Fly.io is not the right first stop — that's not a criticism of Fly, just an honest mismatch. Come back to this guide once you're ready to spend a small, predictable amount monthly.

## Why this pairing is the "frictionless" case study

Here's the thing that makes Fly worth the cost floor for the right person: Fly explicitly designs for your app and your database to sit close together, sometimes down to the same physical rack in the same data center. When you create a Managed Postgres cluster, you pick a region — and if you pick the same region your app runs in, the two talk to each other over Fly's private internal network instead of the public internet.

Why this actually matters for a migration guide:

- **Lower latency** — the time it takes data to travel is shorter when app and database sit in the same building instead of crossing the open internet between two different companies.
- **No middleman network** — there's no separate vendor's infrastructure sitting between your app and your data, which is exactly the kind of friction that trips up other "app hosted here, database hosted there" pairings elsewhere in this guide series.

Practically, this shows up as:

- No CORS configuration to fight.
- No third-party connection pooler service to add on top.
- A private network address for your database that only your own Fly apps can reach — it isn't exposed to the open internet by default.

## Deploying it, step by step

> **[🎥 VIDEO PLACEHOLDER]** — full screen recording of every step below, start to finish
>
> _Replace this callout with the real video before publishing._

1. **Install flyctl**, Fly's command-line tool. On a Mac, open Terminal and run:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
2. **Create a free Fly.io account and log in**: run `fly auth signup` (or `fly auth login` if you already made an account on the website). You'll be asked for a credit card here, or shortly after your trial credit runs out.
3. **Launch your app**: from your project's folder, run `fly launch`. Fly will detect your app's language/framework, generate a `Dockerfile` if you don't have one, and ask you to pick an app name and a region (pick one near your visitors, or near where most of your traffic will come from).
4. **Say yes when asked about a Postgres database.** `fly launch` will offer to create one for you and prompts you to choose Managed Postgres or the cheaper unmanaged option. For a beginner just testing the waters, the unmanaged single-node option keeps costs near $2/month; if you want Fly handling backups and failover from day one, choose Managed Postgres (starts at $38/month).
5. **Deploy**: `fly deploy`. This builds your Docker image, ships it to Fly's infrastructure, and starts your app.
6. **Confirm it's live**: `fly status` shows your app's health, and `fly open` opens it in your browser at a free `.fly.dev` address.

Once your database exists, Fly automatically wires a connection string into your app as a secret (an environment variable) — you don't hand-copy a password between two different companies' dashboards the way you might with other pairings.

> **💡 Tip — using your own domain name**
>
> - Buy a domain from any registrar — Namecheap, Cloudflare, and Google Domains all work fine.
> - In your Fly dashboard, add a certificate for your domain with `fly certs add yourdomain.com`.
> - Add the DNS records Fly shows you (usually an A/AAAA record or a CNAME) at your registrar.
> - Give it up to 24 hours — DNS changes can take that long to fully propagate.

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — live site loaded in a browser plus `fly status` output showing a healthy deploy
>
> _Replace this callout with the real screenshot before publishing._

- Credit card on file and you've confirmed which plan you're on (Pay As You Go, not a legacy plan)
- You know which Postgres option you chose — unmanaged (~$2/mo, self-managed) or Managed Postgres ($38/mo+, Fly-managed) — and why
- Your app and your database are deployed in the *same* Fly region, so they talk over the private network
- Custom domain certificate issued and DNS records propagated
- You've set a billing alert or checked Fly's Cost Management page so a traffic spike doesn't surprise you

## Sources

- [Fly.io Resource Pricing](https://fly.io/docs/about/pricing/)
- [Fly.io Free Trial docs](https://fly.io/docs/about/free-trial/)
- [Managed Postgres overview and pricing](https://fly.io/docs/mpg/)
- [Fly Postgres (Unmanaged)](https://fly.io/docs/postgres/)
- [Create and Connect to a Managed Postgres Cluster](https://fly.io/docs/mpg/create-and-connect/)
- [Regions · Fly Docs](https://fly.io/docs/reference/regions/)
- [Private Networking · Fly Docs](https://fly.io/docs/networking/private-networking/)
- [App configuration (fly.toml) · Fly Docs](https://fly.io/docs/reference/configuration/)
- [Cost Management on Fly.io](https://fly.io/docs/about/cost-management/)
