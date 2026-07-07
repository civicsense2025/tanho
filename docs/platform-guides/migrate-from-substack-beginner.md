---
title: "Moving off Substack: your migration options (Beginner's guide)"
tagline: "The actual tools that move your posts and subscribers, explained one click at a time"
category: own-your-stack
source_platform: substack
difficulty: beginner
cost_range_usd: "0-0/mo"
tags: ["newsletter", "migration", "platform-evaluation"]
level: beginner
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Comfortable navigating platform admin/settings menus"
  - "Can download a zip file and upload it into a web form"
  - "Can install and activate a WordPress plugin"
  - "Can connect a Stripe account for paid subscriptions"
  - "Optional: basic terminal comfort, only for the custom-app path"
requirements:
  - "A completed Substack export (zip file with posts and subscriber CSV)"
  - "A chosen destination: Own Your Site, Ghost, WordPress, or a custom app"
  - "A free WordPress.org plugin install, if migrating to WordPress"
  - "Your existing Stripe account details, if you have paying subscribers"
  - "More calendar time than a single sitting if moving thousands of paying subscribers"
effort_hours_min: 2
effort_hours_max: 6
---

# Moving off Substack: your migration options (Beginner's guide)

If you've decided you want to leave Substack — maybe you read my evaluation guide, maybe you just want more control — the next question is "okay, but how do I actually do it?" That's what this guide is for. I'm not going to re-litigate whether you should leave; I covered that in my Substack evaluation guides. This one is purely mechanical: here are your four realistic destinations, here's the tool for each one, and here's what actually happens to your posts, your subscribers, and your money along the way.

I'll explain every term as it comes up, so if you've never done a "migration" before, don't worry.

## First, two words you'll see constantly

- **Export**: a file (usually a "zip" file, which is just several files bundled into one compressed package) that a platform generates for you, containing your content and data so you can take it elsewhere.
- **Import**: the reverse — a tool on your *new* platform that reads an export file and recreates your content there.

## Getting your Substack export (do this first, no matter where you're headed)

Every path below starts the same way:

1. Log into Substack and go to Settings.
2. Find the Exports section.
3. Click "New export" (sometimes labeled "Create new export").
4. Wait for Substack to prepare the file — this isn't instant, especially with a large archive.
5. Download the zip file it produces.

That zip contains your posts (as individual HTML files — a web page format, one per post) and your subscriber list (as a CSV, which is a plain spreadsheet file that basically every tool on earth can open).

> **[📸 SCREENSHOT PLACEHOLDER]** — Substack's Settings → Exports page with the "New export" button visible
>
> _Replace this callout with the real screenshot before publishing._

With that zip in hand, here are your four destinations.

## Option 1: Move to Own Your Site (OYS) — the path I built this for

This is the one I know best because I built it. OYS has a real, working Substack importer built in — no third-party tool, no conversion script.

- Go to Admin → Content → Import inside your OYS site.
- Choose "Substack" from the list of import sources.
- Upload the single zip file you downloaded from Substack — that's the only file it asks for.
- OYS runs what's called a "dry run" first. A dry run means it reads your file and shows you a preview — how many posts it found, how many subscribers, how many of those subscribers are paying — without actually writing anything yet. This matters because it means you can check the numbers look right before committing to anything permanent.
- If the preview looks right, you click confirm, and OYS imports the posts and subscriber list for real.

> **[📸 SCREENSHOT PLACEHOLDER]** — the OYS Admin → Content → Import screen with Substack selected and the dry-run summary showing post/subscriber counts
>
> _Replace this callout with the real screenshot before publishing._

That's genuinely the whole process on the OYS side. One file in, one preview, one confirm.

## Option 2: Move to self-hosted Ghost

Ghost is an open-source (meaning the underlying code is free and public) blogging and newsletter platform you can run yourself. Ghost's own team built an official importer specifically for Substack, and it lives right inside Ghost's admin dashboard under Settings → Advanced → Import/Export.

Here's how it works, step by step:

1. In Ghost admin, start the Substack migration tool and enter your Substack publication's public web address.
2. Ghost will prompt you to create a new export on Substack (the same export process described above) and download that zip.
3. Upload that zip back into Ghost's migration screen.
4. Separately, Ghost asks you to download your free-subscriber list as a CSV from Substack, then upload that CSV into Ghost too.
5. If you have paying subscribers, Ghost walks you through connecting the *same* Stripe account you used on Substack — Stripe is the payment company that actually processes credit cards behind the scenes on both platforms.

Behind that friendly wizard, Ghost is running an open-source toolkit (its maintainers call it their "migrate" tooling) that specifically knows how to read a Substack zip file and convert it into Ghost's format. This is a real, actively maintained tool, not a hack — Ghost's own documentation walks through it as a supported path.

One extra step worth knowing about upfront: if your migration needs are bigger than the built-in tool handles (a very large archive, unusual content), Ghost offers a paid migrations team if you're a Ghost(Pro) hosting customer. Most small newsletters won't need that.

## Option 3: Move to self-hosted WordPress

WordPress is the world's most widely used website software, and it's self-hostable, meaning you run it on your own server rather than renting space inside someone else's app.

Unlike Ghost, WordPress doesn't have Substack support built in from the start. You need one extra piece: a free plugin (a plugin is an add-on that gives WordPress a new ability it didn't have out of the box) called the Substack Importer. Here's the flow:

1. Install and activate the Substack Importer plugin on your WordPress site (search for it by name inside WordPress's plugin directory, or install it from wordpress.org).
2. Get your Substack export zip, same as above.
3. In WordPress, run the Substack Importer and upload that zip.
4. The plugin converts your posts into WordPress's native block editor format (called "Gutenberg blocks") and also converts everything into a format called WXR, which is WordPress's own universal import/export format, so the standard built-in WordPress Importer tool can finish the job.
5. It also brings over your images, any public comments, and author information.

Subscriber emails and paid billing are not part of this plugin — it's a content importer, not a full newsletter-platform migrator. If you're running a paid newsletter on WordPress, you'll need a separate email/membership tool (I'm not covering picking one here, since that's a whole decision on its own) and you'll handle the subscriber CSV and Stripe move manually, the same way described in the size-tier section below.

## Option 4: Build a custom app on your own stack

This is the path with no importer at all — you or a developer write code that reads the Substack export and puts it into a database you built yourself. It's the most work, and it's really only worth it if you're already building a custom product rather than a blog.

- The Substack zip's posts are just HTML files sitting inside it — a script can open each one, pull out the title, date, and body content, and insert them into your own database.
- The subscriber CSV is a plain spreadsheet — any basic script can read it row by row and insert each subscriber into your own table.
- There is no "confirm" button here. You're responsible for validating the data yourself.

If this is your path, I'd point you to my existing deploy guides for Vercel + Supabase, which cover exactly how to stand up the hosting and database side of a custom app — I won't repeat those steps here, just go build on top of that foundation once it's live.

## Does site size change anything?

Yes, and this applies no matter which of the four destinations you pick. Here's the plain-language version:

- **Small newsletter (under roughly 1,000 subscribers, posting occasionally)**: you can basically just do the whole migration in one sitting. Export, import, done. There isn't enough email volume for you to worry about your new sending system getting flagged as spam (more on that below), and if something looks slightly off after the import, you can fix it by hand.
- **Medium newsletter (1,000–50,000 subscribers, regular posting, maybe some paying subscribers)**: you'll want to be more careful. Don't email your entire list on day one from a brand-new sending setup — see "deliverability" below. If you have paid subscribers, plan the Stripe move as its own step, not an afterthought.
- **Large newsletter (50,000+ subscribers, real paid revenue)**: treat this as a project with a timeline, not a weekend task. Everything below matters a lot more at this size.

Here's why size matters for the technical parts:

- **Email deliverability warm-up**: "Deliverability" means whether your emails actually land in people's inboxes instead of their spam folder. Email providers (Gmail, Outlook, etc.) are suspicious of a brand-new sending source that suddenly blasts tens of thousands of emails at once — that pattern looks like spam even if it isn't. If you're moving a large list, you generally want to send to a smaller, more engaged slice of your subscribers first, and ramp up volume over a couple of weeks rather than emailing everyone on day one.
- **Parallel-run vs. hard cutover**: a "hard cutover" means you flip the switch and everything moves at once. A "parallel run" means you keep both platforms running for a little while, sending from the new one gradually while the old one winds down. Small newsletters can usually do a hard cutover safely. Larger ones benefit from a phased approach.
- **Paid subscriber transfers and Stripe**: your paying subscribers' credit cards are connected to a Stripe account (the payment processor working behind the scenes). Moving to a new platform doesn't automatically move that billing relationship — you generally need to pause billing on the old platform before reconnecting the same Stripe account elsewhere, or you risk charging the same subscriber twice in the same period. This risk is small with a handful of paying subscribers and a real operational hazard with thousands of them.
- **Redirects and SEO**: a "301 redirect" is an instruction that tells a browser (and search engines) "this old web address has permanently moved, go here instead." This matters for preserving your search ranking and any old links people have bookmarked or shared. Substack doesn't publish the kind of public sitemap (a directory list of a site's pages) that a normal blog does, so this matters less when leaving Substack specifically than it would leaving other platforms — but if your new destination gives you a way to set up redirects in bulk, it's worth doing for your handful of most-shared posts regardless of list size.

## Data governance by destination

Before you pick a destination, it's worth pausing on a question that's easy to skip past: once your posts and subscribers land somewhere new, who actually controls that data?

A quick vocabulary note first: **"open source"** means the actual code behind a piece of software is public — anyone can read it and verify what it does with your data, or even run their own copy of it. That's a different thing from **"self-hosted,"** which just means you're the one running the software, on your own server or one you rent, whether or not the underlying code itself is public. People mix these up constantly, so here's the honest breakdown of both, across all four destinations in this guide.

| Destination | Who controls the server & database | Is there still a vendor in the loop? | How easy is ongoing export/backup? | Can you audit the actual code? |
|---|---|---|---|---|
| **OYS** | You do. OYS is licensed software you deploy and run yourself — not something I host for you. You pick the infrastructure, whether that's a managed pairing like Vercel + a database, or your own server. | Yes, in a limited sense — you're running software licensed from me, so updates and license terms still come from me, even though your server and your data are entirely yours. | Yes — it's your own database, so you have full access, on top of the import/export tooling described above. | No — OYS is licensed software, not open source. You can see and export all of *your* data any time; you can't inspect the application's source code. |
| **Self-hosted Ghost** | You do — Ghost runs on whatever server you choose. | Only if you opt in. Ghost's nonprofit foundation has no runtime access to a self-hosted install unless you pay for their managed Ghost(Pro) hosting or their migrations team. | Yes — Ghost has built-in export tools plus direct database access. | Yes — Ghost's core software is MIT-licensed (a permissive open-source license) and public on GitHub. Anyone can read exactly what it does with your data. |
| **Self-hosted WordPress** | You do — same self-hosted model as Ghost. | No — wordpress.org isn't in your data path at all once you're self-hosting, unless a specific plugin you install phones home to a paid service. | Yes — WordPress has a built-in exporter (the WXR format) plus direct database access. | Yes — WordPress's core is GPL-licensed (another open-source license) and is one of the most widely audited codebases in existence. Individual plugins vary in quality and transparency, so vet whatever you install. |
| **Custom app stack** | You, plus whichever managed pieces you picked (for example, Vercel for hosting and Supabase for the database). | Yes — your hosting and database providers are vendors with their own terms of service, uptime guarantees, and pricing, and they can change any of those. | Depends entirely on what you (or your developer) build — nothing is automatic here. | Yes for the code you write; no for the internals of the managed platforms underneath it — though the data itself typically sits in a standard, portable format like Postgres. |

The short version: OYS and the custom-app path both mean *you* physically hold the data, but only Ghost and WordPress let you (or anyone) read the literal source code that touches it. That's the real difference between "self-hosted" and "open source" — related, but not the same thing, and it's worth knowing which one you're actually getting with each option.

## Managed cloud vs. renting your own server: the real tradeoff

If your destination is the custom-app path, or if you're weighing how to run self-hosted Ghost or WordPress, you'll eventually hit this fork in the road: pay a company to manage the server for you ("managed" or "cloud" hosting), or rent a bare server and run everything yourself (often called a VPS, short for "virtual private server").

| | Managed/cloud platforms (e.g. Vercel, Netlify, Railway) | Renting your own VPS (e.g. Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| **Who patches security updates** | The platform does it for you, invisibly | You do — the operating system, the database, and every piece of software on the box is your job to keep current |
| **Who's on call if it goes down** | Their support team; you file a ticket | You are the entire support team, including at 2 a.m. |
| **Cost predictability** | Usually a free or cheap starting tier, but costs can climb as your traffic grows | A flat, predictable monthly rent for the server itself (often single digits up to around $15/month), but that price doesn't include your own time |
| **Data portability** | Good — most platforms give you a standard way to export your database | Total — it's your machine, nothing is locked away, but you're also the one who has to build the backup process |
| **Technical skill required** | Low to moderate — mostly clicking through a dashboard and pasting a connection string | High — comfortable typing commands into a terminal, managing a firewall, and keeping database software patched |

I go into the deeper mechanics of each side of this table in my `deploy-on-vercel-and-supabase` guides (the managed side) and my `deploy-on-hetzner-self-hosted-postgres` guides (the renting-your-own-server side) — this is just the summary version, so you can figure out which category you're even in before reading further.

For a beginner specifically: unless you already enjoy tinkering with servers, start on the managed side. You can always move to a rented VPS later once you know you want that level of control — it's much harder to go the other direction under pressure, mid-migration.

## Who this migration isn't for

I'd rather tell you this now than have you find out three hours into a stalled migration.

- **You've never opened a command line and don't want to learn one right now.** The custom-app path in this guide assumes comfort with a terminal, even with every term explained along the way. If that's not you yet, stick to OYS's or Ghost's built-in importer — both are genuinely just "upload a file, click a button."
- **You don't have time or budget for ongoing security patching.** Self-hosting Ghost or WordPress on a bare server (a VPS) makes *you* responsible for keeping the operating system and database patched, forever — not just on migration day. If that sounds like a chore you'll skip after the first month, a managed option (OYS on managed infrastructure, or Ghost(Pro) hosting) is the honest choice.
- **Your list is small and you're not sure you'll keep writing.** If you have a few dozen subscribers and you're not certain you'll still be publishing in six months, a full migration project might not be worth the effort yet. It's fine to wait until you have more at stake.
- **You're moving thousands of paying subscribers and this is your first migration of any kind.** Nothing wrong with using OYS's or Ghost's importer here — the tools are the same ones described above — but budget more calendar time than a single sitting, and don't be afraid to ask for help (mine or a freelancer's) rather than assuming a same-day cutover.

If any of this sounds like you, that's not a failure — it just means the honest answer is "not yet," or "pick the simpler destination," not "grind through it anyway."

## My verdict

> **💡 Tip — Where I land, for a beginner**

If you're not particularly technical and you want the least friction, OYS's built-in importer or Ghost's built-in importer are both genuinely one-sitting jobs — upload a zip, click through a wizard, done. WordPress needs one extra plugin but is still approachable. Building your own is only worth it if you're already committed to building a custom product, not just publishing a newsletter.

- **Good for a fast, low-risk move:** OYS or Ghost — both have a real importer built for this exact export format.
- **Good if you're already invested in WordPress:** the Substack Importer plugin, understanding it only handles content, not subscribers or billing.
- **Only worth it if you're building something bespoke:** the custom-app path — otherwise it's more work for no real benefit over the built-in importers.

## Sources
- [Substack: How do I export my posts](https://support.substack.com/hc/en-us/articles/360037466012-How-do-I-export-my-posts)
- [Substack: How do I export my email list](https://support.substack.com/hc/en-us/articles/6314498343700-How-do-I-export-my-email-list-on-Substack)
- [Ghost Developer Docs: Migrating from Substack](https://docs.ghost.org/migration/substack)
- [Ghost migrate toolkit (npm)](https://www.npmjs.com/package/@tryghost/migrate)
- [Ghost mg-substack-csv package (npm)](https://www.npmjs.com/package/@tryghost/mg-substack-csv)
- [TryGhost/migrate on GitHub](https://github.com/TryGhost/migrate)
- [Substack Importer plugin — WordPress.org](https://wordpress.org/plugins/substack-importer/)
- [WPBeginner: How to Migrate From Substack to WordPress](https://www.wpbeginner.com/wp-tutorials/how-to-migrate-from-substack-to-wordpress/)
- [InstaWP: How to Migrate from Substack to WordPress](https://instawp.com/migrate-from-substack-to-wordpress/)
- [WordPress.org: GPL license](https://wordpress.org/about/license/)
- [TryGhost/Ghost core repository (MIT license) — GitHub](https://github.com/TryGhost/Ghost)
