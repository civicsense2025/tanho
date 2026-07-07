---
title: "Migrate off beehiiv (Expert Guide)"
tagline: "Moving your newsletter and subscribers to a platform you actually own"
category: own-your-stack
source_platform: beehiiv
difficulty: expert
cost_range_usd: "0-100/mo"
tags: ["newsletter", "migration"]
level: expert
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can write and operate a script handling API auth, pagination, and rate-limit backoff"
  - "Can implement a queue/backoff pattern (e.g. Bottleneck, Celery, Sidekiq) for rate limits"
  - "Can write a custom HTML cleanup function (DOMDocument/DOMXPath) for an import pipeline"
  - "Can run a dry-run reconciliation of subscriber counts and tier mapping before cutover"
  - "Can debug an auth failure, a 429 response, or a partial write unattended"
requirements:
  - "A beehiiv API key or OAuth2 app credentials with access to posts and subscriptions endpoints"
  - "A destination database/schema already designed, if building the custom-app path"
  - "Awareness of beehiiv's 180 requests/minute rate limit when planning a large-list crawl"
  - "The beehiiv-connected Stripe account, for a manual customer/subscription transfer"
  - "A staging or sandbox run before executing the migration against production data"
effort_hours_min: 10
effort_hours_max: 24
---

# Migrate off beehiiv (Expert Guide)

You're planning or scripting an actual beehiiv migration, not reading about the concept. This guide is scoped to mechanics: what each of the four realistic destinations — self-hosted Ghost, self-hosted WordPress, a custom app, and Own Your Site (OYS) — actually requires, and, since beehiiv has a real API, exactly what a migration script against it needs to handle. I've already covered pricing and platform evaluation in a separate guide; this one assumes you've decided to leave and need the execution detail.

## The three-part decomposition

Every path in this guide splits the same way:

- **Content** — posts, generally the least risky to move.
- **Free/confirmed subscribers** — a data-shape problem, solvable via CSV or API.
- **Paid billing** — a live two-party Stripe operation on every single destination, because beehiiv's Stripe connection cannot be reassigned to another platform. No destination in this guide automates this step for you.

## Destination: self-hosted Ghost

Ghost is the only destination here with a maintained, first-party beehiiv connector, and it's worth using even if you're eventually landing somewhere else, since it establishes a clean intermediate export:

- **In-app migrator**: Ghost Admin → Settings → Advanced → Import/Export → beehiiv. It authenticates against beehiiv with an API key you generate yourself, lets you pick the beehiiv site and whether to bring posts and/or subscribers, and shows a pre-commit count.
- **CLI packages**, part of the open-source `TryGhost/migrate` monorepo, for offline/CSV-based conversion instead of a live API connection:
  - `@tryghost/mg-beehiiv` — takes a beehiiv posts CSV export and a `--url` flag, outputs a Ghost-importable zip.
  - `@tryghost/mg-beehiiv-members` — takes a beehiiv members CSV export, outputs a Ghost-importable members CSV.
  - Install via `npm install --global @tryghost/migrate`, run with `migrate beehiiv --posts /path/to/posts.csv --url https://example.com`.
- **Paid billing**: Ghost's own docs state plainly that the Stripe account tied to a beehiiv site can't be reused elsewhere. The documented path is a Stripe customer/subscription transfer between accounts, and Ghost publishes an open-source `mg-stripe` package (in the same `migrate` monorepo) specifically for scripting that transfer if you're self-hosting.
- **URL structure gotcha**: beehiiv uses `/p/` as a path segment in public post URLs; Ghost uses `/p/` for post *previews*. Ghost's migration docs publish the exact regex needed to disambiguate old beehiiv URLs from Ghost's own `/p/` preview routes in a `redirects.yaml` file, because a naive `/p/*` redirect would break preview links on the new site.

Of the three self-hosted-style destinations, this is the one where someone else has already done the schema-mapping work. Start here if Ghost's content model is otherwise acceptable to you.

## Destination: self-hosted WordPress

No dedicated plugin exists. The documented, real-world pattern (per Newsletter Glue's published walkthrough, a company whose product sends WordPress-native newsletters) is:

1. Export `Settings → Export Data → Export All Posts` and `Export All Basic Subscribers` from beehiiv as CSVs.
2. Import via WP All Import, mapping beehiiv's CSV columns to WordPress post fields.
3. Beehiiv's exported post HTML carries newsletter chrome — author photo `<img>` tags, "view in browser"/author profile `<a>` links, layout tables — that don't belong in a WordPress post body. The documented fix runs each row's HTML through a custom PHP function during import, using `DOMDocument`/`DOMXPath` to isolate the `<h1>` title, strip `profile_picture`-sourced images and `/authors/` links, then extract only the article body `<p>` tags from the content table cell. WP All Import's Function Editor is where this function lives; the field mapping expression becomes `[clean_beehiiv_html({content_html[1]})]`.
4. Subscriber CSV import follows the same plugin pattern, but WordPress isn't a sending engine — pair it with a newsletter-sending plugin or an external ESP.
5. Paid billing: same manual Stripe-to-Stripe transfer as every other destination.

If you're scripting this rather than doing it by hand, the HTML-cleaning step is the part worth automating first — it's mechanical, deterministic, and the highest-volume manual task if you have more than a few dozen posts.

## Destination: a custom app — scripting directly against beehiiv's API

This is the destination where beehiiv's own infrastructure choices work in your favor. Since beehiiv ships a documented, scoped REST API, a migration script talking to it directly is more reliable for beehiiv content specifically than routing through any import format built for a different platform's schema. Concrete implementation notes, verified against beehiiv's current developer docs:

**Auth**: two options —
- Static API key, scoped per-workspace, sent as `Authorization: Bearer <token>`. Simplest for a one-time migration script you run yourself.
- Full OAuth2 (authorize/token/introspect/revoke flow) if you're building something that acts on behalf of another beehiiv user rather than your own account.

**Pulling posts**: `GET /v2/publications/:publicationId/posts`, with an `expand` query parameter that can include `free_web_content`, `free_email_content`, `free_rss_content`, `premium_web_content`, and `premium_email_content` — meaning one paginated crawl of this endpoint returns full post HTML in whichever rendering context you need, no separate export or scraping step required. Filter by `status=confirmed` to skip drafts, and by `audience=free|premium|all` if you want to segment gated content during the pull.

**Pulling subscribers**: the Subscriptions endpoints (`GET /v2/publications/:id/subscriptions`, plus lookup by email or ID) expose status, custom fields, and tier data. For a one-time bulk load into your own database, this read path plus your own writes is more transparent than an opaque CSV round-trip.

**Pagination — read this before you write a crawl loop**: beehiiv currently supports two pagination modes and is actively deprecating one:
- **Cursor-based (current, recommended)**: pass `limit` (1-100, default 10) and, after the first page, `cursor` from the previous response's `next_cursor`. Keep looping while `has_more` is `true`. No total count is returned — this method is optimized for consistency on a list that may be changing mid-crawl, at the cost of not knowing your total up front.
- **Offset-based (deprecated)**: `page` + `limit`, capped at page 100 — beyond that, requests now return a 400 error with migration guidance in the response. Deprecation warnings already ship in response headers (`X-Pagination-Warning`, `X-Pagination-Migration-Guide`). Write new migration scripts against cursor pagination; don't build new offset-based code even though it technically still runs today.

**Rate limits**: flat 180 requests/minute per organization (not per API key), with `RateLimit-Limit`/`RateLimit-Remaining`/`RateLimit-Reset` headers on every response and a `429` on overage. beehiiv's own docs recommend a queue-plus-exponential-backoff pattern and explicitly suggest Bottleneck (JS), Celery (Python), Sidekiq (Ruby), or SQS/QStash for anything beyond a quick script — their published reference implementation throttles to roughly one request per 350ms with a small concurrency cap, which comfortably stays under the 180/minute ceiling with margin for retries.

**Bulk subscriber writes**: for pushing subscribers into a *new* beehiiv-side list this doesn't apply to you as the migrator, but worth noting if your custom app needs the reverse direction later — `POST /v2/publications/:id/bulk_subscriptions` accepts an array of subscriptions in one call rather than looping individual creates, returning an `import_id` for async status tracking.

**What the API cannot give you**: Stripe billing state. Paid-subscriber and revenue data lives inside beehiiv's Stripe connection, not the beehiiv API surface — budget that as a fully separate, manual Stripe-to-Stripe operation regardless of how clean your API script is.

A minimal script shape: authenticate with a scoped API key → cursor-paginate `/posts` with full content expansion, writing each into your own content table → cursor-paginate `/subscriptions`, writing emails/status/custom fields into your own subscriber table → run the Stripe transfer as an entirely separate, manual-verification step → cut over sending.

## Destination: Own Your Site (OYS)

Stated plainly: OYS has no dedicated beehiiv importer today. Its importer registry covers Ghost, WordPress (WXR), Squarespace, Substack, Medium, generic RSS/Atom, and Markdown ZIP — beehiiv isn't in that list, and this guide isn't going to imply otherwise. Realistic paths, in order of turnkey-ness:

- **RSS, content only**: beehiiv's RSS feed has a configurable "Attributes" panel where "full article" is one of the togglable fields (alongside image, title, date, categories, author, description). If you enable full-article output on your feed, OYS's generic RSS importer can ingest post content. This gets you zero subscriber data — it's a content-only path.
- **Markdown ZIP conversion**: script the beehiiv posts CSV export into individual `.md` files with YAML frontmatter (title, slug, date, tags) matching what OYS's Markdown ZIP importer expects, zip them, and run it through that importer. This is a small, deterministic transform — parse CSV rows, template each into a `.md` file, zip.
- **API-sourced conversion**: if you're already scripting against beehiiv's API for a custom-app migration (see above), the same pulled post data can just as easily be reshaped into the Markdown ZIP format instead of a custom database schema — reuse the fetch logic, change only the output writer.
- **Manual**: legitimate for a handful of posts.

Subscriber migration onto OYS isn't covered by any importer — pair it with whatever subscriber/sending system you're pointing OYS at. Once content has landed, OYS's Admin → Growth → SEO → Bulk redirects tool (wildcard/regex rules, or fetching an old sitemap to propose mappings) handles URL preservation for whatever public post/landing-page URLs beehiiv exposed.

## Cross-cutting concerns, sized to list scale

- **Small (under 2,500 subscribers — beehiiv's free Launch ceiling)**: any of the four destinations is a same-day task. The missing dedicated importer (WordPress, OYS) costs you an hour of scripting or manual entry, not a project.
- **Medium (a few thousand subscribers, paid Scale plan, some paid revenue)**: budget the CSV-to-format conversion as its own work item, and treat the Stripe transfer as a checklist with an explicit verification step — reconcile subscriber counts and tier mappings before canceling beehiiv-side billing.
- **Large (50,000+ subscribers, meaningful paid revenue via beehiiv's 0%-platform-fee monetization)**: this is where a naive per-record loop becomes untenable — at 180 requests/minute even a lean single-record crawl of 50,000 subscribers is roughly 4-5 hours of API time alone before you've written anything to a destination, so paginate with the largest safe `limit` (100) and parallelize writes to your destination independent of the read throttle. The Stripe transfer at this scale needs a dry-run/reconciliation pass, not a single manual pass-through, and a hard, verified point where beehiiv-side billing is paused before any customer communication about the new billing system goes out — double-billing at this scale is a support and refund problem, not a minor inconvenience.

## Parallel-run vs. hard cutover, and deliverability

- **Deliverability warm-up** applies identically across all four destinations: a new sending domain/IP has no reputation with Gmail/Outlook/etc. Ramp volume over 1-2 weeks post-cutover rather than sending your full list immediately; segment by engagement if your new platform supports it and warm up against your most-engaged readers first.
- **Parallel run** is the safer default once paid subscribers are involved — verify the new system sends correctly and that Stripe billing has actually transferred before fully retiring beehiiv-side sending.
- **Hard cutover** is reasonable for a free-only, small list where the downside of a mistake is limited to a missed send, not a billing error.

## Data governance by destination

"Self-hosted" gets used loosely. It's worth being precise about which layer of control each destination actually gives you, because it isn't the same layer in all four cases:

| Destination | Who physically controls the server/database | Third-party vendor still in the loop | Ongoing export/backup | Platform code auditability |
|---|---|---|---|---|
| **Own Your Site (OYS)** | You — OYS ships as licensed, self-hosted software you deploy on infrastructure you choose. No OYS-operated server or managed instance sits in the data path. | None at the hosting layer — but you're dependent on your own infra provider, and on OYS's licensing terms holding for future upgrades, since you can't fork the software if that relationship changes. | Your database, your access — standard ops (scheduled dumps, WAL archiving, whatever your DB supports) apply with no vendor export API in the middle. | No. Licensed, not open-source — you can deploy and operate it, but you can't read or fork the source, which matters if you need to verify behavior rather than trust documentation. |
| **Self-hosted Ghost** | You, on infrastructure you manage — MIT-licensed, so no legal barrier to self-hosting or forking. | Zero, if genuinely self-hosted; Ghost(Pro) reintroduces a vendor if you choose managed hosting instead. | Ghost Admin's native JSON export (content + settings) plus unmediated database access (SQLite by default, MySQL for production) if self-hosting. | Yes — MIT license, source public on GitHub, forkable without permission. |
| **Self-hosted WordPress** | You, on any host — GPLv2, the largest self-hosted install base of any CMS. | Only your infra provider, and only if it imposes its own restrictions (e.g., a locked-down managed WordPress host). | `Tools → Export`, plus direct MySQL/MariaDB access — `wp-cli db export` makes this a one-line cron job. | Yes — GPL, and the practical audit surface is enormous given install-base scrutiny (security researchers, plugin ecosystem). |
| **Custom app** | You, at every layer — server, database engine, schema, all chosen by you. | Only what you deliberately introduce (managed Postgres, a PaaS runtime). | Whatever you implement — a scheduled `pg_dump`/`mysqldump`/equivalent, versioned and tested like any other ops task. | Yes, trivially — it's your own codebase. |

The distinction that actually matters at this level: Ghost, WordPress, and a custom app give you both database control *and* source-code auditability — you can verify what the software does, not just what it's documented to do. OYS gives you the first without the second: you own the runtime and the data, but the codebase itself is a black box you're trusting rather than reading. Whether that tradeoff is acceptable depends on your threat model — for most newsletter migrations it's a non-issue, but it's worth naming plainly rather than let "self-hosted" imply a uniform level of transparency across all four destinations.

## Managed cloud vs. renting your own server: the real tradeoff

Once you're past "which destination" and into "who operates the box," the managed-vs-VPS decision has real operational consequences that are easy to underweight during a migration, when attention is already split across content conversion, subscriber data, and billing:

| | Managed/cloud platforms (Vercel, Netlify, Railway) | Renting your own VPS (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| Who patches security updates | Platform-managed base images and runtime — patched on the vendor's cadence, invisible to you | You own the full patch surface: OS, kernel, container runtime, reverse proxy, every dependency |
| Who's on call if it goes down | Vendor's SRE/ops team; your exposure is a support queue and a status page | You, or whoever you've put on call — no external team is paged when your box falls over |
| Cost predictability | Usage-metered (bandwidth, build minutes, function invocations) — can spike hard with a traffic event | Flat monthly rate independent of load, until you outgrow the instance size and resize |
| Data portability | High for your application code; deploy configuration (build settings, env var scoping, edge functions) is platform-specific and doesn't move cleanly | Total — a generic Linux host with standard tooling (Docker, systemd, Postgres) is reproducible on any VPS provider with zero platform lock-in |
| Technical skill required | Moderate — CI/CD literacy, environment configuration, understanding the platform's specific request/response model (e.g., edge runtime constraints) | High — you're responsible for the reverse proxy, TLS renewal, firewall rules, backup automation, and incident response, or you're layering a tool like Coolify/Dokploy to absorb some of that |

Neither side eliminates operational work — managed platforms move the patching and uptime burden onto the vendor's schedule, not off the table entirely; a VPS moves it onto yours with more knobs and no guardrails. My Vercel + Supabase deploy guide covers the managed route's actual setup and its specific portability limits; my Hetzner self-hosted Postgres deploy guide covers the VPS route including the reverse-proxy layer and backup automation this table gestures at.

For a beehiiv migration specifically: unless you're already running production VPS infrastructure, I'd default to a managed platform for the destination app itself and treat "move to a VPS" as a deliberate follow-up project once the migration risk (content conversion, subscriber import, Stripe transfer) is fully retired. Compounding a first-time VPS setup with a live billing migration is where unrelated failures get misattributed to the wrong layer.

## Who this migration isn't for

Even at this level, worth stating plainly: the custom-API-script path — the one this guide treats as the strongest option for beehiiv content specifically — assumes you can write, test, and operate a script that handles auth, cursor pagination, rate-limit backoff, and a two-table write, unattended or nearly so. That's a real floor, and beehiiv's lack of a dedicated OYS or WordPress importer means more of this guide's readers get routed toward that floor than with source platforms that do have first-party importers elsewhere in this series.

This path isn't the right call if:

- **You're scripting this for the first time under time pressure.** A rushed first-time integration against a rate-limited, cursor-paginated API, combined with a live Stripe transfer, is exactly the setup that produces partial migrations and double-billing incidents. If you don't have slack to dry-run this against a sandbox or a small subset first, don't run it live.
- **You don't have a reconciliation step planned before canceling beehiiv billing.** At any real subscriber count, "it looked like it worked" isn't a verification step. If you can't produce a subscriber-count and tier-mapping diff between source and destination before you pull the trigger on canceling beehiiv-side billing, you're not ready for the cutover, regardless of how solid the script is.
- **You're building the custom-app destination and the OYS/WordPress/Ghost content models would honestly satisfy your requirements.** The API-script path is the right call when a custom schema is actually needed — not by default because it's the "more advanced" option. If Ghost's content model works for you, its maintained beehiiv connector is less surface area for the same result.
- **No one on the team can debug an auth failure, a 429, or a partial write at 2am.** This is an operational readiness question, not a coding-ability one — even a well-written script needs someone who can respond when it breaks mid-run.

And the floor beneath all of that: if the person actually doing this migration cannot write or debug code at all, no amount of guide detail changes that the API-script path is closed to them. That's true reading this file specifically as much as the beginner version — the skill requirement doesn't scale down. The honest alternatives are Ghost's native beehiiv migrator (API key, not code) or hiring a developer for what is realistically a few hours of scoped work for small-to-medium subscriber counts. Neither is a lesser outcome; they're the correct call when the coding floor isn't met.

## My verdict

> **💡 Tip — where I land**
>
> Ghost's first-party beehiiv connector is real engineering someone else already did — use it, or at minimum use its CLI packages as a CSV-normalization step, even if Ghost isn't your final destination. WordPress and OYS both require you to build the conversion yourself today; WordPress at least has a documented pattern to copy (CSV → WP All Import → DOMDocument cleanup), while OYS needs either the RSS full-content toggle or a Markdown ZIP conversion script. If you're building custom, beehiiv's API is good enough — real cursor pagination, documented rate limits, content-expansion parameters that hand you full HTML directly — that scripting against it beats forcing beehiiv's data through any import format not designed for it. Whatever you build, isolate the Stripe transfer as its own reviewed, verified step; it's the one part of this migration no destination automates, and it's the part most likely to generate a support ticket if it's wrong.

## Sources

- [Migrating from BeeHiiv — Ghost Developer Docs](https://ghost.org/docs/migration/beehiiv/)
- [@tryghost/mg-beehiiv — npm](https://www.npmjs.com/package/@tryghost/mg-beehiiv)
- [@tryghost/mg-beehiiv-members — npm](https://www.npmjs.com/package/@tryghost/mg-beehiiv-members)
- [TryGhost/migrate — GitHub](https://github.com/TryGhost/migrate)
- [How to migrate from Beehiiv to WordPress — Newsletter Glue](https://blog.newsletterglue.com/build/how-to-migrate-from-beehiiv-to-wordpress-newsletter-glue/)
- [beehiiv API Reference: List posts](https://developers.beehiiv.com/api-reference/posts/index)
- [beehiiv API Reference: Bulk Subscriptions](https://developers.beehiiv.com/api-reference/bulk-subscriptions/create)
- [beehiiv API Pagination](https://developers.beehiiv.com/welcome/pagination)
- [beehiiv API Rate Limiting](https://developers.beehiiv.com/welcome/rate-limiting)
- [How to enable and use RSS — beehiiv Help](https://www.beehiiv.com/support/article/9363537272215-how-to-enable-and-use-rss)
- [Exporting post content or subscriber data from beehiiv — beehiiv Help](https://www.beehiiv.com/support/article/12258595483543-exporting-post-content-or-subscriber-data-from-beehiiv)
- [TryGhost/Ghost — GitHub](https://github.com/TryGhost/Ghost)
- [License – WordPress.org](https://wordpress.org/about/license/)
