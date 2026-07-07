---
title: "Deploy on Vercel + Supabase (Beginner)"
tagline: "The fastest path from git push to a live site with a real Postgres database — explained from zero"
category: own-your-stack
source_platform: vercel
target_platform: supabase
difficulty: beginner
level: beginner
cost_range_usd: "0-45/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Comfortable creating accounts and following dashboard click-through steps"
  - "Can copy and paste values (like a connection string) between two dashboards"
  - "Basic comfort opening a terminal, even if you don't type complex commands"
  - "Can create a GitHub account and push code to a repository"
  - "Willing to learn new vocabulary (env variables, DNS, connection strings) as you go"
requirements:
  - "A GitHub account with your site's code in a repository"
  - "A free Vercel account"
  - "A free Supabase account"
  - "A domain name if you want a custom URL instead of a .vercel.app address"
  - "A safe place (like a password manager) to store your database password"
effort_hours_min: 1
effort_hours_max: 3
---

# Deploy on Vercel + Supabase — Beginner Guide

If you've never opened a terminal before, this guide is for you. I'm going to explain every term the first time it shows up, and I'm not going to assume you know what any of this means. By the end, you'll have a live website with a real database behind it, and you'll understand — not just copy-paste — what you did.

This is the pairing I point beginners to first, and I want to be upfront about why: I only recommend guides like this when I've actually checked that the two services work together without a fight. Vercel (which hosts your site) and Supabase (which hosts your database) are designed by different companies, but they talk to each other through one line of text called a "connection string." You copy that line from Supabase and paste it into Vercel, and that's most of the integration work, done. Here's the short version of why that works, before I walk through it in full further down:

- Vercel only needs a URL and a connection string from Supabase — nothing more exotic than that.
- Both services publish an official integration that copies those values over automatically.
- Neither side requires custom code to talk to the other; it's copy-paste, not engineering.

## First, the vocabulary

Before anything else, a few words you'll see over and over:

- **Terminal**: a text-based window on your computer where you type commands instead of clicking buttons. On a Mac it's called Terminal (in Applications > Utilities). On Windows it's usually PowerShell or the one built into VS Code. You'll type short commands here and press Enter to run them.
- **Environment variable**: a named piece of secret or configuration text (like a password or a web address) that your app reads while it's running, instead of that text being written directly into your code. This matters because you never want passwords sitting in a file that gets shared publicly.
- **Database**: a structured place to store your app's information — user accounts, blog posts, orders, whatever your site needs to remember. "Postgres" (also written PostgreSQL) is a specific, extremely popular, free and open-source type of database. Supabase gives you a real Postgres database, not a toy version.
- **DNS / domain record**: DNS is the phonebook of the internet — it translates a human-readable address like `yoursite.com` into the numeric address computers actually use. A "domain record" is one entry in that phonebook that you configure, usually through wherever you bought your domain name (Namecheap, Google Domains, etc.).
- **Repository (repo)**: a folder of your project's code that's tracked by a tool called Git, usually hosted on GitHub. Vercel watches your GitHub repo and redeploys your site automatically every time you save (or "push") a change.

## What this pairing actually costs

> **[📸 SCREENSHOT PLACEHOLDER]** — Vercel pricing page (vercel.com/pricing) and Supabase pricing page (supabase.com/pricing), side by side
>
> _Replace this callout with the real screenshots before publishing._

Here's the honest, current breakdown, re-verified this month:

**Vercel Hobby (free)**:
- 100GB of bandwidth per month (bandwidth is the total size of everything your site sends to visitors' browsers)
- 1 million "edge requests"
- 1 million function calls
- 100 build minutes
- The catch: Hobby is explicitly for personal, non-commercial projects only. If you're planning to sell anything or run a business on it, Vercel's terms require Pro.

**Vercel Pro**:
- $20 per month per person on your team, which includes a $20 credit toward usage
- 1TB of bandwidth included
- $0.15 per extra gigabyte beyond that, billed against the credit and then out of pocket after

**Supabase Free**:
- 500MB of database storage
- Up to 50,000 monthly active users
- 1GB of file storage
- 5GB of data transfer
- The one thing every beginner needs to know: a free Supabase project **pauses itself automatically after 7 days with no activity**. Your data isn't deleted, but your site's database goes offline until you log in and click "resume." This has surprised more than one person who built a demo, walked away for two weeks, and came back to a broken site.

**Supabase Pro**:
- Starts at $25 per month
- Removes the auto-pause entirely
- Bumps you to 8GB of database storage and 100,000 monthly active users
- Includes a $10/month credit toward compute (the server power running your database)

**Realistic total once you outgrow both free tiers**: roughly $45/month (Vercel Pro at $20 + Supabase Pro at $25).

> **🚨 Danger — read this before you launch anything publicly**
>
> Vercel's bandwidth charges are not capped by default, and this has caused real, well-documented bill shock. In 2025 and 2026, people have reported a $23,000 bill after a DDoS attack (attackers flooding a site with fake traffic) and a $1,100+ bill from ordinary bots crawling a site before it was even publicly announced. Bandwidth overage on Pro currently runs about $0.15/GB (roughly $40 per 100GB). Before you point a real domain at your Vercel site, go into your Vercel team settings and turn on **Spend Management** — it can email, text, and even auto-pause your project if spending crosses a limit you set. It is not turned on with a strict limit by default, so you must do this yourself.

## Why this pairing is beginner-friendly

Here's the plain-language version of why I trust this combination for someone starting from zero: Vercel needs exactly two things from Supabase to work — a web address (URL) for your project and a "connection string," which is a single long line of text that contains the location of your database plus the password to get into it, all packed into one string like a mailing address with a key taped to it. You generate that string once inside Supabase, copy it, and paste it into a settings box inside Vercel. Vercel then remembers it as an environment variable (recall: a stored secret your app can read) and your website can talk to your database from then on.

Here's exactly why I trust it for a first-timer:

- Only two pieces of information ever need to move between the two services — a URL and a connection string.
- You generate both inside Supabase and paste them into Vercel once; there's no ongoing manual sync.
- An official "Supabase for Vercel" integration in Vercel's marketplace copies these values over for you automatically, so in many cases you don't even need to copy-paste manually.
- Once the environment variables are set, your site and database keep talking without you touching either dashboard again.

## Deploying it, step by step

> **[🎥 VIDEO PLACEHOLDER]** — full screen recording of every step below, start to finish
>
> _Replace this callout with the real video before publishing._

1. **Create a free GitHub account** at github.com if you don't have one, and put your website's code in a repository there. (If you're using a starter template or a tool that generates code for you, it usually offers a "push to GitHub" button.)
2. **Create a free Vercel account** at vercel.com, signing up with your GitHub account so the two are connected automatically.
3. **Import your project**: on Vercel's dashboard, click "Add New" then "Project," and select your GitHub repository. Vercel will detect what kind of site it is and suggest build settings — for most modern site generators, the defaults are correct. Click Deploy. Your site is now live at a free `.vercel.app` address.
4. **Create a free Supabase account** at supabase.com and click "New Project." Pick a name, set a database password (write this down somewhere safe — a password manager, not a sticky note), and choose a region close to your visitors.
5. **Get your connection string**: inside your new Supabase project, go to Project Settings > Database, and find "Connection string." Choose the "Transaction" pooled option (explained below) and copy it.
6. **Paste it into Vercel**: in your Vercel project, go to Settings > Environment Variables, and add a new variable named `DATABASE_URL` with the connection string as its value. Also copy your `Project URL` and `anon public` API key from Supabase's Settings > API page into two more Vercel environment variables, commonly named `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
7. **Redeploy**: back in Vercel, go to the Deployments tab and click "Redeploy" so your site picks up the new environment variables.

One term worth pausing on: Supabase offers both a "pooled" and a "direct" connection string. A pool is just a shared set of ready-made connections to the database, handed out on demand — think of it like a rental car counter instead of everyone needing to own a car.

- **Pooled connection (port 6543, "Transaction" mode)**: the one you want. Connections are borrowed briefly and handed back, which fits how Vercel works.
- **Direct connection**: a private, dedicated line to the database. Fine for a traditional always-on server, risky for Vercel.
- **Why it matters**: Vercel's hosting model creates many short-lived visits to your database rather than a few long ones. If you use the direct connection string, your database can run out of available connections under real traffic.
- **The rule**: always use the pooled connection string as your `DATABASE_URL` for a Vercel-hosted app.

> **💡 Tip — using your own domain name**
>
> Custom domains work on every Vercel plan, including the free Hobby tier. Buy a domain from any registrar (Namecheap, Google Domains, Cloudflare), then in Vercel go to Settings > Domains, add your domain, and Vercel will show you a DNS record to add at your registrar (usually an "A record" for a bare domain like `yoursite.com`, or a "CNAME record" for a subdomain like `www.yoursite.com`). DNS changes can take up to 24 hours to fully take effect worldwide, so don't panic if it's not instant.

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — the finished, live site loaded in a browser with the custom domain visible in the address bar
>
> _Replace this callout with the real screenshot before publishing._

- Connection string in Vercel uses the pooled endpoint (port 6543, "Transaction" mode), not the direct one
- Spend Management turned on in Vercel with a dollar limit you'd actually notice
- Decided whether your Supabase project needs to be on Pro so it never auto-pauses
- Custom domain added, DNS record set at your registrar, and it's loading over HTTPS (the little padlock in the browser bar)
- You've written down your database password somewhere safe, outside of any code file

## Sources

- [Vercel Hobby Plan docs](https://vercel.com/docs/plans/hobby)
- [Vercel Pricing](https://vercel.com/pricing)
- [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- [Vercel Spend Management docs](https://vercel.com/docs/spend-management)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase connection terminology explained (Supavisor)](https://supabase.com/docs/guides/troubleshooting/supavisor-and-connection-terminology-explained-9pr_ZO)
- [Supabase for Vercel marketplace integration](https://vercel.com/marketplace/supabase)
- [The $23,000 Vercel bill — UsageBox](https://usagebox.com/articles/vercel-23000-dollar-bill-usage-based-platform-bill-shock-2026)
- [Vercel bandwidth bill-shock reports, 2026 — Deploybase](https://deploybase.app/blog/vercel-bill-shock-1100-bandwidth-costs-alternatives-2026)
