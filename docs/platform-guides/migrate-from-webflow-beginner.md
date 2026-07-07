---
title: "Moving off Webflow: your migration options (Beginner's guide)"
tagline: "The actual tools that move your pages and CMS content, explained one click at a time"
category: own-your-stack
source_platform: webflow
difficulty: beginner
cost_range_usd: "0-100/mo"
tags: ["website-builder", "migration", "platform-evaluation"]
level: beginner
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Comfortable navigating admin panels on two different platforms"
  - "Can create content types and map fields to spreadsheet columns"
  - "Able to open and read a CSV file exported from a Collection"
  - "Willing to manually rebuild static pages in a visual block editor"
  - "Comfortable installing a plugin if using the WordPress path"
requirements:
  - "Webflow admin access to export each CMS Collection as a CSV file"
  - "Your old site's sitemap.xml address for redirect mapping"
  - "Admin access to your chosen destination (OYS, Ghost, or WordPress)"
  - "Time to manually rebuild static (non-Collection) pages by hand"
  - "Patience for real manual work — no one-click Webflow importer exists"
effort_hours_min: 6
effort_hours_max: 35
---

# Moving off Webflow: your migration options (Beginner's guide)

If you've decided you want to leave Webflow — maybe you read my evaluation guides, maybe you're just tired of paying for the CMS tier — the next question is "okay, but how do I actually get my content out?" That's what this guide is for. I'm not re-litigating whether you should leave; I covered that in my Webflow evaluation guides, including the part about Webflow's pricing and the company's own recent turbulence. This one is purely mechanical: here are four realistic destinations, here's what actually moves and what doesn't for each one, and here's what I found when I dug into the real tools people use.

I'll explain every term as it comes up. Fair warning up front, though, since it's the single most important fact in this entire guide: **Webflow does not have a one-click importer anywhere for this migration, no matter which destination you choose.** Every path below involves some manual work. That's not me being lazy about writing a shortcut — it's genuinely how Webflow's export system works today.

## First, the vocabulary

A few words that will come up constantly in this guide:

- **CMS Collection**: Webflow's name for a structured group of content — think of it like a spreadsheet where each row is a blog post, product, or team member, and each column is a field like "title" or "photo." If your Webflow site has a blog, that blog is almost certainly a Collection.
- **Export**: a file that a platform generates for you, containing your content so you can take it elsewhere.
- **CSV file**: "comma-separated values" — the plainest possible spreadsheet format. Nearly every tool on earth can open one, which is why it's the universal hand-off format between platforms.
- **Import**: a tool on your *new* platform that reads an export file and recreates your content there.
- **Static page**: a page that isn't generated from a Collection — your homepage, an About page, a Contact page. These are built by hand in Webflow's visual designer, not from a spreadsheet of rows.

## The one fact that shapes everything below

Webflow's code export gives you real HTML, CSS, and JavaScript files, but it explicitly leaves out your CMS Collection content, user accounts, and e-commerce data. Webflow's own help documentation confirms this. In plain terms: if you export your Webflow site expecting a full backup, you'll get your static pages and your design, but every blog post, product, or team bio living in a Collection comes out as an empty template.

The way around this isn't the code export at all — it's Webflow's per-Collection CSV export, which is a separate, much smaller feature:

1. Open your Webflow project and go into the CMS panel.
2. Open the specific Collection you want to move (your blog posts, for example).
3. Click **Export**, which downloads a CSV file — a plain spreadsheet — containing every item's fields: title, body text, date, author, image links, and so on.
4. Repeat this once per Collection. There's no "export all Collections at once" button — it's one CSV per Collection.

> **[📸 SCREENSHOT PLACEHOLDER]** — the Webflow CMS Collection panel with the Export button visible
>
> _Replace this callout with the real screenshot before publishing._

That CSV is the raw material every destination below works from. Your static pages (homepage, About, Contact) don't come out as CSV at all — you'll be rebuilding those by hand on whichever platform you land on, since none of the four destinations below can automatically recreate a hand-designed page.

## Option 1: Move to Own Your Site (OYS) — the path I built this for

I'll be straight with you: **OYS does not have a dedicated Webflow importer today.** None of the platforms in this guide do — that's not a knock on OYS specifically, it's the honest state of Webflow migration tooling everywhere. Here's what the real path on OYS looks like:

- For each Webflow Collection, export its CSV as described above.
- In OYS, create a matching content type — go to **Admin → Content → Content types → + New type**, name it to match your Collection (e.g., "Blog Posts"), and add fields that mirror Webflow's columns (title, body, date, image, and so on).
- Import your CSV rows into that new content type, or recreate the entries by hand if your Collection is small.
- Rebuild your static pages (homepage, About, Contact) using OYS's block editor — a visual page-building tool similar in spirit to Webflow's designer, just without the CSV shortcut for one-off pages.

Where OYS genuinely shines, and this is the part I'd actually lead with: **preserving every URL you've already built search ranking and inbound links around.** OYS has a **Bulk redirects** tool (Admin → Growth → SEO → Bulk redirects) built specifically for exactly this situation:

- Paste in your old Webflow site's `sitemap.xml` address, and OYS fetches it, reads every page listed, and proposes a redirect mapping for each one — to a page you've already rebuilt, to the closest matching page it can find, or flagged as gone if nothing matches.
- You review the lowest-confidence matches first, correct anything wrong, and commit the whole batch at once — and if something looks off after you go live, you can roll the entire batch back in one action.

> **[📸 SCREENSHOT PLACEHOLDER]** — OYS's Bulk redirects screen showing proposed mappings after fetching a sitemap.xml
>
> _Replace this callout with the real screenshot before publishing._

So the honest summary for OYS: content recreation is manual CSV work, but URL preservation is genuinely one of the best-built parts of the whole platform.

## Option 2: Move to self-hosted Ghost

Ghost is an open-source (meaning the underlying code is free and public) blogging platform you can run yourself. I went looking for an official Webflow importer inside Ghost's migration toolkit, and here's what I found: **there isn't one.** Ghost's own migration tools include dedicated packages for Substack, WordPress, Squarespace, and several others, but no Webflow-specific package exists in their toolkit as of this writing.

What Ghost does offer is a partner integration with a tool called Udesly, but it's worth understanding exactly what that does and doesn't cover:

- Udesly converts your Webflow **design** (the visual theme) into a Ghost-compatible theme file.
- It does **not** move your CMS content. Your blog posts, product entries, or any Collection data still need to come across separately.

So the real content path into Ghost is the same CSV-based approach as everywhere else:

1. Export each Collection as a CSV from Webflow, as described above.
2. Convert that CSV into the specific JSON format Ghost's importer expects — Ghost requires a particular structure with metadata about when the export happened and which Ghost version it targets.
3. Upload that JSON file through Ghost's admin import screen.

This conversion step is the part that trips people up — it's not a drag-and-drop job the way some other Ghost migrations are, because there's no purpose-built converter waiting for you. For a handful of posts, doing this by hand is realistic. For a large Collection, you'll want either a developer to write a small conversion script, or to use one of the general-purpose CSV-to-JSON conversion tools people have documented for this specific move.

## Option 3: Move to self-hosted WordPress

WordPress is the world's most widely used website software, and like Ghost, it has no built-in Webflow importer out of the box. But unlike Ghost, there's a well-established, actively used plugin path that people rely on for exactly this move:

1. Export each Collection as a CSV from Webflow.
2. Install a free plugin called **WP All Import** on your WordPress site.
3. Upload your Webflow CSV into WP All Import, which gives you a visual drag-and-drop screen for matching each Webflow column (like "post-body" or "photo") to the matching WordPress field (like "content" or "featured image").
4. If your Collection includes images referenced by web address rather than uploaded files, pair this with a second free plugin, **Auto Upload Images**, which finds those external image links in your imported posts and pulls the actual image files into your WordPress media library automatically.

This is a genuinely well-worn path — WP All Import is a general-purpose flexible CSV importer, not something built specifically for Webflow, but it's mature and widely documented for this exact use case. Your static pages still need to be rebuilt by hand in WordPress's editor, the same as with every other destination here.

## Option 4: Build a custom app on your own stack

This is the path with the most control and the least hand-holding. Instead of exporting CSVs and importing them into someone else's content system, you or a developer writes code that pulls your content directly out of Webflow and puts it into a database you built yourself.

- The cleanest way to do this isn't the CSV export at all — it's Webflow's **Data API**, a documented way for other software to ask Webflow directly for your CMS content, authenticated through a login process called OAuth.
- A script using the Data API can read every item in every Collection directly, including how items reference each other (a blog post pointing at its author, for example) — detail that a CSV can lose or flatten.
- This only makes sense if you're already planning to build something custom rather than just publish a website — it's real developer work, not a weekend project for a beginner.

If this is your path, I'd point you to my existing deploy guides for Vercel + Supabase, which cover exactly how to stand up the hosting and database side of a custom app — I won't repeat those steps here, just go build your Webflow-import script on top of that foundation once it's live.

## Does site size change anything?

Yes, significantly, and this applies no matter which of the four destinations you pick.

- **Small site (a handful of static pages, no CMS)**: this is genuinely the easiest case in this whole guide. There's no Collection CSV work at all — you're just rebuilding a few pages by hand on your new platform and setting up a handful of redirects. Budget an afternoon, not a project plan.
- **Medium site (one or two Collections, moderate content volume — dozens to a few hundred items)**: this is where the CSV export-and-import process described above becomes real work rather than a formality. Plan to spend real time mapping fields correctly and spot-checking that formatting (bold text, links, images) survived the trip. It's still very doable by one person in a weekend or two.
- **Large site (many Collections, high item counts, real organic search traffic)**: this is where the manual CSV approach starts to strain. Hand-mapping fields for a Collection with thousands of items, across many Collections, is slow and error-prone by hand — this is where the API-based extraction I mentioned in Option 4 starts to earn its complexity, even if you're not going the fully custom-app route, because pulling structured data programmatically avoids re-doing CSV exports and re-checking field mappings by hand over and over.

Here's why the URL side matters more as size grows:

- **Redirect volume scales with your Collection size.** A ten-item blog needs ten-ish redirects. A thousand-item product catalog needs a redirect strategy, not a spreadsheet you fill in by hand. This is exactly the situation OYS's sitemap-fetch feature in Bulk redirects is built for — it reads your old Webflow sitemap and proposes the mapping for you at whatever scale your site actually is, rather than you typing out a thousand rows yourself.
- **Search traffic raises the stakes on getting it right.** A small personal site can absorb a few broken links without much consequence. A site with real organic search traffic loses real visitors and real ranking if old URLs 404 instead of redirecting — which is why reviewing the lowest-confidence proposed matches before committing (rather than trusting an automated match blindly) matters more the bigger your site gets.
- **Budget your manual rebuild time honestly.** A small site is an afternoon. A medium site with one or two Collections is realistically a weekend or two, mostly spent on field-mapping and formatting checks. A large site with many Collections and meaningful traffic is a real project — days to weeks, depending on how much you automate versus do by hand — and it's the tier where investing in a script (even a simple one) pays for itself compared to clicking through CSV imports over and over.

## Data governance by destination

Before you pick a destination, it's worth asking a different question than "which importer is easiest": who actually controls your content once it lives there, and what happens if that changes?

| Destination | Who physically controls the server and database | Could a vendor change terms or shut you down | How easy is ongoing export/backup | Is the code open enough to audit |
|---|---|---|---|---|
| **OYS** | You do. OYS is licensed, self-hosted software — you deploy it onto a server you rent or own, it's not a hosted account someone else runs for you. | No SaaS-style shutdown risk, since nobody but you has the keys to the server. OYS as a vendor can still change license terms for future versions, the same way any licensed-software vendor can. | Direct access to the underlying database, plus the Bulk redirects/export tooling built into the admin. You're never waiting on someone else's "export" button. | You receive the actual codebase running your site. What you can do with it (modify, resell, redistribute) is governed by OYS's license terms — that's different from a fully open-source project, and worth reading before you commit. |
| **Self-hosted Ghost** | You do — same deal, it runs on a server you control. | No. | Direct database access, plus Ghost's own JSON export tool. | Yes — Ghost's core is open source. |
| **Self-hosted WordPress** | You do. | No. | Direct database access, plus WordPress's built-in exporter. | Yes — WordPress is GPL-licensed, one of the most widely audited codebases on the internet. |
| **Custom app stack** | You do for the application code. Your database lives wherever you chose to host it — your own server, or a vendor like Supabase — so this one depends on your own decisions. | Depends entirely on whichever hosting or database vendor you picked underneath. That vendor's terms are the ones that matter, not this guide's. | As good as you build it — you decide the schema and the backup strategy from day one. | Yes — it's code you or your developer wrote and own outright. |

The short version: three of these four destinations put you in direct physical control of your own server and database the moment you set them up. The fourth (custom app) hands you that same control, but only if you're deliberate about which hosting vendor you build it on top of.

## Managed cloud vs. renting your own server: the real tradeoff

If you land on the custom-app path, you'll face a second decision that has nothing to do with Webflow: do you deploy onto a managed cloud platform, or rent your own server and run it yourself? I cover both directly elsewhere in this hub — the managed side in my Vercel + Supabase deploy guides, the self-managed side in my Hetzner + self-hosted Postgres guide — but here's the honest tradeoff in one table:

| | Managed/cloud platforms (Vercel, Netlify, Railway) | Renting your own server (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| Who patches security updates | The platform does, automatically, in the background | You do — nobody does this for you |
| Who's on call if it goes down | The vendor's infrastructure team, for their side of the stack | You are, unless you're paying someone else to be |
| Cost predictability | Cheap or free to start, but usage-based fees (bandwidth, function calls) can climb without much warning | A flat monthly bill for the server, the same whether traffic is high or low |
| Data portability | Good for your app code; you're still relying on the platform's dashboard and deploy configuration | Total — it's your machine, your files, your database, full stop |
| Technical skill required | Low — connect a repository, click deploy | High — you're the system administrator now, including security, backups, and 3am outages |

For a beginner, I'd say this plainly: managed/cloud is the right starting point almost every time. Renting and self-managing your own server is a skill worth learning eventually, but it's a real second job, not a checkbox — don't take it on at the same time you're also trying to learn a new CMS.

## Who this migration isn't for

I want to be straightforward about this, because "just export a CSV" undersells how much work is actually involved. Here's who should think twice, or hire someone, before starting:

- **You don't know what a CSV file is, and you don't want to learn.** I explained it above, but if that explanation didn't click, recreating your content by hand across every one of Webflow's Collections is going to be a frustrating, error-prone slog — not a beginner-friendly weekend project.
- **You have a large, multi-Collection site and no development time or budget.** This is the honest one: there is no dedicated Webflow importer anywhere in this guide — not on OYS, not on Ghost, not on WordPress. The real path for a large site is manual CSV recreation or a developer writing an API script. If your site has many Collections with thousands of combined items and you don't have the time or money for either of those, a DIY migration is genuinely not realistic for you. At that scale, hiring a paid migration service or a freelance developer to script the move is the honest answer, not "power through it yourself."
- **You expect a one-click import.** It doesn't exist for Webflow on any platform today. If that's a dealbreaker for you, that's a fair reaction — it just means this particular migration needs more patience (or more budget) than a Squarespace-to-WordPress move might.
- **You're not comfortable clicking through an unfamiliar admin panel.** Every destination here asks you to create content types, map fields, or run an import screen you've never seen before. If that alone feels intimidating, pair up with someone more comfortable with software before you start, rather than learning it live on your production site.

If none of those describe you, the rest of this guide is a genuinely doable weekend-to-two-week project depending on your site's size. If one or more of them do, that's not a failure — it's just useful information before you spend a weekend stuck on step two.

## My verdict

> **💡 Tip — Where I land, for a beginner**

None of the four destinations has a magic one-click Webflow importer — that's just the honest state of things right now. If you're not particularly technical, I'd still lean toward OYS or Ghost, not because their content import is easier (it isn't, really — all four require CSV work), but because the URL-preservation side is where the real risk to your site lives, and getting that right matters more than which CSV importer screen you're staring at.

- **Good for a straightforward move with strong URL preservation:** OYS — the Bulk redirects and sitemap-fetch tooling genuinely does the hard part of the URL problem for you.
- **Good if you're comfortable with a bit of file conversion:** WordPress with WP All Import — it's a real, mature tool, just not Webflow-specific.
- **Only worth it if you're building something bespoke:** the custom-app path using Webflow's Data API — otherwise it's more upfront work than the CSV route for a typical blog or marketing site.

## Sources

- [How do I export my Webflow site code? – Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961386739347-How-do-I-export-my-Webflow-site-code)
- [Can you export a Webflow website? Understanding code export limitations](https://brixtemplates.com/blog/can-you-export-a-webflow-website-understanding-code-export-limitations)
- [How do I import content into the Webflow CMS? – Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961290794771-How-do-I-import-content-into-the-Webflow-CMS)
- [TryGhost/migrate on GitHub](https://github.com/TryGhost/migrate)
- [Official Ghost + Udesly Integration](https://ghost.org/integrations/udesly/)
- [What's format of JSON file for import to Ghost? – Ghost Forum](https://forum.ghost.org/t/whats-format-of-json-file-for-import-to-ghost/4399)
- [How to Migrate From Webflow to WordPress (in 6 Steps) – Kinsta](https://kinsta.com/blog/webflow-to-wordpress/)
- [Webflow To WordPress: The 6-Step Guide To A Successful Platform Switch – BlogVault](https://blogvault.net/webflow-to-wordpress/)
- [Webflow Data API docs](https://developers.webflow.com/data/docs/data-clients)
