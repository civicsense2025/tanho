---
title: "Deploy on Netlify + Supabase (Beginner)"
tagline: "A Netlify-first path to a live site with a real Postgres database — explained from zero"
category: own-your-stack
source_platform: netlify
target_platform: supabase
difficulty: beginner
level: beginner
cost_range_usd: "0-45/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Comfortable creating online accounts and following step-by-step instructions"
  - "Willingness to open a terminal for the first time (fully explained in guide)"
  - "Basic copy-and-paste skills"
requirements:
  - "A GitHub account with your website's code in a repository"
  - "A free Netlify account"
  - "A free Supabase account with a database password saved somewhere safe"
  - "Optional: a purchased domain name if you want a custom URL"
effort_hours_min: 1
effort_hours_max: 3
---

# Deploy on Netlify + Supabase — Beginner Guide

If you've never opened a terminal before, this guide is for you. I'm going to explain every term the first time it shows up, and I'm not going to assume you know what any of this means. By the end, you'll have a live website with a real database behind it, and you'll understand what you did, not just copy-pasted it.

I recommend this pairing for people who like Netlify's specific workflow — its build interface, its forms feature, its long history as one of the original "git push to deploy" hosts. If you've already decided you want Netlify rather than Vercel, this guide gets you to a working database without a fight. I checked that carefully before writing this, because this whole site exists to help people move to their own stack — and a migration guide is worthless if the destination secretly doesn't work.

## First, the vocabulary

A few words you'll see over and over:

- **Terminal**: a text-based window on your computer where you type commands instead of clicking buttons. On a Mac it's called Terminal (in Applications > Utilities). On Windows it's usually PowerShell or the one built into VS Code.
- **Environment variable**: a named piece of secret or configuration text (like a password or a web address) that your app reads while it's running, instead of that text being written directly into your code. This keeps passwords out of files that might get shared publicly.
- **Database**: a structured place to store your app's information — user accounts, blog posts, orders, whatever your site needs to remember. "Postgres" (also written PostgreSQL) is a specific, extremely popular, free and open-source type of database. Supabase gives you a real Postgres database, not a toy version.
- **Serverless function**: a small piece of backend code that runs only when it's needed — someone submits a form, loads a page that needs live data — rather than a server sitting on all day waiting. Netlify calls these "Netlify Functions," and they're the piece that will talk to your database on your behalf, since your database password should never live in code the browser can see.
- **DNS / domain record**: DNS is the phonebook of the internet — it translates a human-readable address like `yoursite.com` into the numeric address computers actually use. A "domain record" is one entry in that phonebook, usually configured wherever you bought your domain (Namecheap, Cloudflare, etc.).
- **Repository (repo)**: a folder of your project's code tracked by a tool called Git, usually hosted on GitHub. Netlify watches your GitHub repo and redeploys your site automatically every time you save (or "push") a change.

## What this pairing actually costs

> **[📸 SCREENSHOT PLACEHOLDER]** — Netlify pricing page (netlify.com/pricing) and Supabase pricing page (supabase.com/pricing), side by side
>
> _Replace this callout with the real screenshots before publishing._

Netlify switched to a credit-based pricing model in late 2025 (refined again in April 2026), which is different enough from a simple "GB included" number that it's worth explaining plainly. Here's what each tier actually gives you:

- **Netlify Free** — $0/month
  - 300 credits per month
  - One site build running at a time
  - Credits get spent on bandwidth (20 credits per GB), web traffic (2 credits per 10,000 requests), function usage, and each production deploy (15 credits)
  - Hard limit, **no way to buy more credits** — run out, and your site pauses (more on this below)
- **Netlify Pro** — $20/month flat
  - Unlimited team members as of an April 2026 pricing change
  - 3,000 credits per month
  - Three builds running at once
  - Option to buy more credits ($10 for 1,500) if you turn on auto-recharge
- **Supabase Free** — $0/month
  - 500MB of database storage
  - Up to 50,000 monthly active users
  - 1GB of file storage
  - 5GB of data transfer
  - **Pauses itself automatically after 7 days with no activity** — your data isn't deleted, but your database goes offline until you log in and click "resume"
- **Supabase Pro** — starts at $25/month
  - Removes the auto-pause
  - 8GB of database storage
  - 100,000 monthly active users
  - $10/month credit toward compute
- **Realistic total once you outgrow both free tiers**: roughly $45/month (Netlify Pro at $20 + Supabase Pro at $25)

> **🚨 The single most important thing to know before you launch**
>
> Netlify's free plan does not let a busy month turn into a surprise bill the way some competitors do — but it protects itself in a way that can surprise you instead. Here's the contrast that matters most before you commit to either platform:
>
> - **Netlify's failure mode is a pause, not a bill.** If your site (or any site on the same account) uses up its 300 monthly credits, **Netlify pauses every site on that account**, not just the one that went over. Visitors to any of your Netlify-hosted sites will see a "Site not available" page until the next billing cycle starts or you upgrade.
> - **Vercel's failure mode is the opposite.** Its paid Pro plan lets bandwidth run up an open-ended bill unless you turn on spending caps yourself.
> - **Neither is strictly "safer"** — one risks your wallet, the other risks your uptime — but you should know which risk you're accepting before you pick a platform.
> - **If you have more than one project on a single free Netlify account**, treat that as a real reason to consider Personal ($9/mo) or Pro sooner rather than later, since one project's spike takes all of them offline.

## Why this pairing works without a fight

Netlify has an official Supabase integration you install from Netlify's Extensions page. Once it's connected — through a one-time login (called OAuth) between your Netlify account and your Supabase account — Netlify automatically creates three environment variables for you, with no manual copy-pasting of a connection string (a single line of text containing your database's address plus the password to get into it):

- `SUPABASE_DATABASE_URL` — the address your app uses to reach the database
- `SUPABASE_ANON_KEY` — a public key safe to use in browser-facing code, scoped by your database's security rules
- `SUPABASE_SERVICE_ROLE_KEY` — a private, all-access key that must only ever be used in server-side code, never in anything sent to a visitor's browser

This is exactly the kind of frictionless handoff a migration guide should confirm before recommending anything, and Netlify + Supabase clears that bar.

## Deploying it, step by step

> **[🎥 VIDEO PLACEHOLDER]** — full screen recording of every step below, start to finish
>
> _Replace this callout with the real video before publishing._

1. **Create a free GitHub account** at github.com if you don't have one, and put your website's code in a repository there.
2. **Create a free Netlify account** at netlify.com, signing up with your GitHub account so the two are connected automatically.
3. **Import your project**: from Netlify's dashboard, click "Add new site" then "Import an existing project," and pick your GitHub repository. Netlify will detect your framework and suggest build settings. Click Deploy. Your site is now live at a free `.netlify.app` address.
4. **Create a free Supabase account** at supabase.com and click "New Project." Pick a name, set a database password (write it down somewhere safe, like a password manager), and choose a region close to your visitors.
5. **Install the Supabase extension**: in Netlify, go to your team's Extensions page, search "Supabase," and click Install.
6. **Connect the two**: from your site's settings, go to Project configuration > General > Supabase, click Connect, and authorize Netlify to access your Supabase account. Pick your project and your framework (Next.js, Nuxt, plain JavaScript, etc.), and Netlify fills in the right environment variables for you.
7. **Redeploy**: trigger a new deploy so your site picks up the new environment variables.

> **💡 Tip — using your own domain name**
>
> Custom domains work on every Netlify plan, including Free. Buy a domain from any registrar, then in Netlify go to Domain settings, add your domain, and Netlify shows you a DNS record to add at your registrar (usually an "A record" for a bare domain like `yoursite.com`, or a "CNAME record" for `www.yoursite.com`). DNS changes can take up to 24 hours to fully take effect.

One term worth understanding early: Supabase offers a "pooled" and a "direct" connection to your database. A pool is a shared set of ready-made connections handed out on demand — like a rental car counter instead of everyone owning a car. Here's why that matters for this pairing specifically:

- Netlify Functions are serverless, meaning many short-lived visits to your database happen instead of one long one
- That pattern needs the **pooled** connection string, not the **direct** one, once you get past basic prototyping
- The auto-wired `SUPABASE_DATABASE_URL` from the extension handles this correctly by default for most setups, so most beginners never have to think about it further

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — the finished, live site loaded in a browser with the custom domain visible in the address bar
>
> _Replace this callout with the real screenshot before publishing._

- Supabase extension installed and connected through Netlify's Extensions page, not hand-typed environment variables
- You understand that going over Netlify's free credit limit pauses your *entire* account, not just one site
- Decided whether your Supabase project needs Pro so it never auto-pauses after 7 days
- Custom domain added, DNS record set at your registrar, and it's loading over HTTPS (the padlock icon)
- Database password written down somewhere safe, outside of any code file

## Sources

- [Netlify Pricing](https://www.netlify.com/pricing/)
- [Credit-based pricing plans — Netlify Docs](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [What happens if a free plan exceeds bandwidth and/or build minutes limit — Netlify Support Forums](https://answers.netlify.com/t/what-happens-if-a-free-plan-exceeds-bandwidth-and-or-build-minutes-limit/16244)
- [Free Plan Usage Limit Website Suspension — Netlify Support Forums](https://answers.netlify.com/t/free-plan-usage-limit-website-suspension/145978)
- [Supabase integration — Netlify Docs](https://docs.netlify.com/extend/install-and-use/setup-guides/supabase-integration/)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supavisor and connection terminology explained — Supabase Docs](https://supabase.com/docs/guides/troubleshooting/supavisor-and-connection-terminology-explained-9pr_ZO)
- [Netlify pricing updates, April 2026 — Netlify Changelog](https://www.netlify.com/changelog/2026-04-14-pricing-updates-april-2026/)
