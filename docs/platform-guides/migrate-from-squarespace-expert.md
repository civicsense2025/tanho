---
title: "Migrate off Squarespace (Expert guide)"
tagline: "Scripting the migration — parsing WXR-format XML and handling the commerce-data gap programmatically"
category: own-your-stack
source_platform: squarespace
difficulty: expert
cost_range_usd: "0-45/mo"
tags: ["migration", "website-builder", "squarespace"]
level: expert
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can write a script to parse XML/RSS data in any language"
  - "Comfortable building an async fetch-and-upload image pipeline"
  - "Can configure redirect logic in application code or middleware"
  - "Experience with WP-CLI or other scripted/headless admin tooling"
  - "Can design a site crawl or scraper for 7.1 sites with no export"
requirements:
  - "A Squarespace 7.0 XML export, or a crawling/scraping tool for 7.1 sites"
  - "Cloud storage (S3, Supabase Storage, Cloudflare R2) to re-host extracted images"
  - "Search Console's indexed-URL data for exhaustive redirect mapping"
  - "A destination schema or database ready to receive parsed content"
  - "A dev environment to write, test, and run the migration script"
effort_hours_min: 15
effort_hours_max: 60
---

# Migrate off Squarespace (Expert guide)

This is the systems-level pass on getting off Squarespace: what the export actually contains at the XML-node level, how the three off-the-shelf tools (Ghost, WordPress, OYS) handle it, and how to script the equivalent yourself for a custom stack. I'm assuming you've read the evaluation-guide series and know the shape of the gap already — this is about execution.

## The blocking constraint: confirm export availability first

Squarespace's export is WXR-style XML (WordPress's eXtended RSS format), available only on **7.0**. **7.1 sites cannot generate this file at all** — there is no API endpoint, no hidden export flag, no version of Settings → Import & Export that produces it on 7.1. This is a platform-level omission, not a bug you can route around with API calls.

Practical implication: check the version before scoping any migration project. On 7.1, every parser-based approach below is moot, and your only paths are:

- A site crawl (headless browser or `wget`/`curl`-based scraper) capturing rendered HTML, asset URLs, and internal link structure.
- A commercial scraping-based migration tool that hits the live rendered site instead of an export file.
- Manual reconstruction, which at any real page count is a budget-and-timeline conversation, not a scripting problem.

Everything else in this guide assumes 7.0 XML is available.

## What's actually in the XML, structurally

The export is WXR — the same schema WordPress itself uses for import/export — so `<item>` nodes per post/page, with `<wp:post_type>`, `<content:encoded>` (the HTML body), `<wp:status>`, `<category>` (mapped to tags/categories downstream), and standard RSS fields (`<title>`, `<pubDate>`, `<dc:creator>`).

Confirmed present:
- Blog posts and standard (non-specialty) pages — full HTML body content, publish date, author
- Category taxonomy per post

Confirmed absent, regardless of destination:
- Binary image files — only `<img>` tag references survive inside `<content:encoded>`, still pointing at Squarespace's CDN
- Design/CSS/template/navigation structure — none of this is representable in WXR
- Gallery, portfolio, cover, index, calendar, and store page types — excluded page types, not malformed data
- Digital product records — non-exportable under any mechanism Squarespace exposes
- Structured data (schema.org markup) and page-level SEO metadata

This is the same underlying file every destination below consumes — Ghost's migrator, WordPress's importer, and OYS's importer are all parsing the same WXR structure, which is why they share identical blind spots.

## Destination internals

**Ghost**: the Admin UI migrator (Settings → Advanced → Import/Export) wraps `@tryghost/mg-squarespace-xml`, part of the open-source `@tryghost/migrate` monorepo. For anything beyond the UI's defaults — custom field mapping, bulk pre-processing, non-standard content transforms — install the CLI directly (`npm install --global @tryghost/migrate`) and invoke `migrate squarespace <path-to-xml> [flags]`. Squarespace categories map to Ghost tags; the first category per post becomes the primary tag. Image rehydration is not automatic — the migrate toolkit's image-handling step needs to be explicitly configured to fetch and re-host referenced media rather than leaving CDN-hosted `<img src>` pointers in place, which is the default behavior multiple migration write-ups report. Ghost's own redirects tutorial documents common Squarespace URL patterns, but generation isn't automatic the way OYS's importer is — plan a `_redirects` file or Ghost's redirects.json manually for 301 coverage.

**WordPress**: the native WordPress Importer plugin (Tools → Import → WordPress) consumes WXR directly since it's WordPress's native format — no transform layer needed, which is the structural reason this path has the least friction of the three. For image rehydration at scale, plugins like Auto Upload Images hook into the post-import content, regex-match external image URLs still pointing at Squarespace, fetch them server-side, and rewrite the URLs in place — this is closer to "solved" here than on Ghost or OYS today, purely because of WordPress's plugin ecosystem depth. For a scripted/headless approach instead of the plugin UI, `wp import` via WP-CLI accepts the same WXR file non-interactively, which is the better fit for a batch or CI-driven migration.

**OYS**: the Squarespace importer is registered in `src/modules/importers/shared/registry.ts` and reads the same WXR export. Verified from the internal recipe doc (`docs/recipes/migrate-from-squarespace.md`): the importer auto-creates a 301 redirect per imported post/page from the old URL to the new one, generated at import time rather than requiring a separate redirect-building pass. Scope is identical to the other two — posts/pages only, no images/CSS/commerce. The separate Bulk redirects tool (Admin → Growth → SEO) can fetch an old `sitemap.xml` and propose exact/similar/410 mappings for anything outside the importer's coverage — useful both as a catch-all after the importer runs and as the primary tool if you're rebuilding a 7.1 site's redirects by hand with no XML to drive an automated import at all. For Squarespace's dated blog permalink shape (`/blog/YYYY/MM/DD/slug`), a single wildcard regex rule (`^/blog/\d{4}/\d{2}/\d{2}/([^/]+)/?$` → `/blog/$1`) collapses the entire pattern into one rule instead of one redirect per post.

## Scripting it yourself for a custom stack

If you're parsing the XML into a custom schema instead of using an off-the-shelf importer, the shape of the script is:

1. **Parse WXR with a standard RSS/XML library** (any language — WXR is just namespaced RSS 2.0). Iterate `<item>` nodes, filter by `<wp:post_type>` to separate posts from pages.
2. **Extract and normalize fields**: title, slug (derive from `<link>` or `<wp:post_name>`), body HTML (`<content:encoded>`), publish date, author, category list.
3. **Extract image references from body HTML** with an HTML parser (not regex) against `<content:encoded>` — collect every `<img src>` pointing at a Squarespace CDN domain.
4. **Fetch and re-host referenced images** — download each asset, upload to your own storage (S3, Supabase Storage, Cloudflare R2, whatever your stack uses), and rewrite the `src` attributes in the stored body HTML to point at the new location. Do this as an explicit pipeline step; skipping it silently reproduces the "broken image" failure mode reported against the default Ghost and OYS flows.
5. **Generate redirects programmatically**: build a `{oldPath: newPath}` map from every parsed `<link>` to its new destination route, then feed that into your framework's redirect config (middleware, `next.config.js` redirects, or a database-backed redirect table) at deploy time — this reproduces what OYS's importer does automatically, and what Ghost and WordPress require you to build separately.
6. **Handle the commerce gap as an entirely separate ingestion path**: WXR has no product, order, or inventory data. If commerce migration is in scope, that's a distinct project — Squarespace exposes physical/service product data as a separate CSV export (not part of the XML at all), and digital products aren't exportable through any mechanism, meaning digital-goods catalogs require manual recreation on the destination regardless of how sophisticated your XML parser is.
7. **Reconstruct structured data manually or via a secondary enrichment pass** — schema.org markup and meta descriptions don't exist in the source file, so if SEO continuity matters, budget an LLM-assisted or manual re-authoring pass against your new page set rather than expecting any part of this to be scriptable from Squarespace's own data.

For hosting the resulting custom app once content is migrated, see the deploy guides in this same docs folder covering Vercel + Supabase — that covers infrastructure; this guide stops at getting content out of Squarespace and into your schema.

## Site-size implications for a scripted migration

- **Small site**: the script above is overkill for a few dozen pages — manual reconstruction plus one of the off-the-shelf importers is faster than writing and testing a parser. Reserve scripting for sites large enough that manual work doesn't scale.
- **Medium site with commerce**: this is where the commerce-data ingestion path (step 6) becomes non-optional rather than theoretical — budget it as its own workstream with its own timeline, separate from the content-parsing script.
- **Large, active store with real order history and high search-traffic dependency**: order history and product catalogs need a dedicated migration path entirely independent of the WXR parsing described here — none of it lives in that file. On the redirect side, generate your `{oldPath: newPath}` map exhaustively against Search Console's indexed-URL list, not just the XML's `<link>` values, since high-traffic pages you've since deleted or restructured may not appear in either the current XML or a live crawl but still hold search equity worth protecting with a 301 rather than letting it 404.
- **Regardless of size**: verify 7.0/7.1 status before writing a single line of parser code — a 7.1 site invalidates the entire XML-parsing approach and forces the crawl-based fallback instead.

## Data governance by destination

Breaking this down at the infrastructure-ownership layer, since "you own your data" is a necessary but not sufficient claim — the more precise question is which layer a third party still controls.

| Destination | Server/DB control | Vendor lock-in surface | Backup/export mechanism | Code auditability |
|---|---|---|---|---|
| **OYS** | Full — licensed, self-hosted software; you deploy the process to infrastructure you provision. There's no OYS-operated multi-tenant service in the request path. | Zero at the application layer (no OYS-run SaaS to be locked into); your actual lock-in surface is whatever infra you chose underneath it — VPS provider, managed Postgres, etc. | Direct `pg_dump`/Turso export against your own instance, no rate limits or API quotas gating it | Deployed code is yours to inspect at the file-system level; license is not yet a public open-source grant — treat "auditable" as "auditable by you," not "independently reviewed by a maintainer community" |
| **Self-hosted Ghost** | Full — same self-hosted deployment model | Zero at the application layer for the self-hosted path (Ghost(Pro) reintroduces this if you choose managed hosting instead) | Settings → Advanced → Import/Export produces a full JSON dump; direct DB access for anything the export omits | MIT-licensed, source on GitHub, maintained by the Ghost Foundation, a Singapore-based nonprofit funded by users rather than investors |
| **Self-hosted WordPress** | Full — same self-hosted deployment model | Zero at the application layer (WordPress.com reintroduces this if you choose that hosted option instead) | Native WXR export via `wp export` (WP-CLI) or Tools → Export, plus unrestricted DB access — the largest ecosystem of migration/backup tooling of any option here | GPLv2, the most widely deployed and reviewed CMS codebase in existence by market share |
| **Custom app stack** | Application code is fully yours; infrastructure control depends entirely on the hosting layer you pair it with | Real if paired with a managed platform (Vercel + Supabase is the pairing covered in my deploy guides) — you're subject to that platform's pricing/ToS changes at the infra layer even though the app code itself is fully portable | Direct SQL access regardless of provider since Postgres is Postgres, but managed-Postgres providers add their own backup/export tooling on top | Fully yours to audit, but with no external maintainer community — code quality and security review are entirely a function of your own or your contractor's diligence |

The infrastructure-ownership question and the code-ownership question are separable, and worth evaluating separately rather than treating "self-hosted" as a single monolithic guarantee — OYS and self-hosted Ghost/WordPress all clear the infrastructure bar, but only Ghost and WordPress currently clear the "independently auditable open-source license" bar.

## Managed cloud vs. renting your own server: the real tradeoff

This decision sits one layer below the destination choice — it's about where the self-hosted option (or custom app) actually runs, and it applies identically whether you land on OYS, self-hosted Ghost, self-hosted WordPress, or a fully custom stack.

| | Managed/cloud (Vercel, Netlify, Railway) | Self-managed VPS (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| **Security patching** | Platform-managed at the OS/container/runtime layer; you're responsible only for your own dependency tree | Fully yours — kernel and package updates, runtime version bumps, and any exposed service (SSH, Postgres, nginx) need an explicit patch cadence you own |
| **Incident response** | Platform SRE teams handle infrastructure-level incidents on their control plane and edge network; a bad deploy or an N+1 query in your app is still your incident | You are the entire on-call rotation unless you've built or paid for monitoring and alerting yourself |
| **Cost model** | Usage-metered — bandwidth, function invocations, build minutes, seats. Predictable at low scale, can produce real bill volatility as traffic or team size grows | Fixed monthly cost per instance, independent of traffic, until you need to resize the box — more predictable, but excludes the opportunity cost of your own ops time |
| **Data portability** | High for stateless app code, since these are largely standard Node/static hosts under the hood; your database is typically a separate managed service (Supabase, Neon, etc.) with its own export path and potential egress considerations | Highest achievable — a full disk snapshot or `pg_dump` transfers to any other Linux VPS provider with no vendor-specific export format to navigate |
| **Technical skill required** | Low to moderate — CI/CD-style deploys, minimal server administration | Moderate to high — Linux administration, firewall/security-group configuration, process supervision (systemd or equivalent), and log-based debugging when something fails outside business hours |

My deploy-on-vercel-and-supabase guides cover the managed side of this in depth; my deploy-on-hetzner-self-hosted-postgres guides cover the self-managed side, and are explicit that it's advanced-only territory independent of how comfortable you are with the CMS-migration mechanics covered here.

## Who this migration isn't for

Even at this level of detail, there are cases where "read the docs and script it" isn't the right call:

- **A 7.1 site with a non-trivial page count and no budget for a crawl-based pipeline.** Writing a WXR parser is straightforward; writing a reliable site crawler that captures rendered content, asset URLs, and internal link structure without missing JS-rendered content is a meaningfully bigger and less well-trodden engineering problem. If that's not already in your toolkit, this becomes a research spike before it's an execution task — budget accordingly rather than assuming your XML-parsing skills transfer.
- **A large active store with real order history, regardless of how good your parser is.** This is worth stating plainly even to an expert audience: WXR has no product, order, or inventory data, full stop. There is no clever parsing approach that recovers it, because it was never in the file. Commerce migration here means a separate CSV-based product export for physical/service products, plus manual reconstruction for anything digital — treat it as an independent project with its own data model, not a step in the content-migration script.
- **Anyone underestimating the image-rehydration and redirect-generation steps as "the easy part."** These are the two steps every off-the-shelf tool (Ghost, WordPress, OYS) either does partially or not at all, and that's not an accident — they're genuinely more failure-prone than the XML parsing itself: rate limits and hotlink protection on the old CDN, ambiguous slug-to-path mapping, and orphaned old URLs no longer in the XML but still holding search equity. Scope real time for these, not just the parser.

Where the required skill actually sits, by task:

| Task | Skill level required | Who shouldn't attempt it solo |
|---|---|---|
| Parsing WXR into a custom schema | Standard XML/RSS parsing, any language | Non-developers — hire this out |
| Image URL extraction + re-hosting pipeline | HTML parsing (not regex), async fetch/upload against S3-compatible storage | Developers unfamiliar with handling failed fetches and rate limits gracefully — build in retry logic or expect broken images at scale |
| Redirect map generation | Straightforward key-value mapping, but requires cross-referencing Search Console data, not just the XML | Anyone treating this as an afterthought — the mapping logic is easy, but the source-of-truth data (indexed URLs) requires deliberate cross-checking |
| 7.1 crawl-based extraction | Headless browser scripting or a commercial scraping tool | Anyone without prior scraping experience — this is a different skill set from WXR parsing entirely, don't assume it's a smaller version of the same problem |
| Commerce data migration | Separate ingestion pipeline against Squarespace's CSV product export; digital goods require manual recreation | Anyone assuming this rides along with the content script — it doesn't, and treating it as a subtask under-scopes the whole project |

None of this changes based on how comfortable you are with the CMS-parsing side of things. A 7.1 site or a real store is a harder migration than a 7.0 blog regardless of how experienced the person running it is — the constraint is in what Squarespace exposes, not in your skill level.

## Sources
- [Squarespace: Exporting your site](https://support.squarespace.com/hc/en-us/articles/206566687-Exporting-your-site)
- [Ghost Developer Docs: Migrating from Squarespace](https://docs.ghost.org/migration/squarespace)
- [Ghost: open-source migration tools (TryGhost/migrate)](https://github.com/TryGhost/migrate)
- [@tryghost/mg-squarespace-xml package](https://www.npmjs.com/package/@tryghost/mg-squarespace-xml)
- [Ghost Forum: Importing images from Squarespace Blog](https://forum.ghost.org/t/importing-images-from-squarespace-blog/55719)
- [Ghost tutorial: implementing redirects (Squarespace section)](https://ghost.org/tutorials/implementing-redirects/)
- [WordPress.com Support: Import from Squarespace](https://wordpress.com/support/import/import-from-squarespace/)
- [WPBeginner: How to Properly Move from Squarespace to WordPress](https://www.wpbeginner.com/wp-tutorials/how-to-properly-move-from-squarespace-to-wordpress/)
- [Ghost Developer Docs: Hosting Ghost](https://docs.ghost.org/hosting)
- [Ghost (blogging platform) — Wikipedia](https://en.wikipedia.org/wiki/Ghost_(blogging_platform))
- [WordPress.org: License](https://wordpress.org/about/license/)
