---
title: "Deploy on Cloudflare Pages + D1 (Beginner)"
tagline: "The cheapest real stack here — but the one most likely to make a first-timer feel lost"
category: own-your-stack
source_platform: cloudflare-pages
target_platform: cloudflare-d1
difficulty: intermediate
level: beginner
cost_range_usd: "0-5/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Basic comfort typing commands into a terminal"
  - "Has deployed a website at least once before"
  - "Willingness to learn what a serverless function is"
  - "Basic Node.js/npm familiarity (installing packages)"
requirements:
  - "A Cloudflare account"
  - "Node.js and a terminal installed on your machine"
  - "An existing website or framework project (e.g. Next.js) to deploy"
  - "About half a day of uninterrupted setup time"
effort_hours_min: 3
effort_hours_max: 8
---

# Deploy on Cloudflare Pages + D1 (Beginner)

I want to start with the honest version of this guide, because most write-ups about Cloudflare Pages and D1 lead with the price tag and bury the catch. The price tag is real — this is close to free for a small site. But I'd be doing you a disservice if I let you believe it's the easiest way to get off a website builder and onto your own hosting. It isn't. Of the stacks I cover in this series, this one has the steepest first climb. If you've never opened a terminal before, I want you to know that going in, not discover it three steps into a tutorial that assumes you already have.

So here's the deal I'm offering you in this guide: I'll explain what makes this stack different in plain language, I'll be straight about where the friction actually lives, and I'll tell you who this is genuinely a good fit for versus who should start somewhere gentler and come back to this later.

## What Cloudflare Pages and D1 actually are

Cloudflare is a company best known for making websites load fast and stay online, and it has spent the last several years building out a full hosting platform, not just a security layer in front of other people's servers. Two pieces of that platform matter here:

- **Pages** is where your website's files live and get served to visitors. Think of it like a very fast, very well-distributed filing cabinet — when someone visits your site, Cloudflare hands them the files from whichever of its hundreds of data centers is physically closest to them.
- **D1** is Cloudflare's database product. A database is where the *changeable* parts of your site live — user accounts, blog post content if you're editing it through an admin panel, comments, orders, anything that isn't just a fixed page. D1 is built on SQLite, one of the most widely used database engines in the world (it's the thing quietly running inside your phone's apps right now). Cloudflare took that same battle-tested engine and made it run "at the edge" — meaning copies of the logic that reads your database run physically close to your visitors, all over the world, instead of in one single data center.

**Analogy, if that's still abstract:** imagine a chain of neighborhood libraries instead of one giant central library downtown.

- A regular database is the downtown library — everyone in the city has to travel there, or at least send a request there, to get a book.
- D1's approach is closer to having a small branch library in every neighborhood, each one able to answer most questions on its own. That's what "SQLite at the edge" means.

It's a genuinely different model from the single-server database most beginner tutorials assume, and that's part of why this stack feels unfamiliar even though the underlying database technology (SQLite) is actually one of the *simplest and most beginner-friendly* databases that exists.

## Why I said this isn't the easiest starting point

Here's the part most guides skip. Modern websites built with popular frameworks like Next.js expect to run on a normal server that can do anything a regular computer can do. Cloudflare's Pages and Workers platform runs your code differently — in a lightweight, sandboxed environment called an "edge runtime" that's built for speed and can't do everything a full server can do out of the box.

Two extra things have to happen before your site works here:

1. **Your website's code needs a translator.** If you're using Next.js, you can't just upload it to Cloudflare and have it work — you need a tool called `@opennextjs/cloudflare` that adapts your Next.js app to run in Cloudflare's environment. It's actively maintained and has matured a lot, but it's still an extra moving part, and extra moving parts are exactly what beginners find hardest to debug when something breaks.
2. **Your database isn't reachable directly from your web pages.** You can't just point a static page at D1 and ask it for data. You need something called a "Pages Function" — a small piece of server-side code that sits between your visitor and your database and does the asking on their behalf. If you've never written server-side code before, this is a new concept to learn, not just a new tool to install.

Neither of these is exotic once you've done it once. But "once you've done it once" is doing a lot of work in that sentence, and if this is your very first deploy, I don't want you to be surprised that step one is "install an adapter" and step two is "learn what a serverless function is."

## The pairing itself is not the problem

I want to be precise about something, because it's easy to conflate two different kinds of difficulty. Cloudflare Pages and Cloudflare D1 are made by the same company, built to work together, and documented together.

**What's frictionless because they're the same vendor:**

- No awkward handshake between two competing vendors
- No API keys from one company that mysteriously don't play nice with another company's networking rules
- One dashboard, one bill, one set of docs covering both products
- That part is about as smooth as pairings get in this series

**What to actually expect a learning curve on — none of it is "Pages and D1 don't get along":**

- Adjusting to the edge-runtime model itself, which asks more of you than a traditional server does
- Installing and configuring the `@opennextjs/cloudflare` adapter if you're on Next.js
- Learning what a Pages Function is and why your database needs one to be reachable at all
- Debugging in an environment that doesn't behave like a normal Node server when something goes wrong

Same-vendor pairing, real adoption curve. Those are two different statements, and only the second one is true here.

## What it costs

> **[📸 SCREENSHOT PLACEHOLDER]** — the Cloudflare pricing page for Workers/Pages and D1
>
> _Replace this callout with the real screenshot before publishing._

The reason people put up with the learning curve is the price. Cloudflare doesn't charge for bandwidth at all — visitors reading your site, downloading images, whatever — no matter how popular you get, on any plan. Most hosts charge you more as your site gets more traffic; Cloudflare doesn't, for bandwidth specifically.

- **Pages, free:** 500 site builds a month, one build running at a time, up to 100 custom domains, unlimited visitor bandwidth
- **D1, free:** 5 million database "row reads" per day, 100,000 "row writes" per day, and 5 GB of storage — reset every day at midnight UTC
- **If you outgrow free:** a single $5/month plan (called Workers Paid) raises Pages to 5,000 builds a month and raises D1 to 25 billion row reads and 50 million row writes included per month
- **No charge, ever, for moving data out of D1** — some database providers charge you to leave; Cloudflare doesn't

For almost any personal site, blog, or small business site, you will not come close to the free tier's daily limits. Five million row reads a day is a lot — it would take a genuinely busy site to bump into that ceiling.

## Who this is actually right for

**Go ahead with this stack if:**

- You've deployed a website before, even once
- You're comfortable following a checklist that includes typing commands into a terminal
- You're willing to spend roughly half a day on setup friction in exchange for a very good long-term deal

**Try a friendlier stack first if:**

- You've genuinely never opened a terminal or run a deploy command
- Server-side code, environment variables, and command-line tools would all be new to you at once
- You'd rather get one deploy under your belt somewhere gentler before tackling an edge runtime

Come back to this guide once "terminal" and "deploy" aren't scary words anymore. Cloudflare will still be cheap next month.

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — the final live site after deploy
>
> _Replace this callout with the real screenshot before publishing._

- You (or whoever is helping you) have Node.js and a terminal you're willing to type into
- The `@opennextjs/cloudflare` adapter (or equivalent for your framework) is installed and documented in your project
- A Pages Function exists and successfully reads from your D1 database — test this before you consider the migration done
- Your custom domain is connected and shows the padlock (secure connection) in the browser

## Sources

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)
- [D1 import and export data](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [Next.js on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [OpenNext Cloudflare adapter — get started](https://opennext.js.org/cloudflare/get-started)
- [@opennextjs/cloudflare on npm](https://www.npmjs.com/package/@opennextjs/cloudflare)
- [Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
