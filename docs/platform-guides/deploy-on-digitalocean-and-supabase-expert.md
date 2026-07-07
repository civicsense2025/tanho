---
title: "Deploy on DigitalOcean + Supabase (Expert)"
tagline: "Hardened Droplets, process management, and the same-cloud Postgres tradeoff"
category: own-your-stack
source_platform: digitalocean
target_platform: supabase
difficulty: expert
level: expert
cost_range_usd: "5-250/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Hardening a Linux server (SSH keys, ufw, fail2ban)"
  - "Writing systemd units or PM2 configs for process supervision"
  - "Configuring Nginx as a TLS-terminating reverse proxy"
  - "Infrastructure-as-code with Terraform and/or the doctl CLI"
  - "Evaluating managed database tradeoffs (Supabase vs. DO Managed Postgres)"
requirements:
  - "A DigitalOcean account with billing enabled for Droplets"
  - "A Supabase project (or a DO Managed Postgres instance)"
  - "A domain you control with DNS access"
  - "An SSH key pair for server access"
  - "Working familiarity with Terraform and/or doctl"
effort_hours_min: 6
effort_hours_max: 16
---

# Deploy on DigitalOcean + Supabase (Expert)

You know how to run production infrastructure. This covers what's specific to the DigitalOcean + Supabase pairing:

- Droplet hardening
- Process supervision
- The Nginx layer
- Whether DO Managed Postgres beats Supabase for your latency profile
- Automating the whole thing with `doctl` or Terraform

## Droplet hardening

A fresh Droplet is root-accessible over password SSH by default if you let it be — don't. Minimum bar before anything touches production traffic:

```bash
# Create a non-root user, add to sudo
adduser deploy && usermod -aG sudo deploy

# SSH key-only auth — disable password auth entirely
# In /etc/ssh/sshd_config:
#   PasswordAuthentication no
#   PermitRootLogin no
systemctl restart sshd

# ufw: default deny, allow only what you use
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw enable

# fail2ban to blunt brute-force SSH attempts
apt install -y fail2ban
systemctl enable --now fail2ban
```

Since January 1, 2026, Droplets bill per second (60-second/$0.01 minimum) rather than per hour, with a monthly usage cap at 672 hours so nothing overruns the listed flat rate. That makes it cheap to spin up a throwaway Droplet to test this hardening sequence before you bake it into a snapshot or Terraform module.

## Process management: PM2 vs systemd

**PM2** — the path of least resistance for Node apps:

- `pm2 startup` for boot-time restart
- Log rotation via `pm2-logrotate`
- Zero-downtime reload with `pm2 reload`

**systemd** — if you're already standardized on unit files across your fleet:

- A plain unit with `Restart=on-failure` and `journalctl` for logs is one less runtime dependency
- Integrates cleanly with `systemd-timers` for cron-adjacent jobs

Neither is wrong; pick whichever your existing tooling already assumes.

## Nginx reverse proxy

```nginx
server {
  listen 80;
  server_name yourdomain.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Run `certbot --nginx` for automated Let's Encrypt issuance and renewal; add a `systemd` timer check or rely on certbot's own installed cron/timer, but verify it actually fired — expired certs from a silently-failed renewal are still the single dumbest way to take down a Droplet-hosted app.

## The real question: is Supabase the right database here, or is DO Managed Postgres better?

This deserves a direct answer instead of hedging. Supabase runs exclusively on AWS — 17 supported regions, no DigitalOcean or Fly.io option anymore (the earlier "Fly Postgres, managed by Supabase" product has been discontinued). DigitalOcean has its own physical data centers, entirely separate from AWS's. That means a DigitalOcean Droplet talking to Supabase is always crossing cloud boundaries — there is no configuration that puts them in the same rack or even the same building.

**What that costs you in practice:**

- If you pick adjacent regions (DO's NYC data centers paired with Supabase's `us-east-1`, for instance), the cross-cloud hop typically adds single-digit-to-a-few-dozen milliseconds versus a same-region, same-cloud setup, where intra-region round trips can run under 1ms.
- For a standard web app issuing a handful of queries per request, this is not the bottleneck — your query plans, N+1 patterns, and connection handling will dominate before cross-cloud latency does.
- For a workload that's genuinely latency-sensitive at the database layer — high-frequency small transactions, synchronous read-after-write chains inside a request, anything approaching real-time trading or bidding logic — the cross-cloud hop is a real, measurable cost and DO Managed Postgres in the same region as your Droplet is the better architecture, full stop.

**What you give up moving to DO Managed Postgres:** it's just Postgres.

- No built-in auth (you're rolling your own or bolting on something like Lucia/Auth.js)
- No object storage
- No realtime subscriptions
- No auto-generated REST/GraphQL API
- No dashboard-driven row-level-security policy editor

Supabase's value isn't the Postgres instance — it's everything wrapped around it. If your app leans on Supabase Auth, Storage, or Realtime, replacing just the database with DO Managed Postgres means rebuilding those layers yourself, which is a materially bigger project than a database migration.

**Pricing comparison, concretely:**

- DO Managed Postgres starts at roughly $15.15/month for a single node (1 vCPU, 1GB RAM, 10GB disk — dev/test only, no failover).
- A "Growth" HA tier with a standby lands around $60.90/month, and note DO bills each standby at full primary price, so HA effectively doubles the bill.
- A production-grade tier (6 vCPU, 16GB RAM) runs about $244.35/month.
- Supabase Pro is $25/month flat, covering an 8GB database, 100GB storage, and 500 realtime connections, with usage-based overage beyond that and a spend cap on by default.

For a small-to-mid app, Supabase Pro is usually cheaper *and* replaces more infrastructure. Cross over to DO Managed Postgres only when:

1. Latency to your DO compute genuinely matters at the database layer, or
2. You don't use any of Supabase's non-database features and are paying for surface area you don't touch.

**My honest recommendation:** default to Supabase even with a DigitalOcean Droplet or App Platform app. The cross-cloud latency is real but rarely dominant, and Supabase's batteries-included model saves more engineering time than the latency costs you in most cases. Reach for DO Managed Postgres specifically when you've profiled your app and found database round-trip time inside the request path is your actual bottleneck — not preemptively.

## Connection strategy from a Droplet

Use Supabase's **direct connection string**, not the shared Supavisor pooler, from any long-running process:

- A Droplet
- A PM2-managed Node process
- A systemd service

Supavisor is multi-tenant infrastructure aimed at serverless functions that churn through many short-lived connections; Supabase's own benchmarks attribute roughly 2ms of added latency per query to routing through it versus their dedicated, co-located PgBouncer pooler. A persistent Droplet process doesn't need pooling for connection-churn reasons — hold a small connection pool in your app (e.g., `pg.Pool` with a sane max) and connect directly.

## Automation: doctl and Terraform

For repeatable infra, script it rather than click through the dashboard:

```bash
doctl compute droplet create app-prod-01 \
  --region nyc3 \
  --size s-1vcpu-1gb \
  --image ubuntu-24-04-x64 \
  --ssh-keys <your-key-fingerprint> \
  --enable-monitoring
```

Terraform's `digitalocean` provider covers Droplets, App Platform specs, firewalls, and DNS records in one plan. Pair it with the Supabase side of the workflow like this:

- Supabase itself is managed via its dashboard/CLI/Management API rather than a mature first-party Terraform provider.
- Most teams script the Supabase side with `supabase` CLI migrations and keep Terraform scoped to the DigitalOcean side.
- Store your Supabase connection string in DO App Platform's encrypted env vars or, on a Droplet, in a secrets manager / `.env` file with `chmod 600` and out of version control.
- Never store it in the Terraform state file in plaintext if you can avoid it — mark it `sensitive = true` at minimum.

## Go-live checklist

- SSH key-only auth enforced, root login disabled, fail2ban active
- ufw default-deny with only 22/80/443 open
- PM2 or systemd configured for auto-restart on crash and boot
- Nginx terminating TLS via certbot, HTTP→HTTPS redirect confirmed
- Supabase direct connection string used (not Supavisor) from persistent processes
- Supabase region and DO region chosen to minimize physical distance
- Decision documented: Supabase vs. DO Managed Postgres, with the latency/feature tradeoff reasoning captured for the next engineer
- Infra defined in Terraform/doctl scripts, not just clicked into existence

## Sources

- [DigitalOcean Droplet Pricing](https://www.digitalocean.com/pricing/droplets)
- [DigitalOcean per-second billing announcement](https://www.digitalocean.com/blog/dropletplans-persecbilling-byoip-natgateway)
- [DigitalOcean Managed Databases Pricing](https://www.digitalocean.com/pricing/managed-databases)
- [DigitalOcean App Platform Pricing Documentation](https://docs.digitalocean.com/products/app-platform/details/pricing/)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Available Regions](https://supabase.com/docs/guides/platform/regions)
- [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supavisor: Scaling Postgres to 1 Million Connections](https://supabase.com/blog/supavisor-1-million)
- [Fly Postgres, managed by Supabase (discontinued offering)](https://supabase.com/blog/postgres-on-fly-by-supabase)
- [doctl compute droplet reference](https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/)
