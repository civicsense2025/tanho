---
title: "Migrate off beehiiv (Intermediate Guide)"
tagline: "Moving your newsletter and subscribers to a platform you actually own"
category: own-your-stack
source_platform: beehiiv
difficulty: intermediate
cost_range_usd: "0-100/mo"
tags: ["newsletter", "migration"]
level: intermediate
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can write a small script to convert a CSV export into another platform's import format"
  - "Comfortable using a general CSV-import plugin like WP All Import"
  - "Can manually transfer Stripe customer records between two Stripe accounts"
  - "Can configure redirect rules to disambiguate a URL path conflict (e.g. /p/)"
  - "Can read basic API documentation (endpoints, pagination) to plan a script"
requirements:
  - "beehiiv's full CSV exports (posts and both quick/full subscriber exports)"
  - "A beehiiv API key, if using Ghost's native migrator or scripting against the API"
  - "Admin access to your chosen destination (Ghost, WordPress, a custom app, or OYS)"
  - "A tested reconciliation plan for subscriber counts and tier mapping before canceling beehiiv billing"
  - "A dedicated block of time set aside for the Stripe transfer specifically"
effort_hours_min: 6
effort_hours_max: 14
---

# Migrate off beehiiv (Intermediate Guide)

You know your way around exports, imports, and basic scripting, and you're evaluating how to actually move a beehiiv newsletter somewhere you control. This guide covers the real mechanics across four destinations — self-hosted Ghost, self-hosted WordPress, a custom app, and Own Your Site (OYS) itself. I already did the platform evaluation work in a separate guide on whether beehiiv is worth using in the first place; this one is entirely about the mechanics of leaving, verified against each destination's current tooling rather than assumed.

## The three things that move independently

Every newsletter migration splits into three jobs with very different levels of difficulty:

- **Content** (your published posts) — generally the easiest to move, though HTML cleanup varies by destination.
- **Free/confirmed subscribers** — usually a CSV export/import round-trip.
- **Paid subscribers and billing** — the hard part on every path, because it involves a live Stripe-to-Stripe operation, not just a data export.

beehiiv's own export tooling (Settings → Export Data) gives you "Export All Posts" and both a quick and full subscriber CSV export, the full one including custom fields and engagement stats. That's your starting raw material regardless of destination.

## Destination 1: Self-hosted Ghost

Ghost has the most complete first-party migration path of any destination in this guide, and it's worth understanding exactly what it does and doesn't cover:

- **Built-in migrator**: Ghost Admin → Settings → Advanced → Import/Export includes a dedicated beehiiv migrator. You generate a beehiiv API key, paste it in, select your beehiiv site, and choose whether to migrate posts and/or subscribers. Ghost shows a review screen with counts before you commit.
- **What it moves automatically**: post content and free/confirmed subscriber records, direct from beehiiv's API — no manual CSV wrangling needed for this part.
- **What it doesn't move**: paid billing. beehiiv's Stripe account can't be reused by another platform, so paid subscribers require a separate account-to-account Stripe customer transfer, done manually or with Ghost's own open-source `mg-stripe` tooling if you're self-hosting and comfortable with the command line.
- **URL redirects**: if you're using a custom domain, Ghost's own migration docs include a specific redirect rule set, because beehiiv uses `/p/` as part of its public post URL structure while Ghost uses `/p/` for post *previews* — the regex needed to disambiguate the two is nontrivial and Ghost publishes it directly in their migration docs rather than leaving you to reverse-engineer it.
- **CSV fallback**: if you'd rather not connect a live API key, or you're processing an existing export, `@tryghost/mg-beehiiv` (converts a beehiiv posts CSV export into a Ghost-importable zip) and `@tryghost/mg-beehiiv-members` (does the same for a members CSV) are open-source packages published on npm as part of Ghost's broader `migrate` toolkit.

This is the destination where "read the workflow, verify the schema" work is mostly already done for you by Ghost's own team — the risk surface is smaller here than on WordPress or a fully custom build.

## Destination 2: Self-hosted WordPress

There's no dedicated beehiiv-to-WordPress plugin. This is a genuine gap, and the real-world workaround looks like this:

- Export posts (Settings → Export Data → Export All Posts) and subscribers (Export All Basic Subscribers) as CSVs from beehiiv.
- Use a general CSV-import plugin — WP All Import is the one most commonly documented for this specific move — to map beehiiv's columns onto WordPress post fields.
- beehiiv's exported post HTML carries newsletter-specific cruft: author photo `<img>` tags, "view in browser" links, tracking artifacts. A documented approach (used by the Newsletter Glue team, who publish a walkthrough for exactly this migration) runs each post's HTML through a custom PHP function during import — using PHP's `DOMDocument`/`DOMXPath` to strip author images and links, then extract just the article body paragraphs — before WordPress saves it as a post.
- Subscriber import follows the same CSV-to-plugin pattern, but WordPress isn't a sending engine by itself — pair the imported list with a WordPress newsletter plugin or point it at an outside email service provider.
- Paid subscribers again require the manual Stripe-to-Stripe transfer, same as every other destination — WordPress has no special affordance here.

Budget real time for the HTML cleanup step if you have more than a handful of posts. It's mechanical but not zero-effort, and the "it just imports" experience Ghost offers doesn't exist here.

## Destination 3: A custom app

This is where beehiiv's own developer platform changes the calculus. beehiiv ships a genuine REST API — documented with an OpenAPI spec, authenticated by API key or OAuth2 — covering posts, subscriptions, segments, custom fields, tiers, and more. That makes a custom-built destination arguably the *cleanest* path for beehiiv content specifically, because you're pulling structured data through a real interface instead of reverse-engineering an export format:

- **Posts**: the List Posts endpoint (`GET /v2/publications/:id/posts`) supports an `expand` query parameter that can return `free_web_content`, `free_email_content`, `free_rss_content`, and the premium equivalents directly in the response — meaning a script can pull full post HTML without a separate export step.
- **Subscribers**: the Subscriptions endpoints (and the dedicated Bulk Subscriptions endpoint) expose emails, status, custom fields, and tier information — everything needed to recreate your list in your own schema.
- **What the API still can't do**: move Stripe billing. That relationship lives inside beehiiv's own Stripe connection and has to be extracted via a manual Stripe customer transfer regardless of destination.

If you're already comfortable standing up a database and writing a sync script, this is the destination I'd point you to for beehiiv specifically — more so than for platforms without a real API. I cover hosting specifics for a custom stack in my separate Vercel + Supabase deploy guide; this guide is scoped to getting the beehiiv data out, not standing up the destination.

## Destination 4: Own Your Site (OYS)

I want to be direct about where OYS stands today, since it's one of the four options and I'm not going to inflate its capability:

- OYS ships importers for Ghost, WordPress (WXR), Squarespace, Substack, Medium, generic RSS/Atom feeds, and Markdown ZIP archives.
- **There is no dedicated beehiiv importer.** Of the six source platforms OYS's importer registry covers plus beehiiv, this is the one with the least turnkey path.
- Three realistic options today:
  - If your beehiiv RSS feed's "Attributes" setting has "full article" enabled (beehiiv lets you toggle this per feed, rather than defaulting to a teaser/excerpt), OYS's generic RSS importer can ingest your post content — content only, no subscribers.
  - beehiiv's post CSV export can be transformed into the folder-of-Markdown-files-in-a-zip shape the Markdown ZIP importer expects, with a small conversion script (parse the CSV, write one `.md` file per row with YAML frontmatter for title/date/slug, zip it up).
  - For a small newsletter, manual copy-paste into OYS's post editor is a legitimate option.
- Subscriber migration onto OYS is not covered by any of the above — that's a separate CSV import into whatever subscriber/email system you pair with OYS.
- OYS's generic bulk redirect tool (Admin → Growth → SEO → Bulk redirects) handles URL preservation once content has landed — supports wildcard/regex rules or fetching an old sitemap to propose mappings, the same tool used for the other source-platform migration guides in this series.

## Deliverability, cutover strategy, and billing — across all four destinations

A few concerns apply no matter which destination you choose:

- **Deliverability warm-up**: a brand-new sending domain/IP on any destination has zero sending reputation with Gmail, Outlook, and other mailbox providers. Ramp sending volume up over 1-2 weeks rather than blasting your full list immediately after cutover — start with your most-engaged segment if your new platform supports segmentation.
- **Parallel-run vs. hard cutover**: for a free newsletter, a hard cutover on a low-stakes week is reasonable. For anything with paid subscribers, run both systems briefly in parallel — confirm the new system sends correctly and that billing has actually transferred — before fully retiring beehiiv.
- **Paid subscriber Stripe transfer**: every destination in this guide requires the same manual process — copy Stripe customer records from the beehiiv-connected Stripe account to a new one, map price/tier IDs, and explicitly cancel or pause billing on the beehiiv side afterward. Skipping that last step is how subscribers get charged twice.
- **List-size scaling of the "missing importer" problem**:
  - Under 2,500 subscribers (beehiiv's free Launch tier ceiling): manual copy or a single small script run is proportionate effort.
  - A few thousand subscribers on a paid Scale plan: budget a dedicated afternoon for the CSV-to-plugin or CSV-to-Markdown-ZIP conversion, and treat the Stripe transfer as its own project with a verification checklist.
  - 50,000+ subscribers with real paid revenue: this stops being a one-off task. You need either a properly paginated API script (beehiiv's List Posts and Subscriptions endpoints both paginate) or a carefully staged bulk import, plus a real double-billing safeguard — a dry run, a reconciliation report comparing old vs. new subscriber counts, and a defined go/no-go point before you cancel beehiiv billing.

## Data governance by destination

Every destination in this guide is "self-hosted" in the sense that beehiiv isn't — but "self-hosted" isn't a single tier of control. Worth breaking apart who controls what:

| Destination | Who physically controls the server/database | Third-party vendor still in the loop | Ongoing export/backup | Platform code auditability |
|---|---|---|---|---|
| **Own Your Site (OYS)** | You — OYS is licensed, self-hosted software you deploy on infrastructure you choose (a VPS, a cloud VM). No OYS-run server sits between you and your data. | No platform account to lose access to, but you still depend on your infrastructure host and on OYS's license terms for future versions. | Direct database access since it's genuinely your instance — backups are an ops task, not an export request. | No — licensed, not open-source. You can run it independently, but can't audit the source line-by-line. |
| **Self-hosted Ghost** | You, on a server you manage (or hire someone to manage) — Ghost is MIT-licensed. | None if you self-host; only relevant if you opt into Ghost(Pro)'s managed hosting instead. | Ghost Admin ships a native JSON export, plus you have raw database access if self-hosting. | Yes — MIT license, full source public on GitHub. |
| **Self-hosted WordPress** | You, on whatever host you pick — GPLv2, the most self-hostable CMS by installed base. | Only your hosting provider, and only if it's a restrictive one. | Native WordPress export tools (Tools → Export) plus direct MySQL/MariaDB access — `wp-cli` makes this scriptable. | Yes — GPL, and audited at scale simply by the size of its install base. |
| **Custom app** | You, entirely — server, database engine, and schema are all your choice. | Only whatever you deliberately add (a managed Postgres provider, a PaaS). | As easy as you build it — a scheduled `pg_dump` (or your database's equivalent) is standard practice. | Yes, trivially — it's your code. |

The practical difference this makes: if you're already comfortable running `pg_dump` on a cron job or reading a `wp-cli export` command, WordPress and a custom app give you the most literal, inspectable control. Ghost splits the difference — open code, but a purpose-built export flow so you're not reverse-engineering your own backups. OYS gives you the same "you control the server" property as the others, but the software itself isn't something you (or anyone outside OYS) can audit at the source level — a real tradeoff if code auditability specifically matters to you, separate from the question of who holds your data.

## Managed cloud vs. renting your own server: the real tradeoff

If your destination is a custom app (or even self-hosted Ghost/WordPress), you still have to decide where it actually runs. This is a separate decision from which CMS or database you pick, and it's worth being deliberate about it:

| | Managed/cloud platforms (Vercel, Netlify, Railway) | Renting your own VPS (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| Who patches security updates | The platform's infrastructure team, transparently, on their schedule | You — OS patches, runtime updates, container base images, all on you |
| Who's on call if it goes down | The platform's ops team; you file a ticket or watch a status page | You, or whoever you designate — no one else is watching your box |
| Cost predictability | Usage-based tiers that can spike with traffic or build minutes | Flat monthly price regardless of load, until you need a bigger box |
| Data portability | Reasonably good — your code and data aren't hostage, but your deploy config is platform-specific | Complete — it's a generic Linux server; the same setup runs anywhere that sells VPS capacity |
| Technical skill required | Moderate — `git push` deploys, environment variables, dashboard config | Higher — SSH access, a reverse proxy, TLS certs, firewall rules, and monitoring are your job unless you use a tool like Coolify |

Both routes are still "self-hosted" in the sense that matters for this guide — you're not renting a newsletter platform's data model. The real split is between paying a vendor for operational convenience (managed) versus paying only for raw compute and doing the operations yourself (VPS). I go deep on the managed route in my Vercel + Supabase deploy guide and the rent-your-own-server route in my Hetzner self-hosted Postgres deploy guide — both are written at this same intermediate level if you want the actual setup steps.

For a beehiiv migration specifically, where you're already juggling content conversion, subscriber import, and a Stripe transfer, I'd bias toward a managed platform unless you've run a VPS before. Save the "learn server administration" project for a moment when it isn't bundled with three other migration risks at once.

## Who this migration isn't for

Being straight about this: comfort with exports, imports, and "basic scripting" (as I described this guide's audience up top) is enough for the Ghost and WordPress paths, but it is not automatically enough for the custom-API-script path — and beehiiv, specifically, has no dedicated OYS or WordPress importer, which pushes more people toward that script path than with other source platforms in this series.

This migration path isn't a good fit if:

- **"Basic scripting" for you means editing a config file, not writing a loop with pagination and error handling.** The beehiiv API script described in the custom-app section needs to handle cursor pagination, rate-limit backoff, and a two-table write (posts + subscribers). If that's a stretch beyond your current skill, use Ghost's native importer instead of the API path — it does that work for you.
- **You don't have a tested rollback plan for the Stripe transfer.** A paid-subscriber double-billing incident is a support and refund problem, not a quick fix. If you're not confident verifying old-vs-new subscriber and billing counts before you cut over, don't do it live — have someone review the plan first.
- **You're the only technical person and the newsletter is your primary income.** A migration mistake that breaks sending or billing has real financial consequences. Consider a staged rollout with an easy revert, or bring in a second set of eyes before the point of no return (canceling beehiiv billing).
- **You're choosing WordPress or OYS purely to avoid learning Ghost's importer, not because you actually want their content models.** Both require more manual conversion work for beehiiv specifically. If Ghost's content model would otherwise work for you, its dedicated beehiiv connector is objectively less risk for the same outcome.

If you genuinely can't write or debug a script — not "haven't yet," but "can't and won't be able to for this project" — the honest move is Ghost's native beehiiv migrator (Settings → Advanced → Import/Export), which needs an API key, not code, or hiring a developer for a few hours to run the API script path for you. Neither is a downgrade; they're both legitimate given beehiiv's actual tooling gap.

## My verdict

> **💡 Tip — where I land**
>
> Ghost is the most turnkey destination for beehiiv content and free subscribers specifically, because someone at Ghost already built and maintains the connector — that's real engineering effort you get for free. WordPress and OYS both require you to do CSV-to-format conversion work yourself, WordPress with an existing documented pattern (WP All Import plus HTML cleanup), OYS with a bit more DIY since there's no plugin ecosystem doing this for you yet. If you're building custom anyway, beehiiv's real API makes that path more reliable than forcing your data through any import format — script directly against `posts` and `subscriptions` rather than round-tripping through CSV. Whichever destination you land on, the Stripe transfer is the part every path treats as manual, so give it deliberate attention rather than rushing it at the end.

## Sources

- [Migrating from BeeHiiv — Ghost Developer Docs](https://ghost.org/docs/migration/beehiiv/)
- [@tryghost/mg-beehiiv — npm](https://www.npmjs.com/package/@tryghost/mg-beehiiv)
- [@tryghost/mg-beehiiv-members — npm](https://www.npmjs.com/package/@tryghost/mg-beehiiv-members)
- [TryGhost/migrate — GitHub](https://github.com/TryGhost/migrate)
- [How to migrate from Beehiiv to WordPress — Newsletter Glue](https://blog.newsletterglue.com/build/how-to-migrate-from-beehiiv-to-wordpress-newsletter-glue/)
- [How to enable and use RSS — beehiiv Help](https://www.beehiiv.com/support/article/9363537272215-how-to-enable-and-use-rss)
- [beehiiv API Reference: List posts](https://developers.beehiiv.com/api-reference/posts/index)
- [beehiiv API Reference: Bulk Subscriptions](https://developers.beehiiv.com/api-reference/bulk-subscriptions/create)
- [Exporting post content or subscriber data from beehiiv — beehiiv Help](https://www.beehiiv.com/support/article/12258595483543-exporting-post-content-or-subscriber-data-from-beehiiv)
- [TryGhost/Ghost — GitHub](https://github.com/TryGhost/Ghost)
- [License – WordPress.org](https://wordpress.org/about/license/)
