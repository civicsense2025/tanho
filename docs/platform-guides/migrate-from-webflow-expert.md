---
title: "Moving off Webflow: your migration options (Expert guide)"
tagline: "Scripting the Data API extraction, and what CSV can't preserve at scale"
category: own-your-stack
source_platform: webflow
difficulty: expert
cost_range_usd: "0-100/mo"
tags: ["website-builder", "migration", "platform-evaluation"]
level: expert
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can write an OAuth-authenticated API extraction script"
  - "Comfortable handling API pagination and rate-limit backoff logic"
  - "Can build an ID-remapping pipeline for reference fields"
  - "Able to normalize rich text into a destination's import format"
  - "Experience writing directly to a destination's API or database"
requirements:
  - "A registered Webflow app (client ID/secret) or a scoped Site Token for API access"
  - "A destination schema or database ready to receive normalized content"
  - "A migration window that accommodates Webflow's 60 requests/minute rate limit"
  - "Search Console or equivalent indexed-URL data to validate redirect coverage"
  - "A dev environment to write, test, and re-run the extraction script"
effort_hours_min: 20
effort_hours_max: 100
---

# Moving off Webflow: your migration options (Expert guide)

No native Webflow importer exists on any of the four destinations I cover across this series — OYS, self-hosted Ghost, self-hosted WordPress, or a fully custom stack. I confirmed this directly against each ecosystem's own tooling rather than assuming it: no `mg-webflow` package in Ghost's open-source migrate toolkit, no Webflow entry in OYS's importer registry, and nothing purpose-built on WordPress.org beyond general CSV importers. This guide is terser than my beginner and intermediate versions and assumes you already know what a CMS Collection, a CSV export, and an OAuth flow are. I'm going straight to what each destination actually requires and where scripting a Data API extraction beats CSV.

## Why CSV is the default and where it breaks

Webflow's static code export excludes Collection content entirely — confirmed in Webflow's own docs. The per-Collection CSV export is the only built-in content-extraction path, and it has real structural limitations worth naming precisely:

- **Reference and multi-reference fields** export as Webflow's internal item identifiers, not human-readable values — you're remapping IDs to your destination's foreign keys by hand or by script regardless of destination.
- **Rich text fields** come out as Webflow's own HTML-ish serialization. It round-trips reasonably into another HTML-consuming system but needs normalization if your destination expects Markdown or a structured document format (Ghost's lexical editor, for instance).
- **No bulk export** — one CSV per Collection, full stop. A site with a dozen Collections is a dozen manual export actions with no API-free way to batch them.
- **Static pages aren't in scope at all.** CSV only ever covers Collection-bound content; hand-built pages are a separate rebuild on every destination.

At meaningful item counts, these limitations compound: hand-remapping reference IDs across a few hundred rows is tedious; across tens of thousands it's not a realistic manual process, which is the actual argument for the Data API approach below.

## Data API extraction: the concrete script

This is the approach I'd actually script for a large site or a custom-app destination. Webflow's Data API is documented, versioned, and OAuth-based.

**Auth setup:**

- Register an app in Webflow's developer settings to get a client ID and secret.
- For a single-site migration script you control, a **Site Token** (scoped to one site) is simpler than full OAuth — skip the authorization-code dance if you're not building something that needs to act across multiple users' sites.
- If you are building multi-tenant tooling (say, an OYS-style importer meant to run for arbitrary users' Webflow sites), you need the full OAuth 2.0 authorization code flow: redirect the user to Webflow's consent screen with your requested scopes (`cms:read` is sufficient for a read-only extraction), exchange the returned code for an access token, and store the refresh token since access tokens expire.

**Pagination:**

- Webflow's Collection Items list endpoint paginates with `offset` and `limit` query parameters (limit maxes out at 100 items per request as of this writing).
- A correct extraction loop keeps requesting with an incrementing offset until the returned item count is less than the requested limit, rather than trusting a total-count field that can be stale under concurrent edits.
- Do this per Collection — there's no cross-Collection paginated endpoint, so your script iterates your Collection list first, then paginates Items within each one.

**Rate limits:**

- Default ceiling is 60 requests/minute, shared per site across every integration hitting that site's API — not 60 per script. If anything else is querying the same site concurrently, you're sharing the bucket.
- A 429 response includes a `Retry-After` header (typically 60s) plus `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers. A well-built extraction script checks `X-RateLimit-Remaining` proactively and slows down before hitting 429, rather than reactively backing off after every rejection.
- For a Collection in the thousands of items, budget the extraction as a multi-minute-to-hour job by construction. This is not a performance bug to engineer around — it's the actual shape of the constraint. Batch endpoints exist for CMS Items where available and should be preferred over strictly sequential per-item calls.

**Field normalization:**

- Typed fields (number, date, boolean) come back typed — no string-parsing required, unlike CSV.
- Reference and multi-reference fields resolve to Item IDs. Build an ID-remapping table as you ingest Collections in dependency order (parent Collections referenced by others first), so by the time you process a Collection with reference fields, you already have the destination-side IDs to remap into.
- Rich text fields still need HTML normalization for a non-HTML destination, same as the CSV path — the API doesn't solve that problem, it just gets you there with everything else intact.

Run this as a script that writes into whatever destination you're targeting — a Supabase table if you're building custom, or a transform step feeding into OYS's or WordPress's content-type/import APIs if you're scripting against one of the other three destinations instead of hand-running their CSV importers.

## Destination-specific notes at the expert level

- **OYS**: no native importer, confirmed against the importer registry — content types get created via the admin UI or, if you're comfortable in the codebase, as a code-defined entity schema for anything needing custom public templates. The genuinely strong part of OYS for this migration is still the URL layer: Bulk redirects accepts a pasted list, a 2-column CSV, or a sitemap.xml fetch, validates the batch (blocking self-loops and duplicate sources, warning on redirect chains over 3 hops or shadowed routes), and commits as one rollback-able unit. For a large Collection-derived path structure, a single wildcard rule (`/posts/* -> /blog/$1`) covers the whole pattern instead of per-item rows.
- **Ghost**: no `mg-webflow` package exists in `@tryghost/migrate`. The Udesly partner integration is theme-conversion only — it does not touch CMS content. A real migration script targeting Ghost needs to produce Ghost's specific JSON import shape: a `meta` object (`exported_on` as an epoch-millisecond timestamp, `version` matching your target Ghost release) and a `data` object containing posts. Content defaults to Ghost's lexical format unless you explicitly set an HTML source on each post — get this wrong and posts import with blank bodies, which is an easy, silent failure mode to miss in a batch import if you're not spot-checking output.
- **WordPress**: no dedicated Webflow importer exists; WP All Import is the realistic tool, built for general CSV/XML mapping rather than Webflow specifically. At expert scale, WP All Import's field-mapping templates can be saved and reused across repeated imports (useful if you're importing Collection-by-Collection rather than trying to merge everything into one CSV first), and pairing with Auto Upload Images handles the externally-referenced image URLs Webflow CSVs typically contain. For anything beyond a few hundred items, consider driving WP All Import's import via its supported CLI/cron-triggered re-imports rather than repeated manual UI runs, so a corrected CSV can be re-processed without re-clicking through the wizard.

## Site-size tiers, with the API threshold made concrete

- **Small (a handful of static pages, no CMS)**: skip all of the above — there's no Collection data to extract. Rebuild the pages by hand on any destination and handle redirects as a short pasted list.
- **Medium (one or two Collections, moderate item counts)**: CSV export plus manual or lightly-scripted field mapping is still the pragmatic choice here. Writing a full OAuth-based extraction pipeline for a Collection with a few dozen items is more setup cost than the CSV route saves you.
- **Large (many Collections, high item counts, meaningful organic search traffic)**: this is the threshold where I'd actually recommend the Data API script over CSV, for three concrete reasons — reference-field integrity (CSV flattens these, the API preserves resolvable IDs), the sheer number of manual CSV export/import cycles across many Collections, and redirect volume, where OYS's sitemap-fetch (or an equivalent scripted approach against another destination) needs the real page/item count to propose a complete mapping rather than you reconstructing it by hand. Budget this as a real project: a scripted extraction plus destination-side ingestion, tested against a subset of Collections before running the full migration, with the redirect batch reviewed lowest-confidence-first before commit.

## Data governance by destination

| Destination | Server/DB control | Vendor lock-in surface | Export/backup | Code auditability |
|---|---|---|---|---|
| **OYS** | Full — licensed, self-hosted software deployed on infrastructure you control; not a SaaS account. | None at the hosting layer (no vendor-run instance to lose); license terms for the software itself still apply to modification/resale, not a permissive OSS grant. | Direct Postgres access plus Bulk redirects import/export tooling; no rate-limited vendor export queue. | Full read access to the running codebase; redistribution/modification rights are license-scoped, not OSI-open. |
| **Self-hosted Ghost** | Full. | None. | Direct DB access plus native JSON export/import. | Full — MIT core. |
| **Self-hosted WordPress** | Full. | None. | Direct DB access plus WXR export. | Full — GPL. |
| **Custom app stack** | Full for app code; DB control inherits whatever hosting/DB vendor you chose. | Whatever your underlying vendor's ToS says — this destination has no governance profile of its own. | Exactly as good as the schema/backup strategy you engineer. | Full — you own the code. |

Three of four destinations put governance entirely in your hands at the infrastructure layer by construction. The custom-app path is only as governed as the hosting decision underneath it — which is the actual variable, not the app code itself.

## Managed cloud vs. renting your own server: the real tradeoff

Same tradeoff I cover in the deploy-on-vercel-and-supabase and deploy-on-hetzner-self-hosted-postgres guides, stated for whichever destination you're standing up infrastructure for:

| | Managed/cloud (Vercel, Netlify, Railway) | Renting your own VPS (Hetzner, DigitalOcean Droplet) |
|---|---|---|
| Patching | Vendor-managed, opaque. | Self-managed, explicit (unattended-upgrades, image rebuilds, dependency bumps). |
| Incident ownership | Vendor covers infra-layer incidents; app-layer failures are yours regardless of host. | Entirely yours unless you've built monitoring/paging. |
| Cost model | Usage-metered (bandwidth, invocations) — cheap at low volume, non-linear at scale. | Fixed compute cost, independent of request volume, until you resize the box. |
| Portability | App code portable; deploy/env config is platform-specific. | Full — no API dependency to extract data or config. |
| Operational skill floor | Low. | Linux administration, network/firewall config, backup automation, TLS renewal, monitoring — Coolify/Dokploy reduce but don't remove this. |

Neither is the "advanced" choice by default — a large team running Vercel at scale is arguably running more sophisticated infrastructure than a solo dev self-hosting Postgres on a single Hetzner box. Pick based on which failure mode you'd rather own: unpredictable usage billing, or being the pager.

## Who this migration isn't for

Stated at expert-level precision:

- **Large, multi-Collection sites with no engineering time allocated.** There's no importer for Webflow on any of these four destinations. At scale, the only paths are manual CSV recreation or a scripted Data API extraction — both require either your time or someone else's. If neither is budgeted, a paid migration vendor or contract developer is the correct answer, not a compressed DIY timeline.
- **Anyone treating the CSV path as lossless.** It isn't, structurally — reference fields flatten to internal IDs, rich text needs renormalization per destination, and there's no batch export. If you're not planning to validate the round-trip programmatically (row counts, reference integrity, spot-checked rich text rendering), don't ship the migration as "done" off a CSV import alone.
- **Anyone who can't absorb rate-limit-bound extraction time.** A large Collection under Webflow's 60 req/min shared ceiling is a real multi-minute-to-hour job by construction. If your migration window doesn't accommodate that, either provision more lead time or accept the CSV path's tradeoffs instead of fighting the API's actual constraints.
- **Anyone unwilling to own redirect QA at scale.** Automated sitemap-fetch proposals (OYS) or scripted equivalents still need lowest-confidence-first human review before commit. Skipping that step on a high-traffic site is how migrations quietly cost real search ranking.

None of these are reasons to avoid the migration — they're the actual cost structure of a CSV-first ecosystem with no native Webflow support. Scope the project against them honestly before committing a timeline.

## Sources

- [Webflow Data API docs](https://developers.webflow.com/data/docs/data-clients)
- [Rate Limits – Webflow Developer Documentation](https://developers.webflow.com/data/reference/rate-limits)
- [Authenticating with the Webflow API](https://developers.webflow.com/data/reference/authentication)
- [How do I export my Webflow site code? – Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961386739347-How-do-I-export-my-Webflow-site-code)
- [Can you export a Webflow website? Understanding code export limitations](https://brixtemplates.com/blog/can-you-export-a-webflow-website-understanding-code-export-limitations)
- [TryGhost/migrate on GitHub](https://github.com/TryGhost/migrate)
- [Official Ghost + Udesly Integration](https://ghost.org/integrations/udesly/)
- [What's format of JSON file for import to Ghost? – Ghost Forum](https://forum.ghost.org/t/whats-format-of-json-file-for-import-to-ghost/4399)
- [How to Migrate From Webflow to WordPress (in 6 Steps) – Kinsta](https://kinsta.com/blog/webflow-to-wordpress/)
- [Exporter for Webflow – WordPress plugin](https://wordpress.org/plugins/exporter-for-webflow/)
