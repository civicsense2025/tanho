---
title: "Moving off WordPress: your migration options (Expert)"
tagline: "Scripting the WXR parse, custom-field survival, and the four-destination redirect diff"
category: own-your-stack
source_platform: wordpress
difficulty: expert
cost_range_usd: "0-0/mo"
tags: ["blog", "cms", "migration", "platform-evaluation"]
level: expert
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can write a Node.js script using a streaming XML parser (e.g. sax)"
  - "Understands the WXR/RSS-XML schema (wp:postmeta, wp:post_type, wp:comment)"
  - "Can build a staging-table and diff pipeline before promoting to production"
  - "Can script confidence-scored redirect matching (exact, fuzzy, 410)"
  - "Comfortable with connection pooling and WAL-based backup concepts"
requirements:
  - "A WordPress WXR export, potentially split across multiple XML files for large sites"
  - "A scripting environment (e.g. Node.js) to parse and stage WXR data before import"
  - "A staging table or database to validate parsed records before writing to production"
  - "The old site's sitemap.xml to diff against your generated redirect mapping"
  - "Time budgeted for ACF/custom-post-type backfill and plugin-parity verification"
effort_hours_min: 8
effort_hours_max: 20
---

# Moving off WordPress: your migration options (Expert)

One framing note before the mechanics: this guide targets leaving **wordpress.com**'s managed tier or gutting an **old, unmaintained self-hosted install** — not WordPress.org self-hosted as a category, which remains one of the more defensible, ethical targets in this hub precisely because it's open-source and fully under your control. If you're rebuilding onto a fresh self-hosted WordPress, this same guide covers that path too (Option 3). What follows assumes you're comfortable with XML, connection pooling, and writing a migration script rather than clicking through a wizard.

## WXR as a parsing target

WXR is RSS 2.0 extended with WordPress-namespaced elements — it's not a bespoke format, which is exactly why it's the most tractable export to script against of anything in this hub.

- Root structure: `<rss><channel>`, with each post/page as an `<item>`.
- Per-item fields worth knowing if you're parsing directly: `<title>`, `<link>` (the old URL — critical for your redirect map), `<pubDate>`, `<dc:creator>`, `<content:encoded>` (the actual post body, HTML), `<excerpt:encoded>`, `<wp:post_id>`, `<wp:post_type>`, `<wp:status>`, and repeated `<category>` elements with a `domain` attribute of either `category` or `post_tag`.
- Custom fields (commonly from a plugin like Advanced Custom Fields) show up as repeated `<wp:postmeta>` blocks, each a `<wp:meta_key>`/`<wp:meta_value>` pair attached to the parent `<item>`.
- Custom post types are just a different `<wp:post_type>` value — the schema doesn't distinguish them structurally from regular posts, so your parser needs an explicit allowlist/mapping of which post types you care about and where each one lands in your new schema.
- Comments, if present, nest inside each `<item>` as repeated `<wp:comment>` blocks.

A minimal parse-and-stage script (Node, using a streaming XML parser to avoid loading a large export fully into memory):

```js
import sax from 'sax';
import fs from 'fs';

const parser = sax.createStream(true, { trim: true });
let currentItem = null;
let currentTag = null;
const posts = [];

parser.on('opentag', (node) => {
  currentTag = node.name;
  if (node.name === 'item') currentItem = { postmeta: [], categories: [] };
});

parser.on('text', (text) => {
  if (!currentItem || !text) return;
  if (currentTag === 'wp:post_type') currentItem.postType = text;
  if (currentTag === 'wp:status') currentItem.status = text;
  if (currentTag === 'link') currentItem.oldUrl = text;
  if (currentTag === 'content:encoded') currentItem.body = text;
});

parser.on('closetag', (name) => {
  if (name === 'item' && currentItem) {
    posts.push(currentItem);
    currentItem = null;
  }
});

parser.on('end', () => {
  fs.writeFileSync('staged-posts.json', JSON.stringify(posts, null, 2));
});

fs.createReadStream('export.xml').pipe(parser);
```

Stage into a holding table (or a JSON file for a small export) before writing to production tables — this is your dry-run equivalent when you're not using a platform with a built-in preview step. Diff staged output against expected post counts from the WordPress admin before promoting.

## Custom-field and plugin-data survival by destination

This is the edge case every generic WXR consumer handles differently, and it's worth being precise about where each of the four destinations actually stands:

- **OYS's WXR importer**: reads standard WXR fields (post/page content, categories, tags) reliably. Plugin-specific `<wp:postmeta>` — ACF fields, SEO-plugin metadata (Yoast/RankMath title and meta-description overrides), custom post types tied to a specific plugin's logic — is not something a general-purpose content importer on any platform maps automatically, because there's no shared schema for what a given plugin's fields *mean*. If you need that data preserved with intent, you're writing a small post-import script against OYS's API/DB to backfill it from the parsed `<wp:postmeta>` blocks in your original export, not relying on the importer itself.
- **Ghost's WordPress importer**: converts posts, pages, tags, authors, dates, and excerpts. Shortcodes get partial treatment (`[caption]`, `[audio]`, `[code]`, most `[vc_]`/`[et_]` builder shortcodes). ACF fields and custom post types are out of scope for the admin-panel importer entirely — Ghost's content model doesn't have an equivalent concept, so this data needs manual reconstruction if it matters, typically by hand-editing Ghost's importable JSON before running it through `@tryghost/migrate`'s pipeline.
- **WordPress-to-WordPress**: the only path where this data has a real chance of round-tripping cleanly, because `<wp:postmeta>` and `<wp:post_type>` are native WordPress concepts on both ends. The catch is the importer brings the *data*, not the *plugin* — ACF (or whatever defined the custom fields/post types originally) has to be installed and configured identically on the destination for that metadata to render or query correctly. Mismatched plugin versions or missing field-group definitions leave the data present in the database but invisible in the admin UI until the field groups are recreated.
- **Custom app stack**: full control, full responsibility. You decide what `<wp:postmeta>` keys matter, write an explicit mapping from WordPress meta keys to your own schema's columns/JSON fields, and skip anything irrelevant. This is the only path where you're not fighting someone else's content model.

> **⚠️ Warning — WooCommerce and membership data is out of scope everywhere**
>
> None of the four paths above — including WordPress-to-WordPress via the standard content importer — move WooCommerce orders/products or membership/paid-subscriber state as part of a WXR-based migration. That data lives in separate database tables WordPress's Tools → Export doesn't touch. If a site has commerce or membership data, treat that as an entirely separate migration with its own dedicated export tool (WooCommerce has its own product-CSV exporter; membership plugins vary), scoped and planned independently from the content move.

## Redirect strategy, scripted

For OYS specifically, the bulk-redirect pipeline accepts a pasted list, a CSV, or a sitemap URL — which means you can generate your redirect mapping programmatically from the same WXR parse and feed it in as a batch rather than relying purely on the auto-generated per-post 301s:

```js
// Build a from,to CSV from parsed WXR items, applying the dated-permalink pattern
const rows = posts
  .filter(p => p.status === 'publish')
  .map(p => {
    const oldPath = new URL(p.oldUrl).pathname;
    const dated = oldPath.match(/^\/(\d{4})\/(\d{2})\/([^/]+)\/?$/);
    const newPath = dated ? `/blog/${dated[3]}` : `/blog${oldPath}`;
    return `${oldPath},${newPath}`;
  });

fs.writeFileSync('redirects.csv', rows.join('\n'));
```

Feed that into Admin → Growth → SEO → Bulk redirects as a CSV; it'll come back with confidence-scored proposals (`exact-existing`, `similar`, `none-gone`) you review least-confident-first before committing as one rollback-able batch. This is strictly additive to the importer's automatic per-post 301s — useful for catching category archives, tag archives, or feed URLs the importer doesn't touch since it only creates redirects for content it actually imports.

For the custom-app path, there's no equivalent review UI, so build the confidence-scoring yourself: exact string match against your new route table, a fuzzy-match fallback (Levenshtein or trigram similarity) above some threshold, and an explicit `410` list for anything unmatched — don't ship silent 404s for a large site's worth of previously-indexed URLs.

## Site-size implications for a scripted migration

- **Small blog (dozens of posts)**: a single-pass script, no batching, no resumability needed. Redirect mapping is short enough to eyeball entirely before committing.
- **Medium site (hundreds of posts, active plugin use)**: this is where you write the ACF/custom-field backfill step explicitly rather than skipping it — enumerate every distinct `<wp:meta_key>` present in the export before you start, and decide per-key whether it's presentational cruft (safe to drop) or actual content (needs a mapping target). Doing this enumeration up front avoids discovering missing data after go-live.
- **Large site (thousands of posts, years of dated permalinks, heavy search dependency, possibly WooCommerce/membership data)**: several things compound:
  - Stream-parse, don't load the whole file into memory — WXR exports at this scale routinely split into multiple XML files, and your script needs to process them in sequence while maintaining one consistent ID-mapping table (old WordPress post ID → new record ID) across all of them, since cross-references (internal links, parent/child page relationships) span files.
  - The dated-permalink regex handles the common case, but a large, old site accumulates real anomalies — manually-set slugs, imported-from-elsewhere posts with non-standard date logic, category-based rather than date-based permalinks in earlier years of the site's life. Budget explicit review time for the tail of non-conforming URLs rather than assuming one regex covers everything.
  - WooCommerce/membership data, if present, is a hard scope boundary for every path here — flag it as an entirely separate migration project before you start, so it doesn't silently fall through the cracks of "the WordPress migration is done."
  - The old-sitemap-fetch safety net stops being optional at this scale. Script a diff between your redirect mapping's source URLs and every `<loc>` in the old sitemap.xml — anything present in the sitemap but absent from your mapping is a gap, and at thousands of posts you will have gaps a manual review won't catch.

## Data governance by destination

Same governance split underlies every technical decision above: wordpress.com's ToS grants Automattic unilateral content-removal and account-suspension rights ("with or without notice"), because an infrastructure boundary sits between you and your data. Self-hosted WordPress — Option 3 in this guide — removes that boundary entirely. Worth being precise that "moving from WordPress to WordPress" here crosses a real governance line even though it doesn't cross a format line.

| Destination | Server/DB control | Vendor can unilaterally change terms or pull access | Export/backup surface | Code auditability |
|---|---|---|---|---|
| **OYS** | Full — licensed, self-hosted software deployed on infrastructure you choose; not a multi-tenant SaaS. | No vendor account layer sits on your running deployment. | Native Postgres; scriptable export via Bulk redirects' CSV/sitemap ingestion, plus direct DB access for anything else. | Deployment and data are fully yours; the application source itself is licensed rather than published open source, so audit is behavioral/contractual, not source-level, unlike WordPress/Ghost below. |
| **Self-hosted Ghost** | Full. | No. | `ghost export` (full JSON), or dump the underlying MySQL/SQLite instance directly. | MIT-licensed, source public on GitHub — full static/dynamic analysis is on the table. |
| **Self-hosted WordPress** | Full. | No — this is the governance delta of Option 3 versus wordpress.com. | `wp export`, direct MySQL access, or read `<wp:postmeta>`/`<wp:post_type>` straight out of your own WXR. | GPLv2, source public — same audit tier as Ghost. |
| **Custom app stack** | Full, bounded by whatever host/DB you provisioned. | Inherited entirely from your underlying vendor — see below. | Exactly what you build; no floor, no ceiling. | 100% — it's your repository. |

## Managed cloud vs. renting your own server: the real tradeoff

This guide doesn't cover hosting provisioning directly — see my Vercel + Supabase guides for the managed path and my Hetzner + self-hosted Postgres guides for the bare-VPS path — but the tradeoff matters for whichever of the four destinations above you land on, since none of them dictate where they run.

| | Managed/cloud (Vercel, Netlify, Railway, wordpress.com's managed tier) | Self-managed VPS (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| Security patching | Automated, vendor-owned | Your responsibility: OS, runtime, Postgres itself |
| Incident response | Vendor SRE/support | You, including WAL-based recovery if it goes sideways |
| Cost predictability | Usage-based (bandwidth, invocations, seats) — can move against you at scale | Flat compute cost (Hetzner's CX line runs roughly €4-8/mo at time of writing), plus off-site backup storage you provision separately |
| Data portability | Strong if you avoid vendor-proprietary extensions on top of standard Postgres | Maximal by construction — it's your VM — but zero tooling ships with it; you write the export/backup pipeline yourself |
| Technical skill required | Low-moderate | SSH hardening, firewall configuration, connection pooling (PgBouncer), WAL-based point-in-time recovery — operational engineering, not a checkbox |

## Who this migration isn't for

Named plainly, not softened:

- **Anyone treating a WXR import as a single irreversible operation.** Every path here still requires diffing staged output against expected post counts, spot-checking permalink reconciliation, and — on the WordPress-to-WordPress path specifically — confirming custom-field plugin parity between source and destination. A migration script with no staging table and no diff step isn't expert-level; it's just under-tested.
- **A large, plugin-heavy, or WooCommerce-dependent site, independent of the operator's skill level.** WXR structurally excludes WooCommerce orders/products and membership/paid-subscriber state — that data lives in tables `Tools → Export` never touches. No amount of scripting skill recovers data that was never in the export to begin with; it requires a separate, dedicated migration scoped on its own.
- **Anyone unwilling to run a staging cutover before touching DNS or production data.** ACF field-group mismatches, custom-post-type rendering failures, and shortcode conversion gaps only surface once you actually render the imported content — catching that in production instead of staging is an avoidable, self-inflicted risk regardless of how many WXR fields you can name from memory.
- **A one-off migration that doesn't justify script maintenance.** If you're not going to re-run this (incremental sync, multi-environment promotion, recurring content pulls), building the full staging-table/diff/rollback apparatus described in this guide may cost more engineering time than using OYS's or WordPress's built-in importer and accepting its constraints.

None of this is a skill gate so much as a scoping discipline — the WXR format's limits are the same for every operator; what changes with skill level is how much of the gap you can close yourself versus needing to plan around it.

## Where I land

- **OYS** remains the strongest default even at expert level — the native WXR importer plus scriptable bulk-redirect input (CSV/sitemap) gives you both the smoothest path and the most room to layer custom logic (like the ACF backfill or the dated-permalink regex) on top without fighting the platform.
- **Ghost** is the right call if you want to leave the WordPress ecosystem and don't have significant custom-field/plugin-data dependency — its importer is solid up to ~2,500 posts, and `@tryghost/migrate`'s CLI gives you a scriptable escape hatch past that.
- **WordPress-to-WordPress** is the only path with a real shot at preserving custom-field and custom-post-type data without a bespoke backfill script, provided the destination has the same plugins installed — worth it specifically when plugin-driven structure is the main thing you can't afford to lose.
- **Custom app stack** is where I'd land if the destination schema genuinely doesn't resemble a CMS — otherwise the manual WXR parsing and redirect-scoring work isn't buying you anything the other three don't already give you for less effort.

## Sources
- [WordPress.com: Export WordPress Content](https://wordpress.com/support/export/)
- [WordPress.org: WordPress Importer plugin](https://wordpress.org/plugins/wordpress-importer/)
- [WP-CLI export-command on GitHub](https://github.com/wp-cli/export-command)
- [Ghost Developer Docs: Migrating from WordPress](https://docs.ghost.org/migration/wordpress)
- [TryGhost/migrate on GitHub](https://github.com/TryGhost/migrate)
- [@tryghost/migrate on npm](https://www.npmjs.com/package/@tryghost/migrate)
- [Learn WordPress: Tools — Import and Export](https://learn.wordpress.org/tutorial/tools-import-and-export/)
- [Kinsta: How to Migrate WordPress.com to WordPress.org](https://kinsta.com/blog/wordpress-com-to-wordpress-org/)
- [WordPress.org: About the GPL license](https://wordpress.org/about/license/)
- [Ghost Developer Docs: License](https://docs.ghost.org/license/)
- [WordPress.com Terms of Service](https://wordpress.com/tos/)
- [WordPress.com: Suspended content and sites](https://wordpress.com/support/suspended-blogs/)
