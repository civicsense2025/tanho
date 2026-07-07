---
title: "Deploy on DigitalOcean + Supabase (Intermediate)"
tagline: "Real infrastructure control without running your own database"
category: own-your-stack
source_platform: digitalocean
target_platform: supabase
difficulty: intermediate
level: intermediate
cost_range_usd: "5-75/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "SSH access and basic Linux server administration"
  - "Configuring an Nginx reverse proxy"
  - "Issuing SSL certificates with Certbot/Let's Encrypt"
  - "Managing a Node process with PM2"
  - "Setting firewall rules with ufw"
  - "Choosing pooled vs. direct Postgres connection strings"
requirements:
  - "A GitHub account with your app's code in a repository"
  - "A DigitalOcean account (App Platform or a Droplet)"
  - "A Supabase account and project"
  - "A domain you control for DNS and SSL setup"
effort_hours_min: 3
effort_hours_max: 8
---

# Deploy on DigitalOcean + Supabase (Intermediate)

DigitalOcean sits between Vercel's fully-managed simplicity and running your own VPS from scratch. App Platform gives you git-push deploys with flat, predictable pricing — no bandwidth bill shock the way Vercel can surprise you — and a plain Droplet gives you full control if you want it. Supabase stays your database in both cases, so you're not also running Postgres yourself. I've deployed both ways; here's what each actually costs and where the friction is.

The choice mostly comes down to this:

- **App Platform** — pick this if you want git-push deploys, don't want to manage a server, and are fine paying a bit more for that convenience.
- **Droplet** — pick this if you want full control over the box, need custom networking or multiple services on one instance, or want the lowest steady-state cost at scale.

## What it costs, precisely

> **[📸 SCREENSHOT PLACEHOLDER]** — the pricing pages referenced below
>
> _Replace this callout with the real screenshots before publishing._

- **App Platform**: free tier for static sites only (3 apps, 1GiB transfer/app/month). Dynamic services (anything with a backend) start at $5/month per service. Dev databases are $7/month if you use DO's own throwaway Postgres for staging. Billed per second with a one-minute minimum.
- **Droplets**: from $4/month (512MB RAM, 1 vCPU) up through dedicated-CPU tiers. Since January 1, 2026, all Droplet billing is per-second (60-second/$0.01 minimum) instead of per-hour, with a monthly cap at 672 hours so a full month never costs more than the listed rate. Bandwidth overage is cheap: $0.01/GiB, and most plans bundle 500GB–11,000GB of pooled outbound transfer across your whole team's Droplets.
- **DigitalOcean Managed Postgres**, if you ever want to skip Supabase entirely: starts around $15.15/month for a single node (1 vCPU, 1GB RAM, 10GB disk, no failover — fine for dev/test only). A "Growth" tier with high availability runs closer to $60.90/month, and note that DO bills each standby replica at the same rate as the primary, so turning on HA roughly doubles your database bill.
- **Supabase**: Free tier (500MB database, 5GB egress/month, pauses after a week of inactivity), Pro at $25/month (8GB database, 100GB storage, 500 realtime connections, with a spend cap on by default so you don't get surprised), Team at $599/month if you need SOC2/ISO compliance and longer backup retention.
- **App Platform bandwidth overage**: $0.02/GiB pooled across your apps, roughly double the Droplet rate — one reason people move to Droplets once traffic gets real.

## Setting it up

> **[🎥 VIDEO PLACEHOLDER]** — a full run-through of the steps below, start to finish
>
> _Replace this callout with the real video before publishing._

**App Platform path** — close to Vercel-easy:

1. Connect your GitHub repo in the App Platform dashboard.
2. Set your Supabase connection string as an encrypted environment variable.
3. Pick your instance size.
4. Deploy — DigitalOcean builds and redeploys on every push from here on.

**Droplet path**, if you want real control (a VPC, custom networking, multiple services on one box, or just lower steady-state cost at scale):

```bash
# On a fresh Droplet
sudo apt update && sudo apt install -y nodejs npm nginx
npm i -g pm2
git clone <your-repo> app && cd app
npm ci && npm run build
pm2 start npm --name app -- start
pm2 startup && pm2 save
```

_/etc/nginx/sites-available/app_

```nginx
server {
  listen 80;
  server_name yourdomain.com;
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
  }
}
```

Use `certbot` for a free Let's Encrypt SSL cert on the Droplet path — App Platform issues and renews SSL automatically, so this step only applies if you're going bare-metal.

> **⚠️ Warning — a Droplet is unmanaged**
>
> No automatic OS patching, no managed SSL renewal, no automatic restarts on crash beyond what PM2 gives you. If you don't want to own that operational surface, stay on App Platform — same DigitalOcean account, none of the server administration.

## The cross-cloud question, answered honestly

Here's the thing worth being precise about: DigitalOcean and Supabase are genuinely two separate infrastructure providers.

- DigitalOcean runs its own data centers (New York, San Francisco, Amsterdam, Frankfurt, Singapore, and others).
- Supabase does not run its own data centers at all — it deploys exclusively onto AWS, across 17 supported AWS regions.
- Supabase previously experimented with a Fly.io-based product ("Fly Postgres, managed by Supabase"), but that offering has since been discontinued in favor of the AWS-only model.

So there's no scenario where your DigitalOcean compute and your Supabase database are in the same physical building — they're always two hops across the public internet, bridged by whatever peering exists between DigitalOcean's network and AWS's.

Does that matter in practice? Mostly no, with one honest caveat:

- If you pick geographically close regions — DigitalOcean's NYC data centers with Supabase's `us-east-1` (Virginia), for example — the added round-trip from being on a different cloud is typically in the single-digit-to-a-few-dozen-millisecond range, not the 100ms+ territory that would actually hurt a typical web app's perceived responsiveness.
- This is meaningfully different from co-located setups (like an app and database both running inside the same AWS region), where round trips can be under 1ms.
- For most CRUD-style apps making a handful of queries per page load, the difference is not something users will notice.

One connection detail that does matter: for a persistent server like a Droplet, Supabase recommends a **direct Postgres connection** rather than routing through their pooler (Supavisor).

- The pooler exists mainly to help serverless functions that open and close many short-lived connections.
- A long-running Droplet process doesn't have that problem, and a direct connection avoids the extra ~2ms per query that Supabase's own benchmarks attribute to the shared pooler layer versus their co-located dedicated pooler.
- Practically: use the direct connection string from Supabase's dashboard, not the pooled one, when connecting from a Droplet or App Platform service.

The other real friction point is bandwidth cost, not latency:

- Any bytes that flow between your DigitalOcean app and Supabase (or out to your users) beyond your included allowance are billed by DigitalOcean at $0.01–0.02/GiB.
- Supabase separately meters its own egress (5GB free, more on Pro).
- Neither company waives fees for traffic destined to the other's cloud — there's no special peering discount because you're a customer of both.
- For a typical low-to-mid traffic app, this is a rounding error; for a data-heavy app moving large query results or files constantly, it's worth modeling before you commit.

**Bottom line: this pairing works without friction for the vast majority of apps.** The two real considerations:

1. Pick geographically adjacent regions to keep latency low.
2. Use Supabase's direct connection string rather than the shared pooler from a persistent server.

Neither is a dealbreaker; both are five-minute decisions.

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — the final live site after deploy
>
> _Replace this callout with the real screenshot before publishing._

- Supabase connection string stored as an encrypted env var, not in code
- Using the direct connection string (not the pooler) from a Droplet or long-running App Platform service
- Supabase project region chosen close to your DigitalOcean app's region
- SSL certificate issued (Let's Encrypt via certbot on a Droplet; automatic on App Platform)
- Firewall configured if using a Droplet (`ufw allow 80,443,22` only, nothing else open)
- Custom domain DNS pointed at the right A record or App Platform target
- Bandwidth overage rates checked against your expected traffic ($0.01/GiB Droplets, $0.02/GiB App Platform)

## Sources

- [DigitalOcean App Platform Pricing](https://www.digitalocean.com/pricing/app-platform)
- [DigitalOcean App Platform Pricing Documentation](https://docs.digitalocean.com/products/app-platform/details/pricing/)
- [DigitalOcean Droplet Pricing](https://www.digitalocean.com/pricing/droplets)
- [DigitalOcean Managed Databases Pricing](https://www.digitalocean.com/pricing/managed-databases)
- [DigitalOcean per-second billing announcement](https://www.digitalocean.com/blog/dropletplans-persecbilling-byoip-natgateway)
- [Deploying Next.js on a DigitalOcean Droplet](https://www.digitalocean.com/community/developer-center/deploying-a-next-js-application-on-a-digitalocean-droplet)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Available Regions](https://supabase.com/docs/guides/platform/regions)
- [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supavisor: Scaling Postgres to 1 Million Connections](https://supabase.com/blog/supavisor-1-million)
- [Fly Postgres, managed by Supabase (discontinued offering)](https://supabase.com/blog/postgres-on-fly-by-supabase)
