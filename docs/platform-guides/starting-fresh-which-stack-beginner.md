---
title: "Starting from scratch? Here's the stack I'd pick (Beginner)"
tagline: "A decision framework for new entrepreneurs and creatives with no existing site to migrate"
category: own-your-stack
level: beginner
difficulty: beginner
cost_range_usd: "0-45/mo"
tags: ["platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Can honestly assess your own comfort level with writing code"
  - "No coding experience required to use this guide"
  - "Basic web literacy — knowing what hosting and a website are"
requirements:
  - "A rough idea of whether your project needs user accounts or a database"
  - "A sense of your realistic budget once the project has real users, not just launch week"
  - "20-30 minutes to work through the three questions and read your matched section"
effort_hours_min: 0.5
effort_hours_max: 1
---

# Starting from scratch? Here's the stack I'd pick (Beginner)

If you've never deployed anything before — no GitHub account, no idea what "hosting" even means beyond "the thing that makes my website show up" — this guide is for you. Everything else in this hub is about getting *out* of a platform that's boxed you in. You get to skip that problem entirely, because you haven't picked anything yet. The only job right now is to not lock yourself into a corner on day one.

I'm going to walk you through this the way I'd walk a friend through it over coffee: a few honest questions, then a clear answer for each path.

## Three questions before you pick anything

Ask yourself these in order. Your answers point you straight to a section below.

1. **Can you write any code at all?** Be honest — not "I could probably learn," but "have I ever edited a line of HTML, CSS, or JavaScript and had it do something."
   - Genuinely no, and you don't want that to be your first project: skip to "If you can't write code at all."
   - You've poked at code before, even just tutorials, or you're willing to follow a guided setup: skip to "If you can write basic code and your budget is tight."
   - There's no wrong answer here. Plenty of successful founders and creatives never write code, and plenty of technical products get built by people who taught themselves as they went. The point of asking is that it changes which tools make sense for you right now, not which tools are "better."
2. **What's your real monthly budget once you have actual users?** Not your launch-week budget — your budget six months from now, when (hopefully) people are actually using the thing.
   - A lot of tools look free or cheap on day one and then surprise you once traffic or data grows. I'll flag where that risk is real below.
3. **Do you need a database on day one?** A database is what you need if:
   - People create accounts
   - People place orders
   - People save preferences
   - People generate any content of their own
   - If your site is pure marketing — a homepage, some pages about what you do, a contact form — you don't need one yet, and that changes your options a lot.

## If you can't write code at all

Read the <a href='/guides/should-you-use-webflow'>Webflow evaluation</a> first. Of the visual, no-code builders, it's the one with a real API and a genuine content database (Webflow calls it a "CMS," short for Content Management System) underneath the design. That matters because it means you're not painted into a corner later if your project grows and you want custom functionality, a real login system, or an actual application instead of just pages.

- **Webflow** — free "Starter" plan lets you try the whole editor before paying anything, though it caps you at a couple of pages and a webflow.io address rather than your own domain.
- **Squarespace** — read the <a href='/guides/should-you-use-squarespace'>Squarespace evaluation</a> before you commit. It's a perfectly fine choice for a simple marketing page you're comfortable rebuilding from scratch in a year or two. The caveat, and it's a real one:
  - Squarespace doesn't give you a clean way to get your content back out in a reusable format if you ever want to leave.
  - You can export a basic content dump, but your actual page designs and layouts don't travel with you.
  - Webflow's export story, while still imperfect, is meaningfully better for anyone who thinks they might outgrow their starting point.
  - That's the whole reason I point beginners toward Webflow over Squarespace when the project has any chance of becoming more than a static page.
- **Substack or beehiiv** — if you're planning to write regularly (a newsletter, essays, commentary) rather than build a marketing site, that's a different animal entirely. Read the <a href='/guides/should-you-use-substack'>Substack evaluation</a> or the <a href='/guides/should-you-use-beehiiv'>beehiiv evaluation</a> instead; those platforms are built around email distribution and audience ownership in a way Webflow and Squarespace aren't.

## If you can write basic code and your budget is tight

Good news: this is the easiest on-ramp in the entire guide. Start on <a href='/guides/deploy-on-vercel-and-supabase'>Vercel + Supabase</a> or <a href='/guides/deploy-on-cloudflare-pages-and-d1'>Cloudflare Pages + D1</a>. Both let you build and launch a complete small project — including a real database — without spending a dollar, and both have communities and tutorials specifically aimed at first-timers.

**Vercel + Supabase, free tier:**
- 100GB of monthly bandwidth
- A million function calls
- Automatic deployment every time you push code
- Explicitly for non-commercial projects only — the moment your site makes money, Vercel expects you to upgrade to a paid seat
- Supabase pairs in with a 500MB database, real user accounts and login built in, and a generous free allotment of API calls
- Everything a first product needs, at zero cost, until you have real traction

**Cloudflare Pages + D1, free tier:**
- Tens of millions of database reads a day at no cost
- No bandwidth charges at all, ever, on any plan
- Tradeoff: Cloudflare's programming model (called "Workers") is a little less like traditional web development and has a slightly steeper learning curve than Vercel's more familiar setup

So which do you pick between the two? If you're brand new to code, I'd lean Vercel + Supabase first; if you're a little more adventurous or you specifically hate the idea of a future bandwidth bill, Cloudflare is worth the extra initial friction.

A few of the newer platforms other guides in this hub cover — Render, Fly.io, and Netlify — are also viable beginner starting points in specific situations:

- **Render** — free tier similar in spirit to Vercel's.
- **Netlify** — also has a free tier similar to Vercel's, and is a very close cousin to Vercel (same basic idea: push code, get a live site).
- **Fly.io** — the exception. It removed its free tier and expects you to pay something from day one, which makes it a poor first stop for a true beginner on a zero-dollar budget.

I'd still point a first-timer to Vercel or Cloudflare before any of these three, simply because more tutorials and community support exist for them right now.

## If you're building something with real users and money moving through it

If you already know — not guess, know — that you're building something with paying customers, sensitive data, or a real launch date, this is genuinely more than a beginner decision, and I'd point you to the <a href='/guides/starting-fresh-which-stack-intermediate'>intermediate version of this guide</a> instead. It covers DigitalOcean, Render, and Vercel + Neon in the depth that decision deserves.

> **⚠️ Warning — Skip Hetzner and self-hosted Postgres for now**
>
> If you're reading a beginner guide, you're not the audience for full self-hosting yet. Running your own server means you're responsible for security updates, backups, and uptime — real skills that take time to learn. Come back to it once a managed database bill has actually gotten expensive enough to justify the ops work. Trying to learn server administration and build your first product at the same time is how both get done badly.

## The one rule that matters more than the stack

> **💡 Tip — Export first, choose second**
>
> Whatever you pick, before you build anything real, confirm you can get your own data back out in a usable format — a real file you could open elsewhere, not a locked proprietary export only that one platform understands. This is the whole ethos of this project: own your site, avoid getting trapped, and always know your exit before you need it. Every guide in this hub exists because someone didn't check that first. Don't be the next one.

## Sources

- [Vercel Pricing](https://vercel.com/pricing) — Hobby plan limits and non-commercial terms
- [Vercel Hobby Plan docs](https://vercel.com/docs/plans/hobby) — bandwidth, function invocation, and build minute allowances
- [Cloudflare D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/) — free tier read/write/storage limits
- [Cloudflare Workers & Pages Pricing](https://www.cloudflare.com/plans/developer-platform/) — no-bandwidth-charge policy
- [Fly.io Pricing](https://fly.io/pricing/) — confirms removal of permanent free tier
