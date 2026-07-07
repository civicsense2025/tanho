---
title: "Moving off Webflow: your migration options (Intermediate guide)"
tagline: "The real tools, by destination — and the CSV/API tradeoff at every content size"
category: own-your-stack
source_platform: webflow
difficulty: intermediate
cost_range_usd: "0-100/mo"
tags: ["website-builder", "migration", "platform-evaluation"]
level: intermediate
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Comfortable exporting and reviewing CSV files per CMS Collection"
  - "Can map spreadsheet columns to a new platform's content fields"
  - "Able to spot-check rich text and reference fields after import"
  - "Comfortable weighing when to use Webflow's Data API instead of CSV"
  - "Can review and correct proposed redirect mappings against a sitemap"
requirements:
  - "Webflow admin access to export CSVs for every CMS Collection"
  - "Your old site's sitemap.xml for redirect-mapping tools"
  - "Destination admin access (OYS, Ghost, or WordPress) with content types or import plugins ready"
  - "For larger sites, a registered Webflow app for Data API access as a CSV fallback"
  - "A weekend or two of hands-on time for a medium-sized site"
effort_hours_min: 10
effort_hours_max: 50
---

# Moving off Webflow: your migration options (Intermediate guide)

You've already decided to leave Webflow, or you're close to it — this guide skips the "should you" argument (that's in my evaluation guides, where I covered the CMS-export gap, the Data API, and custom code limits in detail) and gets straight into the mechanics: here's the tool situation for each of four destinations, and here's what I found researching what's actually real versus what's marketing copy.

The headline fact, worth stating plainly before anything else: **there is no native Webflow importer on any of the four destinations below.** Not OYS, not Ghost, not WordPress. Every path runs through Webflow's per-Collection CSV export or its Data API. That's a real gap in the ecosystem, not something specific to any one platform's laziness.

## Where every path starts: the CSV export

Webflow's static code export explicitly excludes CMS Collection content, user accounts, and e-commerce data — confirmed directly in Webflow's own documentation. So the export you actually want isn't the site-wide code export; it's the per-Collection CSV export, found inside the CMS panel of each Collection. A few things worth knowing about it going in:

- It's one CSV per Collection — there's no bulk "export everything" button, so a site with six Collections means six separate export actions.
- Reference fields (a blog post pointing at its author, or a product pointing at a category) come out as whatever identifier Webflow uses internally, not necessarily something your destination platform will understand without remapping.
- Rich text fields export as Webflow's own HTML-ish formatting, which generally survives a CSV round-trip reasonably well but is worth spot-checking after import, especially for embedded elements like buttons or nested lists.
- Static pages (non-Collection pages like your homepage) aren't part of this CSV at all — they get rebuilt by hand regardless of destination.

> **[📸 SCREENSHOT PLACEHOLDER]** — the Webflow CMS Collection panel with the per-Collection Export button and resulting CSV download
>
> _Replace this callout with the real screenshot before publishing._

## Option 1: OYS — manual content recreation, strong URL preservation

OYS has no dedicated Webflow importer, and I'd rather say that plainly than dress it up. Here's the real flow:

- **Content**: for each Webflow Collection, export its CSV, then create a matching content type in OYS (Admin → Content → Content types → + New type) with fields mirroring your Collection's columns. Import the CSV rows or recreate entries directly. Static pages get rebuilt with OYS's block editor.
- **URLs**: this is where OYS earns its keep. The **Bulk redirects** tool (Admin → Growth → SEO → Bulk redirects) takes your old Webflow `sitemap.xml` URL directly — it fetches it, parses every `<loc>` entry, and proposes a mapping for each: an exact match to a page you've rebuilt, the closest match by similarity if no exact page exists, or a `410 Gone` candidate if nothing fits.
- **Review flow**: proposals are sorted lowest-confidence first, so you deal with the uncertain ones before the obvious ones. Nothing writes until you commit, and the whole batch commits (and can roll back) together.
- **Pattern-based alternative**: Webflow CMS URLs typically follow `/<collection-slug>/<item-slug>`. If your new base path differs — say your old `/posts/*` becomes `/blog/*` on the new site — a single wildcard rule in Bulk redirects remaps the entire Collection at once (`/posts/* -> /blog/$1`), rather than needing individual per-item entries.

> **[📸 SCREENSHOT PLACEHOLDER]** — Bulk redirects showing a wildcard rule mapping a whole collection path pattern
>
> _Replace this callout with the real screenshot before publishing._

## Option 2: Self-hosted Ghost — no Webflow package, theme-only partner integration

I went looking specifically for a `mg-webflow` equivalent in Ghost's open-source migration toolkit — the same family that includes dedicated packages for Substack, WordPress, and Squarespace. **It doesn't exist.** There is no Webflow-specific migration package in Ghost's tooling as of this writing.

What does exist is a Ghost-listed partner integration with **Udesly**, but scope it correctly:

- Udesly converts your Webflow **design/theme** into a Ghost-compatible Handlebars theme.
- It does not touch your CMS content. Posts, products, or any Collection data still need a separate path in.

The realistic content path:

1. Export each Collection as CSV.
2. Convert to Ghost's required JSON import structure — a `meta` object (with an `exported_on` epoch timestamp and a target Ghost `version`) plus a `data` object containing your posts.
3. Set content format explicitly. Ghost defaults new content to its "lexical" editor format — if you don't explicitly mark your imported post bodies as HTML source, they'll land blank rather than rendering your Webflow rich-text content.
4. Import the JSON through Ghost admin's import screen.

There's no drag-and-drop field mapper here the way there is for other Ghost migrations — you're writing or adapting a conversion script (Node.js is the common choice, matching Ghost's own toolkit language) rather than clicking through a wizard.

## Option 3: Self-hosted WordPress — CSV plus a general-purpose import plugin

WordPress also has no dedicated Webflow importer, but the ecosystem around flexible CSV imports is more mature here than on Ghost, and there's a well-worn specific path:

- **WP All Import** is the plugin people actually use for this. It's not Webflow-specific — it's a general-purpose CSV/XML import tool — but it's mature, actively maintained, and well-documented for exactly this migration direction.
- **Flow**: export a Collection's CSV from Webflow, upload it into WP All Import's "New Import" screen, and use its drag-and-drop interface to map each Webflow column to a WordPress field (post title, content body, featured image, custom fields for anything Webflow-specific).
- **Images**: Webflow CSVs typically reference images by external URL rather than embedding files. Pair WP All Import with **Auto Upload Images**, which scans imported posts for those external image links and pulls the actual files into your WordPress media library, rewriting the links to point locally.
- **Reverse-direction plugin, for context**: there's also a WordPress.org plugin called "Exporter for Webflow" — worth knowing about, but it exports *WordPress* content into a Webflow-ready CSV, the opposite direction from what you're doing here, so it doesn't help with this migration.

Static pages get rebuilt in WordPress's block editor, same as every other destination — there's no shortcut for hand-built Webflow pages regardless of tool.

## Option 4: Custom app — the Data API is the actually-clean option here

This is worth taking seriously past "the technical option for developers," because for a real content-heavy site, the Data API genuinely outperforms CSV for structural fidelity:

- Webflow's Data API is OAuth-authenticated and documented, covering Sites, CMS Collections and Items, Forms, and Orders.
- A script using the API reads every Item in every Collection with its typed fields intact — reference fields resolve to actual Item IDs you can remap programmatically, rather than the flattened, sometimes-ambiguous values a CSV export gives you.
- This preserves structure a CSV loses: multi-reference fields, typed fields (number vs. text vs. date), and relationships between Collections, all without the manual column-mapping step every CSV-based path above requires.
- It's rate-limited, so a full-site extraction of a large site is a multi-minute-to-hour job by construction, not a bug — plan for pagination and backoff rather than a single blocking request.

For hosting the resulting app, see my existing deploy guides for Vercel + Supabase — I won't repeat the hosting mechanics here, just the extraction approach.

## Size-tier considerations, across all four destinations

The size of your Webflow site changes which parts of this migration actually hurt, regardless of which destination you land on.

- **Small (a handful of static pages, no CMS)**:
  - No Collection CSV work at all — you're rebuilding a few hand-built pages and done.
  - Redirect volume is trivial; a handful of manual entries or a small pasted list in Bulk redirects covers it.
  - Realistic budget: an afternoon, on any of the four destinations.
- **Medium (one or two Collections, moderate item counts — dozens to a few hundred items)**:
  - The CSV export/import/field-mapping cycle described above becomes the bulk of the work. Budget real time for verifying rich-text formatting and reference fields survived the round-trip.
  - Redirect volume is manageable through the sitemap-fetch approach on OYS, or a moderate pasted list elsewhere — still well within "review it yourself" territory.
  - Realistic budget: a weekend or two, mostly spent on field-mapping and spot-checks, on any destination.
- **Large (many Collections, high item counts, meaningful organic search traffic)**:
  - CSV-based manual recreation starts to break down here — hand-mapping fields across many Collections with thousands of combined items, one CSV import screen at a time, is slow and genuinely error-prone at this volume.
  - This is where the API-extraction approach (Option 4) starts to matter even if you're not going fully custom — pulling structured content programmatically, once, avoids re-running CSV imports and re-verifying field mappings across every Collection by hand.
  - Redirect volume scales directly with Collection size — a large product catalog or content archive needs the sitemap-fetch-and-propose workflow rather than hand-typed rows, and reviewing lowest-confidence matches first (rather than trusting an automated batch blindly) matters more when a wrong redirect could quietly cost real organic traffic.
  - Realistic budget: treat this as a project with a timeline — days to weeks depending on how much of the extraction you script versus do by hand, not a weekend task.

## Data governance by destination

| Destination | Who controls the server & database | Vendor control risk | Export/backup posture | Code auditability |
|---|---|---|---|---|
| **OYS** | You — it's licensed, self-hosted software you deploy onto infrastructure you control, not a hosted SaaS account. | No account-suspension risk, since there's no vendor-run instance to lose access to; license terms for the software itself are still set by OYS as a vendor and worth reading before committing. | Direct database access plus the Bulk redirects export/import tooling in the admin — no dependency on a vendor's export queue or rate limit. | You run the actual codebase; license terms (not a permissive OSS license) govern modification/resale rights. |
| **Self-hosted Ghost** | You. | None. | Direct DB access plus Ghost's native JSON export. | Full — MIT-licensed core. |
| **Self-hosted WordPress** | You. | None. | Direct DB access plus the built-in WXR exporter. | Full — GPL, the largest install base and audit surface of anything in this guide. |
| **Custom app stack** | You, for app code; database control depends on where you deployed it. | Entirely dependent on your underlying hosting/database vendor's terms — this destination inherits whatever you built it on. | Only as good as the backup strategy you design. | Full — it's code you or your developer own. |

The pattern worth internalizing: three of the four destinations put you in direct control of the server and database the moment you stand them up. The custom-app path gives you the same control in principle, but it's conditional on which hosting layer you pick — which is exactly the decision in the next section.

## Managed cloud vs. renting your own server: the real tradeoff

This decision sits underneath the custom-app path (and honestly underneath OYS, Ghost, and WordPress too, since all of them need to run somewhere). I cover the managed side concretely in my Vercel + Supabase deploy guides and the self-managed side in my Hetzner + self-hosted Postgres guide — here's the tradeoff itself:

| | Managed/cloud (Vercel, Netlify, Railway) | Renting your own VPS (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| Security patching | Automatic, handled by the platform. | Your responsibility — OS updates, dependency patches, none of it is done for you. |
| Incident response | Vendor's infra team covers their layer; your app-level bugs are still yours either way. | You're the on-call engineer, unless you've built or hired coverage. |
| Cost predictability | Low entry cost, but usage-based billing (bandwidth, function invocations) can spike with traffic in ways that are hard to forecast. | Flat monthly cost for the box, independent of traffic, until you need to resize. |
| Data portability | App code is generally portable; deploy configuration and environment setup are platform-specific. | High — direct filesystem and database access, no vendor API required to get your data out. |
| Technical skill required | Low to moderate — git-push deploys, managed dashboards. | Moderate to high — Linux administration, firewall/SSL configuration, backup scheduling, monitoring (tools like Coolify or Dokploy reduce but don't eliminate this). |

Neither side is objectively correct. Managed cloud trades money and some control for speed and lower operational burden; renting your own server trades your time and a real learning curve for cost predictability and full data portability. Pick based on whether you'd rather pay in dollars or in hours.

## Who this migration isn't for

Worth saying directly, since the CSV/API mechanics above can make this sound more turnkey than it is:

- **A large, multi-Collection site with no development time or budget.** This is the load-bearing honest point in this whole guide: there is no dedicated Webflow importer anywhere — not OYS, not Ghost, not WordPress. The real path at scale is manual CSV recreation across every Collection, or a developer scripting the Data API. If you're looking at many Collections and thousands of combined items with no one available to do that work, a DIY migration isn't a realistic plan — a paid migration service or a freelance developer is the honest recommendation at that point, not "grind through the CSV route yourself."
- **You want field-level fidelity but aren't willing to spot-check the CSV round-trip.** Reference fields, rich text formatting, and multi-reference relationships all have documented ways of degrading through a CSV export. If you're not planning to verify formatting and reference integrity after import, don't assume the CSV path preserved it correctly.
- **You need this done in a weekend and your site is in the "large" tier above.** The size-tier guidance above isn't padding — a many-Collection, high-item-count site with real organic traffic is realistically a multi-day-to-multi-week project once you account for field-mapping, redirect review, and QA. If your timeline doesn't allow for that, either scope down what you're migrating first or bring in outside help.
- **You're not willing to own the redirect strategy.** None of the four destinations recreates URL structure automatically at scale without your review — OYS gets you closest with sitemap-fetch and wildcard rules, but you still have to review low-confidence matches. If broken inbound links and lost search rankings aren't an acceptable risk for you, budget the time for this step specifically.

If several of these apply to your situation, that's useful signal to bring in a developer or a migration service rather than a reason to push through anyway — the CSV/API mechanics in this guide don't get easier just because you're short on time.

## My verdict

> **💡 Tip — Where I land**

None of the four destinations has solved the Webflow content-import problem for you — that gap is real across the whole ecosystem, not a reason to rule any of them out specifically. What differs is how much of the *other* half — URL preservation — is handled for you.

- **If URL preservation matters most to you** (you have real organic traffic to protect): OYS's sitemap-fetch and wildcard-pattern tooling in Bulk redirects does more of that work automatically than anything on the other three paths.
- **If you want the most mature general-purpose import tooling**: WordPress with WP All Import — not Webflow-specific, but genuinely well-worn for this exact CSV shape.
- **If your site is large or you're building something bespoke anyway**: the Data API is worth the setup cost. It's the only approach here that preserves structure rather than flattening it into spreadsheet rows.

The one thing I'd tell every intermediate-level migrator regardless of destination: don't start with the code export expecting a full backup. Go straight to the per-Collection CSV export or the Data API — the site-wide export will only get you static pages and design, which is a smaller part of most Webflow sites than people expect.

## Sources

- [How do I export my Webflow site code? – Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961386739347-How-do-I-export-my-Webflow-site-code)
- [Can you export a Webflow website? Understanding code export limitations](https://brixtemplates.com/blog/can-you-export-a-webflow-website-understanding-code-export-limitations)
- [How do I import content into the Webflow CMS? – Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961290794771-How-do-I-import-content-into-the-Webflow-CMS)
- [Webflow Data API docs](https://developers.webflow.com/data/docs/data-clients)
- [Rate Limits – Webflow Developer Documentation](https://developers.webflow.com/data/reference/rate-limits)
- [TryGhost/migrate on GitHub](https://github.com/TryGhost/migrate)
- [Official Ghost + Udesly Integration](https://ghost.org/integrations/udesly/)
- [What's format of JSON file for import to Ghost? – Ghost Forum](https://forum.ghost.org/t/whats-format-of-json-file-for-import-to-ghost/4399)
- [How to Migrate From Webflow to WordPress (in 6 Steps) – Kinsta](https://kinsta.com/blog/webflow-to-wordpress/)
- [Exporter for Webflow – WordPress plugin](https://wordpress.org/plugins/exporter-for-webflow/)
