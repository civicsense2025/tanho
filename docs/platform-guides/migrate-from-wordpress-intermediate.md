---
title: "Moving off WordPress: your migration options (Intermediate)"
tagline: "WXR, redirect reconciliation, and what each destination's importer actually preserves"
category: own-your-stack
source_platform: wordpress
difficulty: intermediate
cost_range_usd: "0-0/mo"
tags: ["blog", "cms", "migration", "platform-evaluation"]
level: intermediate
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Comfortable with git, environment variables, and export/import pipelines"
  - "Can write or adapt a regex redirect rule for dated permalinks"
  - "Can read raw WXR/XML structure well enough to spot-check it"
  - "Can build a CSV of redirect mappings for bulk review"
  - "Basic understanding of plugin data (custom fields, custom post types)"
requirements:
  - "A WordPress WXR export (Tools → Export → All content), possibly split into multiple XML files"
  - "Access to the old site's sitemap.xml for redirect reconciliation"
  - "Destination platform admin access (OYS, Ghost, or WordPress) with import permissions"
  - "A way to build or paste redirect mappings (CSV, pasted list, or regex rule)"
  - "Time to verify custom-field and custom-post-type survival after import"
effort_hours_min: 4
effort_hours_max: 10
---

# Moving off WordPress: your migration options (Intermediate)

Quick framing before the mechanics, since "WordPress" is doing double duty in this guide's title: I'm not covering this because self-hosted WordPress.org is a bad platform — it's actually one of the more ethical, self-owned options in this whole hub, open-source and fully yours to run. This guide is for people leaving **wordpress.com** (the managed, hosted tier with real lock-in and pricing dynamics) or an **old, unmaintained self-hosted install** that's overdue for a rebuild. If you're comfortable with git, environment variables, and the general shape of an export/import pipeline, this guide skips the hand-holding and gets into what actually differs across your four destinations.

## The one file that matters: WXR

Everything here starts from **WXR** (WordPress eXtended RSS) — WordPress's native export format, an XML file containing posts, pages, categories, tags, and comments as structured, well-documented markup. Generate it from **Tools → Export → All content** in WordPress admin. No plugin, no API key, no third-party service required for the export itself.

- Under ~1,000 posts, you get a single `.xml` file.
- Past that, WordPress splits the export into multiple XML files bundled in a zip — import each one in sequence.
- Images aren't embedded in the file; it stores references, and most importers fetch the actual files during import, which means your **old site needs to stay reachable** while you run the import.

## Option 1: OYS — dedicated WXR importer, this is the strongest path in the hub

OYS ships a real, purpose-built WordPress importer, and it's worth being specific about why this is the cleanest migration path of any source platform this hub covers:

- **Admin → Content → Import**, choose WordPress, upload the `.xml`.
- A dry-run preview shows exact post/page counts before anything commits.
- On confirm, it **auto-creates a 301 redirect from every imported URL** to its new location — this is the part that saves you the most manual work compared to platforms with no native importer.

The one place this still needs your judgment is permalink-structure reconciliation. WordPress commonly uses dated permalinks (`/2019/03/my-post/`); if your new site uses a flatter structure (`/blog/my-post`), the importer's auto-redirects cover everything it actually imported, but they don't retroactively fix every dated URL that might be linked elsewhere on the web and never got crawled into your export. That's handled by OYS's **Bulk redirects** tool (Admin → Growth → SEO → Bulk redirects), which takes three input types:

- A pasted list of `from,to` mappings, one per line.
- A 2-column CSV.
- Your **old site's `sitemap.xml` URL** — OYS fetches it, reads every `<loc>`, and proposes a mapping for each old path: exact matches to already-imported pages, similarity-based matches above an 80% threshold, or a `410 Gone` candidate if nothing fits.

For the dated-permalink pattern specifically, a single regex rule handles the whole class of URLs in one shot:

```
# /2019/03/my-post/  ->  /blog/my-post   (regex match type)
^/\d{4}/\d{2}/([^/]+)/?$   ->   /blog/$1
```

Everything proposed through bulk mapping is reviewed **least-confident first**, committed as one batch, and rollback-able if something looks wrong post-launch.

> **[📸 SCREENSHOT PLACEHOLDER]** — OYS Bulk redirects screen showing sitemap-fetch proposals sorted by confidence
>
> _Replace this callout with the real screenshot before publishing._

## Option 2: Self-hosted Ghost

Ghost's WordPress importer lives in **Settings → Advanced → Import/Export** and is genuinely one of Ghost's best-supported source connectors — it's maintained by Ghost's own team, not a community plugin.

- Point it at your public WordPress URL, or upload the WXR `.xml` directly (entry point depends on Ghost version).
- Categories convert to tags; the first category on a post becomes Ghost's "primary tag."
- The built-in tool officially supports **XML files up to ~100MB and ~2,500 posts**. Beyond that, Ghost's own docs steer you to their open-source CLI toolkit — `@tryghost/migrate` on npm/GitHub — the same underlying engine that powers the Substack and Medium migrators covered elsewhere in this hub. It's a set of Node.js scripts (`migrate wp` being the WordPress-specific one) that fetch, transform, and produce a Ghost-importable zip, giving you scriptable control over large or unusual migrations instead of relying on the admin-panel wizard.
- Shortcode handling is partial: common page-builder shortcodes like `[caption]`, `[audio]`, `[code]`, and most Visual Composer (`[vc_]`) / Divi (`[et_]`) shortcodes convert; anything more exotic needs a manual pass.
- Ghost(Pro) customers with unusually large or messy migrations can hire Ghost's paid migrations team — a real option once volume or plugin-data complexity exceeds what the automated tool handles well.

## Option 3: Self-hosted WordPress — the most native pairing in this hub

This covers both sub-cases: wordpress.com to self-hosted, or old self-hosted install to a fresh one. Since you're moving WordPress content into WordPress, this uses WordPress's own built-in tools on both ends — no format translation happening at all.

1. Export via Tools → Export → All content on the source.
2. On the destination, **Tools → Import**, install the official **WordPress Importer** plugin (a small, WordPress-maintained plugin whose only job is reading WXR), and run it.
3. Map authors from old usernames to new accounts, opt into downloading attachments, and submit.

What this native pairing gets you that a cross-platform importer can't guarantee:

- **Custom fields and custom post types have the best odds of surviving here.** WXR includes `<wp:postmeta>` entries for custom fields (commonly populated by a plugin like Advanced Custom Fields) and `<wp:post_type>` for custom post types. A WordPress-to-WordPress import via the official importer preserves this metadata structurally, though the *plugin* that originally defined those fields or post types (ACF, a custom-post-type plugin, etc.) still needs to be installed and active on the new site for that data to render or behave correctly — the importer brings the data, not the plugin.
- Redirects are not automatic here the way they are with OYS. If your permalink structure is staying identical old-to-new, you may not need any — otherwise, you're setting up redirects manually via a plugin or your web server config, which is more manual work than either the OYS or Ghost path.

> **⚠️ Warning — WordPress-to-WordPress doesn't solve redirects for you**
>
> Unlike OYS's importer, WordPress's own Import tool has no built-in redirect-creation step. If you're changing permalink structure as part of this move (which is common when someone's modernizing an old site), plan your redirect strategy as a separate, explicit task — don't assume the importer handles it.

## Option 4: Custom app stack — parsing WXR programmatically

WXR is XML with a well-documented schema (it's an extension of standard RSS 2.0 with WordPress-specific namespaced tags), which makes it one of the more tractable formats to parse yourself if you're building a custom product rather than adopting an existing CMS.

- Each post is an `<item>` element; `<wp:post_type>`, `<wp:status>`, `<wp:postmeta>` (custom fields), and category/tag `<category>` elements are all there in predictable, documented locations.
- No dry-run, no confirm step — you own validation. Parse into a staging table first, spot-check, then promote.
- Redirects are entirely on you: build an old-URL-to-new-URL mapping table and serve 301s from your own routing layer or edge config.

For the hosting and database side of this path, see my Vercel + Supabase deploy guides — I cover provisioning and connection setup there in depth and won't duplicate it here. Once that foundation is live, your WXR-parsing import script is what plugs into it.

## Site-size considerations

- **Small blog (dozens of posts)**: negligible risk on any path. Redirect reconciliation, if needed at all, is a five-minute wildcard or regex rule.
- **Medium site (hundreds of posts, a handful of plugins in active use)**: this is where you start actually checking whether plugin-driven data survived the import — custom fields, a contact-form plugin's stored submissions (out of scope for any content importer regardless), or a custom post type used for something like a portfolio or team-bios section. Verify a representative sample of posts post-import rather than assuming full fidelity.
- **Large site (thousands of posts, years of dated permalinks, heavy organic-search dependency)**: three compounding problems show up here:
  - Redirect volume scales with post count, and dated-permalink patterns multiply the number of distinct URL shapes you're reconciling against — a regex rule handles the pattern, but only for URLs that pattern actually matches; anomalies (manually-edited slugs, imported-from-elsewhere posts with different date logic) need individual review.
  - "Many plugins in use" is the tier where generic WXR import most often falls short — Advanced Custom Fields data, custom post types tied to a specific plugin's rendering logic, and anything WooCommerce- or membership-related (orders, products, subscriber/paid-access state) is out of scope for every content importer named in this guide. That data needs a dedicated export/import path specific to the plugin, or manual reconstruction — plan for it as a separate work item, not a checkbox inside "the migration."
  - The old-sitemap-fetch safety net (OYS's Bulk redirects, pointed at the old site's `sitemap.xml`) is far more valuable here than on a small site — with years of accumulated inbound links and indexed pages, manually verifying URL coverage isn't realistic, and an automated sweep against the sitemap is the only practical way to catch what the importer missed.

## Data governance by destination

Worth a beat before the verdict, since this guide already draws a hard line between wordpress.com (source) and self-hosted WordPress (destination): those two aren't just different hosting arrangements, they're different governance postures entirely. wordpress.com's Terms of Service give Automattic broad discretion — content removal, account suspension "with or without notice" — because you're running on infrastructure Automattic owns. Once you're on self-hosted WordPress, that discretion doesn't exist anymore; there's no account layer sitting between you and your server.

| Destination | Who controls the server & database | Could a vendor unilaterally change terms or pull the plug | Ongoing export/backup | Code auditability |
|---|---|---|---|---|
| **OYS** | You — OYS is licensed, self-hosted software you deploy on infrastructure of your choosing, not a SaaS someone else operates. | No vendor account sits on top of your live deployment once it's running. | Standard Postgres underneath; Bulk redirects and content export tooling built in. | You fully control the deployment and the data; the OYS application code itself is licensed, not published open source, so auditability is at the level of behavior and license terms rather than a public source repo. |
| **Self-hosted Ghost** | You. | No. | `ghost export` produces a full JSON backup any time; the MySQL/SQLite database underneath is yours to dump directly. | Fully open source, MIT-licensed, code public on GitHub — you or anyone can read exactly what it does. |
| **Self-hosted WordPress** | You. | No — this is the entire governance shift you're making by leaving wordpress.com. | `wp export` (WP-CLI) or Tools → Export any time, plus direct MySQL access. | Fully open source, GPLv2 — the same transparency tier as Ghost. |
| **Custom app stack** | You, on whichever host and database you chose. | Entirely dependent on your underlying hosting/database vendor's terms — see the tradeoff table below. | Exactly as good as the migration/export tooling you build. | 100% — your code, your schema. |

## Managed cloud vs. renting your own server: the real tradeoff

Every destination in this guide still needs somewhere to run. I've covered both ends of that decision in dedicated guides — my Vercel + Supabase guides for the managed path, my Hetzner + self-hosted Postgres guides for the "rent a bare VPS" path — so this is the compressed comparison, not the full one.

| | Managed/cloud (Vercel, Netlify, Railway, wordpress.com's managed tier) | Self-managed VPS (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| Security patching | Vendor's responsibility, applied automatically | Yours — OS, runtime, and database patches, on your schedule |
| Incident response | Vendor's on-call/support team | You're the on-call team |
| Cost predictability | Usage-based — bandwidth, function invocations, or seat pricing can move against you | Flat server cost (Hetzner's CX line runs roughly €4-8/mo); predictable, but backups and monitoring are line items you add yourself |
| Data portability | Generally strong if you stick to standard Postgres and git-based deploys; watch for vendor-specific extensions | Excellent by default — it's your VM — but nothing is exported for you; you own that tooling |
| Technical skill required | Low to moderate | SSH hardening, firewall rules, connection pooling, WAL-based backups — real ops competency, not optional extras |

## Who this migration isn't for

Being direct about this rather than letting you discover it mid-import:

- **Anyone who wants a single-command migration with no verification step.** Every path here — including OYS's dry-run preview — still requires you to spot-check imported posts, permalink mappings, and (on the WordPress-to-WordPress path) whether custom-field plugins render correctly post-import. If you're not willing to do that verification, none of these four paths are actually "done" when the import finishes.
- **A large, plugin-heavy, or WooCommerce-dependent WordPress site, regardless of your own technical skill.** WXR only carries posts, pages, categories, tags, and comments. Custom fields (ACF), custom post types, and anything WooCommerce- or membership-related live in database tables the export format doesn't touch — that's a structural gap in WXR itself, not something more careful clicking fixes.
- **Someone who can't tolerate temporarily losing plugin-specific functionality.** A DIY WXR import run once, straight to production, with no staging environment, is a real risk on any site with meaningful plugin dependency — test the import against a staging copy or a disposable WordPress install first, and don't cut over DNS until you've confirmed the custom fields and post types you actually rely on survived.
- **Anyone who needs commerce/membership continuity on day one.** WooCommerce orders, products, and paid-subscriber state require a separate, dedicated migration path outside every option in this guide — plan for it as its own project, not a line item inside "the WordPress migration."

None of this means don't do the migration — it means scope it honestly before you start, especially if "large site plus many plugins" describes you.

## Where I land

- **Fastest, lowest-risk, best redirect coverage:** OYS's WordPress importer — the WXR-to-native-redirect pipeline is the strongest of any path in this guide, and the sitemap-fetch fallback is exactly the tool a large, old WordPress site needs.
- **Best if staying in an open ecosystem outside WordPress:** Ghost, with the caveat that very large or plugin-heavy sites should expect to lean on the CLI toolkit rather than the admin-panel wizard.
- **Best for genuinely preserving plugin-driven structure:** WordPress-to-WordPress, since it's the only path where custom-field and custom-post-type metadata survives without any cross-platform translation — just remember redirects aren't automated here.
- **Only for custom-product builds:** parsing WXR yourself, which trades all the built-in safety nets (dry-run, auto-redirects, sitemap fetch) for full control over the schema you land in.

## Sources
- [WordPress.com: Export WordPress Content](https://wordpress.com/support/export/)
- [WordPress.org: WordPress Importer plugin](https://wordpress.org/plugins/wordpress-importer/)
- [WP-CLI export-command on GitHub](https://github.com/wp-cli/export-command)
- [Ghost Developer Docs: Migrating from WordPress](https://docs.ghost.org/migration/wordpress)
- [TryGhost/migrate on GitHub](https://github.com/TryGhost/migrate)
- [@tryghost/migrate on npm](https://www.npmjs.com/package/@tryghost/migrate)
- [Kinsta: How to Migrate WordPress.com to WordPress.org](https://kinsta.com/blog/wordpress-com-to-wordpress-org/)
- [Learn WordPress: Tools — Import and Export](https://learn.wordpress.org/tutorial/tools-import-and-export/)
- [WordPress.org: About the GPL license](https://wordpress.org/about/license/)
- [Ghost Developer Docs: License](https://docs.ghost.org/license/)
- [WordPress.com Terms of Service](https://wordpress.com/tos/)
- [WordPress.com: Suspended content and sites](https://wordpress.com/support/suspended-blogs/)
