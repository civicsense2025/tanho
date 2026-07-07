---
title: "Migrate off Squarespace (Beginner guide)"
tagline: "The actual step-by-step for moving your content out — explained without jargon"
category: own-your-stack
source_platform: squarespace
difficulty: beginner
cost_range_usd: "0-45/mo"
tags: ["migration", "website-builder", "squarespace"]
level: beginner
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Comfortable navigating admin/settings menus"
  - "Can identify which platform version a site is on"
  - "Can install and activate a plugin"
  - "Comfortable uploading and downloading files"
  - "Willing to manually re-upload images one by one"
requirements:
  - "Your Squarespace version confirmed (7.0 or 7.1)"
  - "Squarespace XML export, if on 7.0 (Settings → Import & Export → Export)"
  - "Admin access to your chosen destination (Ghost, WordPress, or OYS)"
  - "Time to manually re-upload images and rebuild a few pages by hand"
  - "A plan for manual copy-paste or a crawl-based service if you're on 7.1"
effort_hours_min: 4
effort_hours_max: 20
---

# Migrate off Squarespace (Beginner guide)

If you've read my other guide on whether to even use Squarespace and you've already decided you're leaving, this is the guide for the part nobody explains clearly: how you actually get your stuff out and onto something you own. I'm not going to assume you know what an "importer" or an "XML file" is. I'm going to walk through exactly what happens, in plain language, for four different places you could land.

This is a companion to my evaluation guide on Squarespace, where I covered what Squarespace's export does and doesn't include. Short recap since it matters a lot here: Squarespace gives you a single export file with your blog posts and basic pages, but it leaves out your images, your design, your gallery and store pages, and anything you sell as a digital download. Every migration path below has to deal with that same gap — there's no destination that magically gets around it.

## Check this first, before anything else

Before you pick a destination, you need to know which version of Squarespace you're on, because it changes everything downstream.

- **Squarespace 7.0** (the older version): can export that XML file I mentioned.
- **Squarespace 7.1** (the current default for new sites): **cannot export that file at all.** Squarespace removed the export feature for this version.
- If you don't know which one you're on, this is worth figuring out before you read another paragraph of this guide — it's a completely different amount of work.

If you're on 7.1, none of the "upload this file" steps below will work for you. Your realistic options are copying your content by hand, page by page, or hiring/using a tool that copies your live site by "crawling" it (visiting every page like a visitor would and saving what it sees). I'll flag this again in each section below because it's the single biggest fork in the road, more important than which destination you pick.

## Your four destination options

Here's the landscape, in order of how "hands-off" the move is:

- **Ghost** (a modern, paid or self-hosted blogging platform) — has a real, built-in tool made specifically for Squarespace
- **WordPress** (the world's most common website software, which you can self-host or pay someone to host) — can use Squarespace's export almost as-is, since Squarespace actually builds that export file in WordPress's own format
- **Own Your Site (OYS)**, this project's own platform — has a dedicated Squarespace importer built for exactly this handoff
- **A fully custom app** (a website built from scratch, typically for people with a developer) — the most work, but the most control

I'll walk through each.

## Option 1: Moving to Ghost

Ghost is built for writers and creators who want a clean, fast, ad-free publishing platform, and it's one of the platforms I'd point people toward as an ethical, well-run alternative — it's a nonprofit-owned company, and you can either pay them to host it or run it yourself.

What actually happens:

1. Inside Ghost's own admin screen, there's a **Squarespace migrator** built specifically for this — no separate software to install for a basic migration.
2. You go to **Settings → Advanced → Import/Export** inside Ghost, enter your Squarespace site's web address, and Ghost walks you to the export screen on Squarespace's side.
3. You download that XML file from Squarespace and upload it back into Ghost.
4. Ghost shows you a preview — how many posts and pages it found — before it commits anything.
5. Ghost turns your Squarespace "categories" into Ghost "tags" automatically as part of the import.

What this tool does **not** do for you:

- It does not bring your images over automatically — several people who've done this migration report that images either don't come across at all, or come across as broken links still pointing back at Squarespace. Budget time to re-upload images by hand.
- It does not recreate your design or CSS (the styling code that controls fonts, colors, and layout) — you'll pick or build a new Ghost theme separately.
- It doesn't touch store or gallery pages, matching the same gap in Squarespace's own export.

If your site is bigger or more complex than a simple blog, Ghost also has a set of free, open-source, more advanced migration tools for people comfortable with technical work, and if you pay for their hosted plan (Ghost Pro), their own team can do a hands-on migration for you.

## Option 2: Moving to WordPress

This one surprised me when I dug into it: Squarespace's export file is already built in **WordPress's own file format** (it's designed to be WordPress-compatible from the start). That makes WordPress arguably the most direct of the three "real CMS" destinations, not the hardest.

What actually happens:

1. Export your XML file from Squarespace (Settings → Import & Export → Export), same file as before.
2. In your WordPress site's admin area, go to **Tools → Import**.
3. WordPress will prompt you to install a small add-on called the **WordPress Importer** if you don't already have it — install and activate it.
4. Upload your XML file and run the import. Your posts, pages, authors, and publish dates come across.
5. Your images will still be missing — the export only references them, it doesn't include the actual picture files. A commonly used free add-on called something like **Auto Upload Images** can scan your imported posts, find the old image web addresses still pointing at Squarespace, and automatically download and re-host copies inside WordPress. This saves you from manually saving and re-uploading every photo one by one.

Same gaps as everywhere else: no design/CSS, no gallery or portfolio pages, no store or digital products. You'll rebuild those manually in whatever WordPress theme you choose.

## Option 3: Moving to Own Your Site (OYS)

This is the platform I'm building, so I'll be direct about what it does and doesn't do today.

- OYS has its **own dedicated Squarespace importer** — you don't need any outside tool. It reads the same WordPress-format XML export Squarespace produces and imports your posts and pages directly.
- It **automatically creates redirects** from your old Squarespace web addresses to their new location on OYS. This matters more than it sounds like — if Google or people's bookmarks point at your old URLs, a redirect quietly sends them to the right new page instead of a "page not found" error.
- Like every option here, it covers posts and pages only — not images, not your design, not gallery/portfolio/store pages, and not digital products. Same underlying reason: that's what's actually inside Squarespace's export file.
- **If you're on Squarespace 7.1, this importer won't work for you either**, because there's no XML file for it to read. OYS also has a general-purpose "Bulk redirects" tool (under Admin → Growth → SEO) that can read your old sitemap file and suggest matching pages — useful for catching anything the importer missed, or for rebuilding redirects by hand if you're on 7.1.

## Option 4: A fully custom app

If you or someone you hire is building you a completely custom website (not using an off-the-shelf platform like the three above), the approach is different: instead of an "importer," someone writes a small script that reads your Squarespace XML export and reorganizes that content into whatever format your new custom site expects.

- This gives you the most control over exactly how content is structured on the new site.
- It requires the most technical skill — this isn't a beginner DIY task, it usually means hiring a developer.
- For where to actually host a custom app once it's built, see my deploy guides on Vercel + Supabase, which cover the hosting side in detail — this migration guide is just about getting your content out of Squarespace, not how to build or host the new site.

## Does site size change any of this?

Yes, and it's worth thinking about before you start, no matter which destination you pick:

- **A small personal site or portfolio** (a few dozen pages, nothing for sale): the easiest case. You're mostly dealing with re-uploading images and rebuilding a handful of pages by hand. A weekend project for most people.
- **A medium business site** (a blog plus some products, steady but not huge traffic): the content volume goes up, and now you likely have store pages too — none of the four options above move store data automatically. Budget real time for rebuilding your product catalog by hand on the new platform, and be more careful about redirects since you likely have more inbound links from search engines or partners.
- **A large, active store** (real order history, high search traffic): this is the case where "the importer doesn't cover commerce" stops being a minor asterisk and becomes the main event. Order history and product catalogs need a completely separate migration path — usually a dedicated ecommerce migration tool or a developer-built export, not any of the content importers above. On top of that, if your site gets meaningful search traffic, incomplete redirects can cost you real money in lost visitors — Google needs to find a 301 redirect (a permanent "this page moved here" signal) at every old URL, or your search rankings can drop noticeably. Don't treat redirects as an afterthought at this size.

## Data governance by destination

Before you pick where your content lands, it's worth understanding who actually controls it once it's there. "Owning your content" doesn't mean much if a company can still change the rules on you.

| Destination | Who actually controls the server and database | Could a company still change the deal or shut you out | How easy is it to get your data back out later | Can you (or someone you hire) actually inspect the code |
|---|---|---|---|---|
| **OYS** | You — it's licensed, self-hosted software you (or whoever you hire) install and run on your own server. There's no OYS-run service sitting between you and your site. | No — there's no vendor operating your instance for you, so there's no company that can raise prices, change terms, or shut the service down out from under you. (A hosting provider could still evict you from a shared server, but you'd move the same software elsewhere, not lose your content.) | Full database backup, on your own schedule, because it's your database | Yes, you have the deployed code directly — it's not hidden behind an API you can't see into |
| **Self-hosted Ghost** | You — same setup, your own server | No — no Ghost-run service in the loop for the self-hosted version | Built-in export you can run anytime | Yes — Ghost's code is open source (MIT-licensed) and public on GitHub |
| **Self-hosted WordPress** | You — same setup, your own server | No — no Automattic/WordPress.com account in the loop for the self-hosted version | Built-in export (Tools → Export) anytime, plus direct database access | Yes — WordPress's code is open source (GPL-licensed) and is the most widely reviewed CMS codebase there is |
| **Custom app** | Whoever hosts it — if you pick a managed platform like Vercel, that company controls the infrastructure layer even though you own the code | Depends on your host's terms — a managed platform can change pricing or policies; you keep the code either way, but moving hosts still takes real work | Depends entirely on your database choice, but you have direct access to it either way | Yes, in the sense that you or your developer wrote it — but "auditable" here means "you can read your own code," not "a public community has already reviewed it" |

The short version: all four of these hand you real control over your content and your database. The difference is what happens above that layer — whether a company is also running the server for you, and whether that company's decisions can affect your site.

## Managed cloud vs. renting your own server: the real tradeoff

If you land on the custom app route, or you're choosing how to host self-hosted Ghost/WordPress/OYS, you'll run into this decision immediately: pay a company to manage the server for you, or rent a bare server and manage it yourself.

| | Managed/cloud platform (Vercel, Netlify, Railway) | Renting your own server (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| **Who installs security updates** | The platform does this in the background | You do — or you hire someone to |
| **Who notices if the site goes down** | The platform's team watches their own infrastructure; you still need to notice if your specific site breaks | Nobody but you, unless you set up your own monitoring |
| **How predictable is the monthly bill** | Usually cheap at first, but can jump if your traffic grows a lot | A flat number every month no matter how much traffic you get |
| **How easy is it to move your data elsewhere later** | Usually easy for your code, but your database is often a separate account with its own export process | Very easy — it's your server, so you copy the whole thing |
| **How much technical skill this requires** | Low — you connect a repository and it mostly runs itself | Moderate to high — you're the one who sets up and maintains the server |

For a full walkthrough of the managed path, see my deploy-on-vercel-and-supabase guides. For the self-managed path, see my deploy-on-hetzner-self-hosted-postgres guides — that one is honest about being advanced-only territory, and this same tradeoff is why.

## Who this migration isn't for

I want to be straight with you about this, because a lot of migration content out there implies anyone can do this over a weekend. That's true for some sites and not remotely true for others.

This migration probably isn't for you, at least not as a solo DIY project, if:

- **You're on Squarespace 7.1 and you're not comfortable copying content by hand or hiring someone who is.** There's no file to upload. Every "beginner-friendly" step in this guide assumes you have that XML file. Without it, you're either doing manual copy-paste work across every page, or paying for a crawl-based migration service — neither of which is a beginner weekend task.
- **You run a large, active store with real order history.** None of the four options in this guide move commerce data. If losing sales for even a day would hurt, or your order history matters for accounting, taxes, or customer service, this needs a dedicated ecommerce migration path — and likely a person who's done one before — not this guide.
- **You have no comfort at all installing a plugin, editing a settings screen, or troubleshooting when something "doesn't just work."** Even the smoothest path here (WordPress's native import) still means installing a plugin, and Ghost's migrator still leaves you re-uploading images by hand. If a stuck import or a broken image link would stop you cold, budget for hiring help rather than attempting it solo.

Here's a plain-language way to size yourself up:

| If you... | Then... |
|---|---|
| Have a small blog or portfolio on 7.0, and you're comfortable clicking through Settings menus | You're the exact person this guide is written for — go ahead |
| Are on 7.1 with more than a handful of pages | Budget for either manual copying or a paid crawl-based service, not a free weekend |
| Run a store with meaningful order history | Treat commerce as its own project, separate from content migration, and expect to pay someone or use a dedicated ecommerce migration tool |
| Get nervous installing a WordPress plugin or reading an error message | This is a good candidate to hire out, even for the "easy" destinations |

I want to say this plainly rather than bury it: being on 7.1 with a large site, or running a store with real order history, makes this a genuinely harder migration no matter how carefully you follow this guide. That's not about your skill level — it's about what Squarespace does and doesn't let you export. Don't let a beginner-friendly guide talk you into thinking otherwise.

## My honest take

Check your Squarespace version first, always — 7.0 versus 7.1 decides whether you're uploading a file or copying things by hand, and that's a bigger difference than which destination you choose. After that, if you just want a clean, fast blog and don't need deep customization, Ghost's built-in tool is the smoothest path I've seen. If you want maximum long-term flexibility and don't mind WordPress's slightly more hands-on setup, its native import is genuinely simple because the file formats already match. And if you're building toward the kind of full ownership this whole project is about, OYS's importer plus its redirect tooling gets you there without needing outside software at all.

## Sources
- [Squarespace: Exporting your site](https://support.squarespace.com/hc/en-us/articles/206566687-Exporting-your-site)
- [Squarespace: Importing and exporting content](https://support.squarespace.com/hc/en-us/articles/205814028-Importing-and-exporting-content)
- [Ghost Developer Docs: Migrating from Squarespace](https://docs.ghost.org/migration/squarespace)
- [Ghost: open-source migration tools (TryGhost/migrate)](https://github.com/TryGhost/migrate)
- [WordPress.com Support: Import from Squarespace](https://wordpress.com/support/import/import-from-squarespace/)
- [Kinsta: How to Migrate From Squarespace to WordPress](https://kinsta.com/blog/squarespace-to-wordpress/)
- [WPBeginner: How to Properly Move from Squarespace to WordPress](https://www.wpbeginner.com/wp-tutorials/how-to-properly-move-from-squarespace-to-wordpress/)
- [Ghost Forum: Importing images from Squarespace Blog](https://forum.ghost.org/t/importing-images-from-squarespace-blog/55719)
- [Ghost Developer Docs: Hosting Ghost](https://docs.ghost.org/hosting)
- [Ghost (blogging platform) — Wikipedia](https://en.wikipedia.org/wiki/Ghost_(blogging_platform))
- [WordPress.org: License](https://wordpress.org/about/license/)
