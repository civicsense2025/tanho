---
title: "Moving off Substack: your migration options (Expert guide)"
tagline: "Tooling internals, scripting the parse, and zero-downtime cutover mechanics"
category: own-your-stack
source_platform: substack
difficulty: expert
cost_range_usd: "0-0/mo"
tags: ["newsletter", "migration", "platform-evaluation"]
level: expert
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can write a script to parse HTML and re-host images at scale"
  - "Comfortable scripting against a CLI tool (e.g. migrate substack --pathToZip)"
  - "Can reconstruct paywall/gating logic from metadata rather than clean fields"
  - "Can sequence a zero-downtime DNS cutover (TTL reduction, record switch)"
  - "Can build your own reconciliation checks with no vendor dry-run available"
requirements:
  - "The full Substack export zip, including the posts-metadata CSV with old slugs"
  - "The all-columns subscriber CSV export, needed for engagement-based deliverability segmentation"
  - "A staging environment to validate a custom import before touching production"
  - "DNS record access to lower TTLs ahead of a large-scale cutover"
  - "A Stripe account and a plan to pause/reconnect billing without double-charging subscribers"
effort_hours_min: 8
effort_hours_max: 24
---

# Moving off Substack: your migration options (Expert guide)

Four viable destinations off Substack, from a systems-engineering angle: OYS's native importer, Ghost's official migration toolkit, WordPress via a conversion plugin, or a fully custom stack with no importer at all. This guide assumes you've already made the "why leave" decision (covered in my Substack evaluation guides) and are now scoping the actual migration engineering. Every path starts from the same artifact — the Substack export zip: per-post HTML files (not markdown, not structured JSON), a subscribers CSV, and a posts-metadata CSV.

## Option 1: OYS's native Substack importer

Registered as `substackImporter` in OYS's import hub, this is the tightest-scoped of the four paths:

- **Input contract**: a single `.zip`, read client-side as an `arrayBuffer` and handed to a server action — no separate CSV upload, no multi-step wizard.
- **Dry run**: parses the zip and returns post count, subscriber count, and paid-subscriber count before any writes occur — a preview-then-commit pattern, not a streaming/incremental import.
- **Commit**: a second explicit action writes posts and subscribers.
- **Scope boundary**: the importer is posts + subscriber records only. It does not orchestrate a Stripe reconnection — if you're bringing over paid subscribers, that's a separate manual step you sequence around the import, not something the importer wires up for you.

If you're automating a batch of migrations (say, you're helping several publications move at once), the two-call shape (`dryRun` → `commit`) is straightforward to script against directly rather than driving the UI — both are plain server actions taking the export file as their argument.

For redirects, OYS's general "Bulk redirects" tool (Growth → SEO) can fetch a sitemap.xml and propose mappings, or take wildcard/regex rules directly. Substack doesn't serve a conventional public sitemap, so the fetch-and-propose half of that tool has little to grab onto for this specific source — plan on hand-authoring your redirect rules (or scripting them from the posts-metadata CSV, which does have your old slugs) rather than relying on sitemap discovery.

## Option 2: Ghost's `@tryghost/migrate` toolkit

Ghost's Substack path is the most mature of the three vendor-adjacent options, both as a GUI wizard (Settings → Advanced → Import/Export in Ghost admin) and as an open-source, scriptable CLI.

- **Package**: `@tryghost/migrate`, MIT-licensed, actively released (point releases have shipped within days of this writing) — with a dedicated `mg-substack` / `mg-substack-csv` sub-package specifically for parsing Substack's zip structure.
- **CLI invocation**: `migrate substack --pathToZip /path/to/export.zip --url https://yourdomain.com`, with flags for selective content-type migration (posts, pages, podcasts), draft handling, tagging every migrated post for later identification, and custom subscribe-anchor redirect paths.
- **What this buys you over the GUI wizard**: the CLI produces an intermediate Ghost-importable zip you can inspect, diff, or post-process before committing — useful if you want to run your own validation pass (checking paywall-gating reconstruction, embed sanitization, image re-hosting) before the import actually lands in a live Ghost instance.
- **Paid subscriptions**: the GUI flow requires connecting the *same* Stripe account already linked to your Substack, which is what allows existing subscriptions to carry over as live billing relationships instead of forcing a full re-subscribe. If you're scripting this instead of using the wizard, replicate that constraint deliberately — reconnecting a *different* Stripe account breaks the live-transfer path and forces the harder re-subscription flow on every paying subscriber.
- **Support ceiling**: Ghost(Pro) customers can escalate unusually large or messy migrations to Ghost's in-house migrations team — worth factoring into a build-vs-buy decision before you invest engineering time solving an edge case they've already productized.

## Option 3: WordPress via the Substack Importer plugin

No native support, so the entire path routes through a single free plugin (`substack-importer`, distributed via the standard WordPress plugin directory).

- **Transformation pipeline**: reads the Substack zip, converts post HTML into Gutenberg blocks (WordPress's native block-based content format), and separately emits a WXR file — WordPress's standard XML-based interchange format — so the stock WordPress Importer can complete ingestion. This two-stage conversion (proprietary-parse → standard-WXR → standard-import) is worth knowing if you ever need to intervene mid-pipeline, since the WXR is a normal, inspectable XML file you can patch by hand or script against before the final import step.
- **Coverage**: posts, images, author metadata, and publicly visible comments. No subscriber or billing migration whatsoever — this plugin's entire job is content.
- **Engineering implication**: because content and subscriber/billing migration are fully decoupled on this path (unlike Ghost's unified wizard), you get more control but also more integration surface to own yourself — you're responsible for choosing and wiring an ESP/membership layer, running the subscriber CSV import into it, and sequencing the Stripe move independently, with no single tool enforcing consistency across the three.

## Option 4: Custom stack, no importer — you own the whole parse

This is the build-it-yourself path: script the Substack zip apart and load it into a database schema you designed.

Concretely, a migration script needs to handle:

- **HTML parsing per post**: each post is a standalone HTML file. Extract title, publish date, and body via a standard HTML parser; expect Substack-specific markup (embed wrappers, subscribe-block CTAs, footnote formatting) that won't map cleanly to a generic schema without a sanitization pass.
- **Paywall/gating reconstruction**: paid-post gating isn't preserved as clean structured metadata in the export — cross-reference the posts-metadata CSV against your own paid-post list and reimplement the gating logic in your own app rather than expecting it to fall out of the HTML automatically.
- **Image re-hosting**: images referenced in the post HTML point at Substack-hosted URLs. Those will eventually 404 once you're independent of Substack, so the script needs to fetch and re-upload each image to your own storage and rewrite the `src` references, not just leave them pointed at Substack's CDN.
- **Subscriber CSV ingestion**: straightforward tabular parse into your subscribers table, but pull the "all columns" export variant rather than "visible columns only" — it includes engagement metadata (last-open timestamps, activity rating) that you need for the deliverability segmentation described below, and you cannot get it after the fact from anywhere except a fresh Substack export.
- **No safety net**: there's no vendor dry-run here. Build your own — row counts reconciled against what Substack's export summary reported, schema validation on required fields, and a staging environment before you point production traffic at the new tables.

For the hosting/database layer underneath this, I've already written the deploy mechanics in my Vercel + Supabase guides — cross-reference those for the actual infrastructure setup; this guide only covers getting Substack's data into whatever schema you land on.

## Deliverability and cutover engineering, by size tier

The four tool choices converge on the same underlying risk surface once you get to subscriber volume and paid billing — this is where the real engineering risk concentrates, not in the content parse.

- **Small (under ~1,000 subscribers)**: negligible warm-up risk — send volume is low enough that inbox providers won't flag a new sending domain. A hard cutover (DNS and sending flipped at once) is fine to script as a single deploy step.
- **Medium (1,000–50,000 subscribers, some paid)**:
  - Segment your subscriber import by engagement (Substack's full-columns CSV export includes an activity-rating field) and stage your first sends to the top engagement tier only. Ramp remaining tiers over roughly two to four weeks rather than a single blast — this is standard practice in newsletter migrations at this scale and mirrors what beehiiv's own migration documentation recommends for exactly this reason.
  - If you're self-hosting outbound mail (Ghost + your own transactional provider, or a custom SES/Postmark integration on a bespoke stack), configure and warm SPF/DKIM/DMARC on the new sending domain before cutover — treat it as a cold-domain reputation problem, because that's what it is.
  - Stripe: pause billing on the source platform before reconnecting the same Stripe account on the destination. Skipping this step is the direct mechanism behind double-billing — a subscriber's existing subscription and a newly-created one both firing in the same billing cycle.
  - A short parallel run (old platform in read-only mode while the new sending domain accrues reputation) is worth the operational overhead at this tier; a pure hard cutover carries real deliverability risk you can't fully mitigate after the fact.
- **Large (50,000+ subscribers, meaningful paid revenue)**:
  - Treat warm-up as a scheduled, monitored rollout, not a checklist item — stage by engagement decile if your data supports it, and gate advancement to the next tier on bounce-rate and spam-complaint thresholds you define in advance, not a fixed calendar.
  - Zero-downtime DNS cutover at this scale means sequencing TTL reduction on your DNS records well ahead of the actual cutover window (lower TTLs mean faster propagation of the eventual change), then executing the CNAME/A-record switch during a defined low-traffic window, with monitoring on both old and new endpoints during the propagation tail — expect stale resolver caches for up to 48 hours depending on registrar TTLs, independent of anything you control post-cutover.
  - The Stripe double-billing risk stops being a minor operational note and becomes a real financial-reconciliation problem at this scale — run the pause-then-reconnect sequence on a small subscriber batch first, verify no duplicate charges post-cutover, and only then proceed with the full base.
  - Redirect volume matters most here: even without a Substack sitemap to crawl, script your redirect rules directly from the posts-metadata CSV (it has your old slugs) rather than hand-authoring them, and prioritize your highest-organic-traffic posts if you're triaging under time pressure.

## Data governance by destination

Skip the reassurance — here's the actual control surface on each destination, because "I own my data now" means very different things depending on which of the four you pick.

| Destination | Who controls the server & database | Vendor still in the loop | Ongoing export/backup | Auditable code |
|---|---|---|---|---|
| OYS | You — it's licensed software you deploy on infrastructure you choose, not a hosted SaaS I operate on your behalf | Yes, narrowly: you're running code under a license from me, so update cadence and license terms still trace back to me even though the server and data are fully yours | Full DB access by default, plus the dry-run/commit import tooling above | No — OYS is licensed, not open source. You can read and export every row you own; you can't read the application source. |
| Self-hosted Ghost | You | Only if you opt into Ghost(Pro) hosting or their migrations team — a bare self-hosted install has zero vendor runtime access | Native export tools + direct DB access; `@tryghost/migrate`'s intermediate output is itself inspectable | Yes — Ghost core is MIT-licensed, public on GitHub, and actively released |
| Self-hosted WordPress | You | No — wordpress.org isn't in the data path; individual plugins may phone home, so audit anything you install (the Substack Importer plugin itself is open source too) | WXR export built in + direct MySQL access; WXR is a normal, inspectable XML file | Yes — WordPress core is GPLv2-licensed, arguably the most-audited CMS codebase in existence; plugin quality is uneven and not covered by the same guarantee |
| Custom app stack | You, plus whichever managed pieces you chose (e.g. Vercel + Supabase) | Yes — hosting/DB vendors set the SLA, pricing, and terms, and can change any of them unilaterally | Nothing automatic — you own the schema, so you own the export tooling, including your own dry-run/reconciliation logic | Yes for your own code; no for the managed platforms' internals — though the data itself lives in a portable format (Postgres) regardless of who's hosting it |

Don't conflate "self-hosted" with "open source" — they're orthogonal properties, and only two of these four destinations give you both. OYS and a custom stack get you physical/operational control of the data without code transparency; Ghost and WordPress get you both, at the cost of you (or your ops burden) being the entire support org.

## Managed cloud vs. renting your own server: the real tradeoff

If you're standing up the custom stack, or self-hosting Ghost/WordPress, this is the actual fork: pay a platform to manage the machine, or rent raw compute and run the stack yourself.

| | Managed/cloud (Vercel, Netlify, Railway) | Renting your own VPS (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| Security patching | Platform's problem | Yours — OS, DB engine, every dependency, on your own patch cadence |
| Incident response | Vendor's ops/on-call | You are the on-call rotation, full stop |
| Cost predictability | Cheap/free floor, usage-based ceiling that scales with traffic in ways you don't fully control | Flat server rent (roughly $4-15/mo for a small box), but that number excludes every hour of ops labor you're now donating to yourself |
| Data portability | Good — standard DB export paths, but you're still exporting *out of* someone else's platform | Total — it's your box, nothing is walled off, but "portable" here means you built the backup/export pipeline, not that one exists by default |
| Technical skill required | Moderate — config and API keys, not systems administration | High — SSH, firewall rules, WAL-aware backup strategy, patch management, intrusion monitoring |

Cross-reference my `deploy-on-vercel-and-supabase` guides and `deploy-on-hetzner-self-hosted-postgres` guides for the actual mechanics on either side — I'm not re-deriving either here.

The honest framing at this skill level: if you already run production infrastructure for a living, defaulting to managed hosting for this migration is often just inertia — you have the skill for the VPS path and are paying a recurring premium not to use it. Going the other way is just as much of a mistake: reaching for a bare VPS mainly to prove you can, without monitoring, alerting, and backup discipline already as muscle memory, is volunteering for outages you don't need and won't hear about until a subscriber tells you.

## Who this migration isn't for

- **You're picking the custom-stack path "for flexibility" without a concrete requirement it satisfies.** Flexibility you don't need yet is unmanaged risk with extra steps. Ship the migration on OYS's or Ghost's importer, and only build custom tooling once you hit a wall those two demonstrably can't clear — not before.
- **You don't already have monitoring and alerting wired up somewhere.** A bare VPS is not the place to discover you needed it. Self-hosting without alerting isn't "full control," it's silent downtime you find out about from an angry subscriber email instead of a dashboard.
- **You're treating data-governance purity as the priority over shipping.** If your list is small and unmonetized, spending expert-level engineering hours on the theoretical superiority of full self-hosting is optimizing a problem you don't have yet. Migrate with the importer, keep writing, and revisit infrastructure purity once there's real revenue or scale to protect.
- **You're re-implementing Stripe reconciliation, deliverability warm-up, and a CMS from scratch on a timeline that doesn't budget for all three going wrong at once.** They will not all go smoothly on the first attempt. If you don't have slack in the schedule for that, you're not ready for the custom-stack path this run — take OYS's or Ghost's importer, bank the migration, and build custom tooling on your own timeline afterward instead of your subscribers'.

None of this is about whether you have the skill — at this level you almost certainly do. It's about whether this particular migration is where that skill is actually well spent.

## My verdict

> **💡 Tip — Where I land**

Content migration is the solved part of this problem across all four destinations — OYS and Ghost both have purpose-built importers against the exact Substack export format, and WordPress is one well-maintained plugin away from the same outcome. The custom-stack path only earns its cost if you're building something that genuinely isn't a newsletter/blog, since you're re-solving a parsing problem three other tools have already solved well.

The actual engineering risk in any of these migrations is concentrated in two places that no importer fully automates: deliverability warm-up on a brand-new sending domain, and Stripe's pause-then-reconnect sequencing to avoid double-billing. Both are entirely predictable and avoidable with a staged rollout — but both are also exactly the kind of "worked fine in testing" failure mode that only shows up at real subscriber volume, so budget engineering time there, not in the HTML parse.

## Sources
- [Ghost Developer Docs: Migrating from Substack](https://docs.ghost.org/migration/substack)
- [Ghost migrate toolkit (npm)](https://www.npmjs.com/package/@tryghost/migrate)
- [Ghost mg-substack-csv package (npm)](https://www.npmjs.com/package/@tryghost/mg-substack-csv)
- [TryGhost/migrate on GitHub](https://github.com/TryGhost/migrate)
- [Substack Importer plugin — WordPress.org](https://wordpress.org/plugins/substack-importer/)
- [InstaWP: How to Migrate from Substack to WordPress](https://instawp.com/migrate-from-substack-to-wordpress/)
- [Substack: How do I export my posts](https://support.substack.com/hc/en-us/articles/360037466012-How-do-I-export-my-posts)
- [Substack: How do I export my email list](https://support.substack.com/hc/en-us/articles/6314498343700-How-do-I-export-my-email-list-on-Substack)
- [beehiiv: How to migrate from Substack to beehiiv](https://www.beehiiv.com/support/article/14966988360215-How-to-migrate-from-Substack-to-beehiiv)
- [Why Platformer is leaving Substack](https://www.platformer.news/why-platformer-is-leaving-substack/)
- [WordPress.org: GPL license](https://wordpress.org/about/license/)
- [TryGhost/Ghost core repository (MIT license) — GitHub](https://github.com/TryGhost/Ghost)
