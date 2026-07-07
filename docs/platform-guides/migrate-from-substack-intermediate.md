---
title: "Moving off Substack: your migration options (Intermediate guide)"
tagline: "The actual tools that move your posts and subscribers, by destination"
category: own-your-stack
source_platform: substack
difficulty: intermediate
cost_range_usd: "0-0/mo"
tags: ["newsletter", "migration", "platform-evaluation"]
level: intermediate
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Comfortable running a dry-run/preview step before committing an import"
  - "Can configure bulk URL redirects (wildcard/regex rules)"
  - "Can sequence a Stripe reconnection without double-billing subscribers"
  - "Can segment an email list by engagement for a deliverability warm-up"
  - "Optional: comfortable running Ghost's migrate CLI commands"
requirements:
  - "A Substack export zip plus the full-columns subscriber CSV with engagement data"
  - "Admin access to your destination platform (OYS, Ghost, or WordPress)"
  - "The same Stripe account connected to your Substack, ready to reconnect"
  - "A plan for a phased or parallel-run cutover if migrating 1,000+ subscribers"
  - "2-4 weeks of runway if warming up a new sending domain for a medium-to-large list"
effort_hours_min: 4
effort_hours_max: 10
---

# Moving off Substack: your migration options (Intermediate guide)

You've already decided to leave Substack, or you're close to it — this guide skips the "should you" argument (that's in my evaluation guides) and gets straight into "here's the tool for each destination, and here's what actually breaks during the move." I'm covering four destinations: my own product (OYS), self-hosted Ghost, self-hosted WordPress, and a fully custom app you build yourself.

Every path starts from the same source file: Settings → Exports on Substack, which produces a zip containing your posts as individual HTML files, plus CSVs for your subscriber list and post metadata. That export format is the one constant across every migration below.

## Option 1: OYS's built-in Substack importer

This is the path I know most precisely, since I built it. It's a single-file, two-step flow:

- **Location**: Admin → Content → Import, choose "Substack" from the registered import sources.
- **Input**: exactly one file — the Substack export zip. Nothing else required.
- **Step one, dry run**: OYS parses the zip and returns a preview — post count, total subscriber count, and paid-subscriber count — without writing anything to your database yet.
- **Step two, commit**: once you've checked the dry-run numbers look right, you confirm and it imports posts and subscribers for real.

There's no separate CSV upload step and no separate Stripe-reconnection wizard baked into the importer itself — it's scoped to posts and subscriber records. If you're bringing over paid subscribers, treat the Stripe side as its own task, covered in the size-tier section below.

> **[📸 SCREENSHOT PLACEHOLDER]** — OYS's Import screen mid dry-run, showing the post/subscriber/paid-subscriber counts before commit
>
> _Replace this callout with the real screenshot before publishing._

On redirects: OYS has a general-purpose "Bulk redirects" tool (Admin → Growth → SEO → Bulk redirects) that can crawl an old sitemap.xml and propose URL mappings, or accept wildcard/regex rules. It's less relevant coming specifically from Substack, since Substack doesn't expose a public sitemap the way a normal CMS does — you won't get much automatic mileage out of the sitemap-fetch feature for this particular migration. If you have a handful of posts that rank well or get shared often, it's still worth manually redirecting those individually.

## Option 2: Self-hosted Ghost, via the official Substack migrator

Ghost ships a first-party, actively maintained migration path specifically for Substack — this isn't a community hack, it's built and documented by Ghost's own team.

- **In Ghost admin**: Settings → Advanced → Import/Export has a dedicated Substack migrator.
- **Flow**: enter your Substack publication's public URL, trigger (or confirm you've already triggered) a new export on Substack, download that zip, and upload it into Ghost's migrator.
- **Subscribers**: Ghost separately prompts you to download the free-subscriber CSV from Substack and upload it.
- **Paid subscribers**: Ghost's flow explicitly requires connecting the *same* Stripe account that's connected to your Substack, not a new one — this is what lets existing paid subscriptions transfer as live billing relationships rather than requiring a full re-subscribe flow. Set up Stripe on the Ghost side before you get to this step.

Under the hood, this wizard runs on Ghost's open-source `@tryghost/migrate` toolkit, which includes a dedicated `mg-substack` package built to parse Substack's zip structure specifically — command-line access exists too (`migrate substack --pathToZip ... --url ...`) if you want to script the transformation yourself or inspect intermediate output before importing, with options to filter which content types come over (posts, pages, podcasts) and to tag everything from the migration for easy identification afterward.

If your migration is large or unusual enough that the self-serve tool doesn't cover it, Ghost(Pro) hosting customers can get hands-on help from Ghost's own migrations team — worth knowing about before you build custom tooling to cover an edge case Ghost's team has probably already solved.

## Option 3: Self-hosted WordPress, via the Substack Importer plugin

WordPress has no native Substack support, so this route requires an extra piece: the free "Substack Importer" plugin, available through the standard WordPress plugin directory.

- **What it does**: reads a Substack export zip, converts each post into WordPress's block editor ("Gutenberg") format, and also produces a WXR file — WordPress's standard universal export/import format — so the built-in WordPress Importer can finish the job.
- **What comes over**: posts, images, publicly visible comments, and author metadata.
- **What doesn't come over**: subscriber emails and paid billing aren't part of this plugin's scope at all — it's a content-only importer. You'll need a separate email/membership system on the WordPress side (picking one is outside scope here) and you'll handle the subscriber CSV import and Stripe transfer as independent steps.

Because content and subscribers land through entirely separate systems on this path, sequence matters: get content imported and verified first, then move subscribers into whatever membership/ESP tool you've picked, then handle paid billing last, once you know the new destination for paying subscribers is stable.

## Option 4: Custom app on your own stack — no importer, you build it

This path has no vendor-provided importer. You're parsing the Substack export programmatically and inserting the result into a database schema you control.

- The zip's posts are individual HTML files — a script opens each, extracts title/date/body, and writes rows into your own posts table.
- The subscriber CSV is a flat spreadsheet — straightforward to parse and insert into your own subscribers table.
- Nothing validates the data for you. Build your own checks (post count matches what Substack reported, no null titles, subscriber emails are well-formed) before you trust the import.

For hosting the resulting app, I've already written the deploy mechanics — see my Vercel + Supabase deploy guides for the actual hosting/database setup steps. I won't repeat that content here; this guide is only about getting the Substack data into whatever stack you land on.

## Size-tier considerations, across all four destinations

The tool you pick barely changes the size-tier risks — they're the same regardless of destination.

- **Small (under ~1,000 subscribers, low cadence)**:
  - A single-sitting migration is realistic on any of the four paths.
  - Deliverability risk is minimal — you're not sending enough volume for spam filters to flag your new sending domain.
  - A hard cutover (flip everything at once) is fine.
  - Stripe transfer, if you have any paying subscribers at all, is low-stakes — a handful of subscriptions, easy to verify by hand.
- **Medium (1,000–50,000 subscribers, regular cadence, some paid)**:
  - Deliverability warm-up matters now. A newly connected sending domain or IP has no reputation with inbox providers; sending your full list on day one risks landing in spam for a meaningful share of recipients. Segment out your most-engaged subscribers (Substack's export includes an activity/engagement signal in the full subscriber CSV) and send to them first, ramping volume over roughly two to four weeks before you're sending to the full list.
  - Consider a parallel run: keep Substack live in read-only/no-new-posts mode for a short window while your new platform's sending reputation warms up, rather than an instant hard cutover.
  - Stripe transfer needs a deliberate sequence: pause billing on Substack before reconnecting the same Stripe account on the new platform (Ghost's flow assumes this), or you risk a subscriber being billed by both platforms in the same cycle.
  - Redirect volume is still modest — Substack has no public sitemap to bulk-import from, so you're likely hand-picking your best-performing posts to redirect rather than automating the whole archive.
- **Large (50,000+ subscribers, meaningful paid revenue)**:
  - Treat deliverability warm-up as a project phase, not a checkbox — a poorly warmed sending domain at this scale can get flagged widely enough to affect inbox placement for weeks afterward, which directly hits open rates and paid-conversion.
  - A phased cutover is close to mandatory: stage sends by engagement tier, monitor bounce/spam-complaint rates at each stage, and don't advance to the next tier until the numbers look clean.
  - The double-billing risk on Stripe transfer is a real operational hazard at this scale, not a theoretical one — pausing the source platform's billing before reconnecting Stripe elsewhere is the documented mitigation, and it's worth a dry run on a small subscriber batch before you move the whole base.
  - Redirect and SEO volume is worth real attention if you have a large back catalog with organic search traffic — even without a Substack sitemap to automate against, manually mapping your highest-traffic posts to their new URLs protects search rankings you've already earned.

## Data governance by destination

Migration mechanics aside, it's worth being explicit about what "moving your data" actually changes about who controls it going forward.

| Destination | Who controls the server & database | Vendor still in the loop | Ongoing export/backup | Auditable code |
|---|---|---|---|---|
| OYS | You — it's licensed software you deploy on infrastructure you choose (a managed pairing or your own server), not a hosted SaaS I operate for you | Yes, narrowly — you're on a license from me, so updates and terms trace back to me even though the server and data are fully yours | Full database access by default, plus the built-in import/export tooling covered above | No — OYS is licensed, not open source. Your data is fully yours; the application code isn't public. |
| Self-hosted Ghost | You | Only if you opt into Ghost(Pro) managed hosting or their migrations team — a bare self-hosted install has no vendor runtime access | Native export tools + direct database access | Yes — Ghost's core is MIT-licensed and public on GitHub |
| Self-hosted WordPress | You | No — wordpress.org isn't in your data path; individual plugins may phone home, so vet what you install | WXR export built in + direct MySQL access | Yes — WordPress core is GPLv2-licensed, one of the most widely audited codebases around; plugin quality varies |
| Custom app stack | You, plus whatever managed pieces you chose (e.g. Vercel + Supabase) | Yes — your hosting/DB vendors set the terms, uptime, and pricing, and can change any of them | Nothing automatic — you own the schema, so you own building the export path | Yes for your own code; no for the managed platforms' internals, though Postgres itself keeps your actual data in a portable format |

Worth separating two things people conflate: "self-hosted" (you run the software) and "open source" (the code itself is public and auditable). OYS and the custom-app path give you the former without the latter; Ghost and WordPress give you both.

## Managed cloud vs. renting your own server: the real tradeoff

If you land on the custom-app path, or on self-hosted Ghost/WordPress, you'll hit this fork: pay a company to manage the server ("managed" or "cloud" hosting), or rent a bare server (a VPS — "virtual private server") and run everything yourself.

| | Managed/cloud (Vercel, Netlify, Railway) | Renting your own VPS (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| Security patching | Handled by the platform | Entirely on you — OS, database engine, every dependency |
| Incident response | Their ops team; you open a ticket | You're the only on-call engineer |
| Cost predictability | Cheap or free base tier, usage-based scaling that can surprise you at volume | Flat monthly server cost (roughly $4-15/mo for a small instance), but 100% of the ops labor is yours |
| Data portability | Good — standard export paths for the database | Total — it's your box, but you have to build the backup discipline yourself |
| Technical skill required | Moderate — dashboards, connection strings, some config | High — comfortable with SSH, firewall rules, and database administration |

See my `deploy-on-vercel-and-supabase` guides for the managed side's mechanics and my `deploy-on-hetzner-self-hosted-postgres` guides for what renting-and-self-managing actually involves day to day — I won't re-derive either here.

At the intermediate skill level specifically, you can realistically run either side of this table. The deciding factor isn't whether you *can* SSH into a server — it's whether you want that as a standing responsibility. Managed hosting buys back your time; a rented VPS buys you total control and a lower recurring bill, in exchange for owning every incident yourself.

## Who this migration isn't for

Being straightforward about it:

- **You're comfortable following a guide but you've never debugged a production issue solo.** Self-hosting Ghost or WordPress on a bare VPS means you're the only line of defense when something breaks. If you've never done that under time pressure, start on a managed option and revisit self-hosting once you have a live site's worth of real-world troubleshooting behind you.
- **You don't have a recurring block of time for maintenance.** Patching, monitoring, and backup verification aren't one-time migration tasks — they're an ongoing job. If you can't commit an hour or two a month to it indefinitely, a VPS-hosted Ghost/WordPress install will quietly rot until something breaks badly.
- **Your list is under a few hundred subscribers with no monetization plan.** The governance and control benefits of self-hosting are real, but they're most valuable once you have something worth protecting — revenue, a large list, or content you can't risk losing to a platform policy change. Below that, OYS's or Ghost's managed/hosted options get you most of the benefit for a fraction of the ongoing effort.
- **You're drawn to the custom-app path mainly because it sounds impressive, not because you need something OYS or Ghost doesn't already do.** Be honest with yourself here — re-implementing an importer, a CMS, and a subscriber system from scratch is a lot of surface area to maintain forever, for a newsletter that doesn't structurally need it.

None of this is a technical-skill gate you fail — it's closer to a "make sure the destination matches what you're actually going to do with it" check.

## My verdict

> **💡 Tip — Where I land**

For anyone comfortable with a few technical steps, OYS and Ghost are both genuinely solid, low-friction migrations — real importers built for this exact export, not scripts held together with tape. WordPress is one plugin away from equally workable, just remember it only moves content, not subscribers or billing. The custom-app path only earns its extra effort if you're building something beyond a newsletter — otherwise you're re-solving a problem OYS and Ghost have already solved well.

The one thing I'd tell every intermediate-level migrator regardless of destination: don't underestimate deliverability warm-up and Stripe sequencing. The content import is the easy part. The two things that actually go wrong in real migrations are subscribers landing in spam and subscribers getting billed twice — both are avoidable with a bit of sequencing discipline, and neither is something any of these four tools fully automates for you.

## Sources
- [Ghost Developer Docs: Migrating from Substack](https://docs.ghost.org/migration/substack)
- [Ghost migrate toolkit (npm)](https://www.npmjs.com/package/@tryghost/migrate)
- [Ghost mg-substack-csv package (npm)](https://www.npmjs.com/package/@tryghost/mg-substack-csv)
- [TryGhost/migrate on GitHub](https://github.com/TryGhost/migrate)
- [Substack Importer plugin — WordPress.org](https://wordpress.org/plugins/substack-importer/)
- [WPBeginner: How to Migrate From Substack to WordPress](https://www.wpbeginner.com/wp-tutorials/how-to-migrate-from-substack-to-wordpress/)
- [InstaWP: How to Migrate from Substack to WordPress](https://instawp.com/migrate-from-substack-to-wordpress/)
- [Substack: How do I export my posts](https://support.substack.com/hc/en-us/articles/360037466012-How-do-I-export-my-posts)
- [Substack: How do I export my email list](https://support.substack.com/hc/en-us/articles/6314498343700-How-do-I-export-my-email-list-on-Substack)
- [beehiiv: How to migrate from Substack to beehiiv](https://www.beehiiv.com/support/article/14966988360215-How-to-migrate-from-Substack-to-beehiiv)
- [WordPress.org: GPL license](https://wordpress.org/about/license/)
- [TryGhost/Ghost core repository (MIT license) — GitHub](https://github.com/TryGhost/Ghost)
