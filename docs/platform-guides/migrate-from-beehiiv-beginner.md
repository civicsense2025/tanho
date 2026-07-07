---
title: "Migrate off beehiiv (Beginner Guide)"
tagline: "Moving your newsletter and subscribers to a platform you actually own"
category: own-your-stack
source_platform: beehiiv
difficulty: beginner
cost_range_usd: "0-100/mo"
tags: ["newsletter", "migration"]
level: beginner
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Comfortable navigating platform admin/settings menus and CSV exports"
  - "Can generate an API key and paste it into another platform's settings"
  - "Can install and configure a WordPress import plugin like WP All Import"
  - "Can verify or cancel a Stripe subscription to avoid double-billing"
  - "Optional: basic coding ability, only for the custom-API-script path"
requirements:
  - "A beehiiv account with export access (Settings, Export Data) or an API key"
  - "A chosen destination: Ghost, WordPress, a custom app, or Own Your Site"
  - "Your beehiiv-connected Stripe account, to verify/cancel billing after migrating paid subscribers"
  - "A developer to hire, if attempting the custom-API-script path without coding experience"
  - "A backup CSV export of your subscriber list saved locally before starting"
effort_hours_min: 3
effort_hours_max: 8
---

# Migrate off beehiiv (Beginner Guide)

You've decided beehiiv isn't where you want to stay — maybe it's the pricing as your list grows, maybe it's wanting more control over your site, maybe it's just wanting to know you can leave any platform whenever you want. This guide walks through the actual mechanics of moving your beehiiv newsletter somewhere else, in plain language, with every term explained the first time it shows up. I already covered whether beehiiv is worth using in the first place in my separate evaluation guide — this one assumes you've made the decision and just want to know how to execute it.

## First, the vocabulary

A few words that will come up a lot:

- **Export**: downloading a copy of your own data (posts, subscriber emails, etc.) out of a platform, usually as a file you save to your computer.
- **CSV file**: "comma-separated values" — the plainest possible spreadsheet format. Every newsletter platform, email tool, and CRM can open a CSV, which makes it the universal hand-off format for subscriber lists.
- **Importer**: a tool on the *destination* platform that reads an export file and recreates your content or subscribers there.
- **API**: "application programming interface" — a way for one piece of software to ask another piece of software for data automatically, without a human clicking through menus. beehiiv has a real one; that matters later in this guide.
- **Deliverability**: whether your emails actually land in inboxes instead of spam folders. This is the single biggest hidden risk in any newsletter migration, and I'll explain why below.

## Where you can move a beehiiv newsletter

There isn't one single "correct" destination. I evaluate four realistic paths, and which one fits you depends on how technical you are and what you want your new site to look like:

- **Self-hosted Ghost** — an open-source publishing platform you run yourself (or pay a host to run for you). Ghost happens to have a genuinely first-party migration path for beehiiv specifically, which I'll get into below.
- **Self-hosted WordPress** — the world's most common website software, open-source, endlessly extensible with plugins.
- **A custom app** — your own website and database, built to your own spec, pulling data straight out of beehiiv's API.
- **Own Your Site (OYS)** — the platform this guide lives on, which has a built-in content importer system and its own honest limitations for beehiiv specifically, covered below.

## What actually needs to move

Every newsletter migration is really three separate jobs, and it helps to think of them separately because they don't move at the same speed or with the same tools:

- **Your post content** — the actual newsletters you've written.
- **Your subscriber list** — the email addresses of people who signed up, free and paid.
- **Your paid billing relationship** — if you charge for subscriptions, the Stripe (or other payment processor) connection tied to each paying subscriber.

Content is usually the easiest of the three. Free subscribers are next-easiest — it's a CSV export and a CSV import in most cases. Paid billing is the hardest, and I'll explain exactly why in a moment.

> **[📸 SCREENSHOT PLACEHOLDER]** — beehiiv's Settings → Export Data screen showing "Export All Posts" and "Export All Basic Subscribers"
>
> _Replace this callout with the real screenshot before publishing._

## Ghost: the most turnkey path for beehiiv specifically

Of the three self-hosted-style destinations, Ghost is the one with the most complete built-in tooling for beehiiv, and it's worth knowing this exists before you assume everything requires manual work:

- Ghost Admin has a dedicated beehiiv migrator, found under **Settings → Advanced → Import/Export**.
- You paste in a beehiiv API key (generated inside your beehiiv account), pick which beehiiv site to pull from, and choose whether to bring over posts, subscribers, or both.
- Ghost shows you a count of what it found before you commit — nothing happens until you approve it.
- After that one click, both your posts and your free/confirmed subscriber records land inside Ghost.

The one thing this tool does **not** do is move paid, billing subscribers automatically. beehiiv's Stripe (payment processor) connection is tied to beehiiv's own account — it can't just be handed to Ghost. If you have paying subscribers, that's a separate, manual step: you (or a developer) move the underlying Stripe customer records from the beehiiv-connected Stripe account to a new one connected to Ghost. For a small newsletter with a handful of paying readers, this is manageable by hand. I cover the mechanics in more depth in the intermediate and expert versions of this guide.

## WordPress: the honest gap

WordPress does not have a dedicated "beehiiv importer" the way Ghost does. This is a real gap, not something I'm going to paper over. The realistic path today:

- Export your posts and your subscribers from beehiiv as CSV files (Settings → Export Data).
- Use a general-purpose WordPress import plugin — the one people actually use for this is called WP All Import — to map beehiiv's CSV columns onto WordPress fields.
- Because beehiiv's exported post HTML includes newsletter-specific markup (author photos, "view online" links, tracking pixels), you'll need to clean that up, either by hand for a handful of posts or with a small custom script if you have dozens or hundreds.
- Your subscriber list moves the same CSV-to-plugin way, but WordPress on its own isn't an email-sending tool — you'll pair it with a separate newsletter plugin or an outside email service to actually send.

If you're comfortable with WordPress plugins already, this is doable. If you're brand new to WordPress, budget more time for this path than for Ghost.

## A custom app: the cleanest path, if you can build it

Here's a fact that surprised me when I researched beehiiv for the evaluation guide: beehiiv has a real, well-documented developer API. That actually makes a custom-built destination the *most* reliable option for moving beehiiv data specifically — more reliable, in some ways, than trying to force it into Ghost's or WordPress's import formats. A script can ask beehiiv's API directly for every post and every subscriber and write them straight into your own database, in whatever shape you want. This requires someone who can write code (or hire someone who can), so it's not a beginner-friendly path by itself — but if you're already planning to build a custom site, this is genuinely the strongest option for beehiiv content. I walk through what that script needs to handle in the expert version of this guide, and I cover hosting a custom app (once you have one) in my separate Vercel + Supabase deploy guide.

## Own Your Site: what's real today

I want to be straight with you about OYS's own capabilities here, since this platform is one of the four destination options:

- OYS has a built-in importer system for several platforms — Ghost, WordPress, Squarespace, Substack, Medium, generic RSS feeds, and Markdown ZIP files.
- **There is no dedicated beehiiv importer today.** This is a real, honest limitation, not a rounding error.
- The most workable paths on OYS right now: (1) if your beehiiv RSS feed is configured to include full article text rather than just a summary, OYS's generic RSS importer can pull your post content that way — but this only gets you content, not your subscriber list; (2) beehiiv's CSV export can be reshaped into the format OYS's Markdown ZIP importer expects, which needs a small conversion step; (3) for a very small newsletter, copying posts in by hand is genuinely reasonable.
- OYS also has a generic bulk redirect tool (Admin → Growth → SEO → Bulk redirects) for pointing old beehiiv URLs at their new home once your content has moved, whichever destination you pick.

Of the destinations in this guide, beehiiv is the least turnkey to move into OYS today. I'd rather tell you that plainly than pretend a dedicated importer exists.

## Why list size changes everything

The size of your newsletter changes which of these problems actually matter to you:

- **Small (under 2,500 subscribers, beehiiv's free-tier ceiling)**: a missing dedicated importer is a minor inconvenience. You can realistically hand-copy posts or run one small CSV conversion in an afternoon.
- **Medium (a few thousand subscribers, on beehiiv's paid Scale plan)**: you likely have some paid revenue now, so the Stripe billing transfer becomes a real, careful task rather than a footnote. Budget a dedicated block of time for it and don't rush it.
- **Large (50,000+ subscribers, meaningful paid revenue)**: the missing importer stops being an inconvenience and becomes an actual engineering project — someone needs to script against beehiiv's API or carefully orchestrate a plugin-based bulk import, and the billing transfer needs a real double-billing safeguard (more below).

## Two risks every newsletter migration shares

Regardless of which destination you pick, two things deserve real attention:

- **Email deliverability warm-up**: your new sending system (Ghost's email, a WordPress newsletter plugin, or your own custom sender) hasn't built up a sending reputation yet. Mailbox providers like Gmail watch for sudden bursts of email from a new sender and can route it to spam. Ramp up gradually rather than blasting your full list on day one — send to a small segment first, then expand over days or weeks.
- **Paid subscriber double-billing**: if you don't cancel or pause billing on the beehiiv/Stripe side after moving a paying subscriber to your new system, that person can get charged twice. This is a manual step on every migration path in this guide — none of them automate it for you. Treat it as a checklist item, not an afterthought.

> **🚨 Danger — don't skip the double-billing check**
>
> Whichever destination you choose, before you consider a paid subscriber "migrated," confirm their old beehiiv-connected Stripe subscription is actually canceled or paused. This is the single most common way newsletter migrations go wrong for anyone charging money.

## Parallel-run vs. hard cutover

You generally have two ways to switch over:

- **Parallel run**: keep sending from beehiiv while your new system is being set up and tested, then switch your "send" button over once you trust it. Safer, especially for paid newsletters, but means double-checking you don't send the same issue twice.
- **Hard cutover**: pick a day, move everything, and start sending exclusively from the new system. Faster, but riskier if something in the new setup isn't quite right yet.

For a small, free newsletter, a hard cutover on a quiet week is usually fine. For anything with paying subscribers, I'd lean toward a short parallel run so you can verify billing actually transferred before you turn off the old system.

## Data governance by destination

"Data governance" is a fancy way of asking one question: who actually controls your stuff, and what happens if the company behind your tool changes its mind, changes its prices, or goes away? Here's how the four destinations in this guide stack up:

| Destination | Who controls the server and database | Is a vendor still in the loop? | How easy is ongoing backup/export? | Can you read the platform's own code? |
|---|---|---|---|---|
| **Own Your Site (OYS)** | You. It's licensed software you install on a server you choose — there's no OYS-run server holding your content hostage. | No platform account to get locked out of, though you still depend on whoever hosts your server and on OYS's license terms for future updates. | Yes — it's your database, so normal backup habits apply. | No. OYS is licensed, not open-source — you can run it, but you can't read the underlying code. |
| **Self-hosted Ghost** | You, once it's deployed on a server you manage or pay someone to manage. | Only if you choose a managed Ghost host instead of self-hosting — true self-hosting has no vendor in the loop. | Yes — Ghost has a built-in export button plus direct database access. | Yes. Ghost's entire codebase is open-source (MIT license) — anyone can read it. |
| **Self-hosted WordPress** | You, on whatever server you pick. | Only your hosting company, and only if you choose a locked-down one. | Yes — WordPress has native export tools and direct database access, and it's about as easy to back up as software gets. | Yes. WordPress is open-source (GPL license) and one of the most-audited codebases in the world just from sheer number of people using it. |
| **A custom app** | You, completely — you pick the server and the database. | Only whatever you add on purpose (like a managed database service). | Depends entirely on how you built it, but a basic backup routine is simple to set up. | Yes — it's your own code. |

The plain-language takeaway: OYS, Ghost, WordPress, and a custom app are all "you control the server" destinations — that's the whole point of leaving beehiiv. The difference is that Ghost and WordPress let you read their code, while OYS is licensed software you can't personally inspect. None of that changes who owns your database once it's running — it changes how much you can verify about the software managing it.

## Managed cloud vs. renting your own server: the real tradeoff

If you land on the custom-app path (or even self-hosted Ghost/WordPress), you'll eventually pick between two very different ways to actually run your server. This choice matters as much as which CMS you pick:

| | Managed/cloud platforms (Vercel, Netlify, Railway) | Renting your own VPS (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| Who patches security updates | The platform does it for you, automatically | You do — it's your operating system, your job |
| Who's on call if it goes down | The platform's support/status page | You are, unless you hire someone |
| Cost predictability | Can surprise you — usage-based pricing scales with traffic | Fixed monthly price no matter how much traffic you get |
| Data portability | Good, but you're still working inside their deploy system | Total — it's a plain server, move it anywhere |
| Technical skill required | Low — mostly point-and-click and `git push` | Higher — you're the system administrator |

In plain terms: managed platforms trade money and a small amount of vendor dependence for convenience. Renting your own server trades convenience for full control and a fixed bill, but it makes you responsible for things a managed platform used to handle invisibly — security patches, uptime monitoring, backups. I cover the fully-managed route in my Vercel + Supabase deploy guide, and the rent-your-own-server route in my Hetzner self-hosted Postgres deploy guide, if you want the step-by-step for either.

For most people doing a beehiiv migration into a custom app for the first time, I'd lean toward a managed platform — you have enough new things to learn already without also becoming a Linux system administrator. Self-hosting a VPS makes more sense once you already know you want that control and have done it before.

## Who this migration isn't for

I want to be completely honest here, not just reassuring. Some of what's described in this guide requires real technical skill, and beehiiv makes that more true than most platforms, because beehiiv has no dedicated importer into either OYS or WordPress — the strongest path into either of those is scripting against beehiiv's API, and that requires someone who can write and run code.

This migration probably isn't a good fit for you right now if:

- **You've never written or run a script, and don't have anyone to ask.** The custom-API-script path in this guide is not something you can complete by copy-pasting instructions — it requires actual programming ability. No skill level of this guide changes that fact; it's true whether you're reading the beginner, intermediate, or expert version.
- **You have paying subscribers and no one to double-check the Stripe transfer.** Billing mistakes cost real money and trust. If you can't verify a Stripe transfer yourself and don't have someone who can, get help before you touch billing.
- **Your newsletter is large (tens of thousands of subscribers) and you're doing this entirely alone.** At that size, a manual mistake affects a lot of people at once, and the margin for error shrinks.
- **You need this done immediately, with zero downtime, and no one to test it first.** Every migration path here benefits from a parallel run or a dry run. If you don't have time for that, you're taking on avoidable risk.

If any of that describes you, you have two honest options, and both are legitimate:

1. **Move to Ghost instead, and use its dedicated beehiiv importer.** This is the one destination in this guide with a real "point it at beehiiv and click" tool — it needs an API key you generate from your beehiiv account, not code you write. It is by far the lowest-skill path in this entire guide.
2. **Hire someone.** A freelance developer can run the custom-API-script path in a few hours for a small-to-medium newsletter. Paying for a few hours of someone else's time is a completely reasonable choice, and often cheaper than the time you'd spend learning to code from scratch just for this one task.

There's no shame in either choice. This guide describes what's technically possible, not what everyone should personally do themselves.

## My verdict

> **💡 Tip — where I land**
>
> If you're moving off beehiiv and you're not deeply technical, Ghost is the path of least resistance today because of its dedicated beehiiv migrator — it's the only destination in this guide with a real, built-in "point it at beehiiv" button. WordPress and OYS both require more manual work right now because neither has a dedicated beehiiv connector. If you're planning to build something fully custom anyway, don't overlook that beehiiv's API is genuinely good — that's the cleanest long-term path for beehiiv content specifically, even though it takes more effort up front. Whatever you pick, keep a fresh CSV export of your subscribers sitting on your own computer before you start — it costs a few minutes and it's your safety net if anything goes sideways mid-move.

## Sources

- [How to migrate from Ghost to beehiiv — beehiiv Help](https://www.beehiiv.com/support/article/36458339256727-how-to-migrate-from-ghost-to-beehiiv)
- [Migrating from BeeHiiv — Ghost Developer Docs](https://ghost.org/docs/migration/beehiiv/)
- [@tryghost/mg-beehiiv — npm](https://www.npmjs.com/package/@tryghost/mg-beehiiv)
- [@tryghost/mg-beehiiv-members — npm](https://www.npmjs.com/package/@tryghost/mg-beehiiv-members)
- [How to migrate from Beehiiv to WordPress — Newsletter Glue](https://blog.newsletterglue.com/build/how-to-migrate-from-beehiiv-to-wordpress-newsletter-glue/)
- [Exporting post content or subscriber data from beehiiv — beehiiv Help](https://www.beehiiv.com/support/article/12258595483543-exporting-post-content-or-subscriber-data-from-beehiiv)
- [How to enable and use RSS — beehiiv Help](https://www.beehiiv.com/support/article/9363537272215-how-to-enable-and-use-rss)
- [beehiiv Developer Documentation: Getting Started](https://developers.beehiiv.com/welcome/getting-started)
- [TryGhost/Ghost — GitHub](https://github.com/TryGhost/Ghost)
- [License – WordPress.org](https://wordpress.org/about/license/)
