---
title: "Moving off Ghost(Pro): your migration options (Intermediate guide)"
tagline: "Leaving managed Ghost hosting for self-hosted Ghost, WordPress, a custom stack, or OYS"
category: own-your-stack
source_platform: ghost
difficulty: intermediate
cost_range_usd: "0-20/mo"
tags: ["cms", "newsletter", "migration", "platform-evaluation"]
level: intermediate
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Comfortable provisioning a VPS (Ghost-CLI or Docker install)"
  - "Can read a JSON export's structure (meta/data blocks, relational IDs)"
  - "Can reconcile Stripe customer IDs during a member CSV import"
  - "Familiar with YAML config files (redirects.yaml, routes.yaml) and theme packaging"
requirements:
  - "A Ghost(Pro) content export (.json) and a separate members CSV export"
  - "A self-hosted Ghost instance (VPS with Docker or Ghost-CLI) provisioned and empty"
  - "The same Stripe account credentials to reconnect on the new install"
  - "Exported redirects.yaml, routes.yaml, and your active theme .zip if customized"
  - "Time to verify Stripe subscription reattachment before canceling Ghost(Pro)"
effort_hours_min: 2
effort_hours_max: 8
---

# Moving off Ghost(Pro): your migration options (Intermediate guide)

Quick framing before the mechanics: this guide covers leaving **Ghost(Pro)**, the managed hosting product, not Ghost the platform. Ghost as software is genuinely one of the better target platforms in this hub — open-source, self-hostable, honest about its data formats. If you're evaluating platforms from scratch, I'd still point you toward Ghost. This guide is for the specific and common situation of someone already paying Ghost(Pro)'s monthly bill who wants either to stop paying rent (self-host the same software) or move somewhere else entirely.

Lead with this: Ghost(Pro) to self-hosted Ghost is the simplest, lowest-risk migration in this entire guide series. Same software, same export format, same importer, and paying members reconnect to the same Stripe account without a billing gap. Everything else here — WordPress, a custom stack, OYS — asks more of you.

## Ghost's export, mechanically

Two separate exports, always:

- **Content export** — Settings → Advanced → Import/Export → Export → Content & settings. Produces a single `.json` file (`{site}.ghost.{timestamp}.json`). Contains posts, pages, tags, authors, and their relationships. Does not contain images — those stay referenced by URL, not embedded. Does not contain members.
- **Member export** — Members → gear icon → Export all members. Produces a CSV with `id`, `email`, `name`, `note`, `subscribed_to_emails`, `complimentary_plan`, `stripe_customer_id`, `created_at`, `deleted_at`, `labels`.

The JSON export mirrors Ghost's internal database structure rather than its public API, which is deliberate — it lets you set fields the API would otherwise ignore. Top-level shape:

- `meta`: `exported_on` (epoch ms) and `version` (the Ghost version the file targets).
- `data`: arrays — `posts`, `posts_meta`, `tags`, `posts_tags`, `users`, `posts_authors`. IDs are relative to the file only; a `posts_tags` entry with `post_id: "1234"` links to the `post` with that ID inside the same file, nothing external.

That structure is stable and documented well enough that it's worth understanding even if you're using a built-in importer rather than scripting against it directly — it explains what does and doesn't survive a round trip.

## Path 1: Ghost(Pro) → self-hosted Ghost

This is a same-platform migration, so Ghost's own importer treats it as a first-class case — the documentation specifically calls this "Ghost to Ghost" and routes it through the **Universal import** option on the standard import screen, which auto-detects a native Ghost JSON file rather than needing conversion.

Process:

1. Stand up an empty self-hosted Ghost instance on your own infrastructure (a VPS running Ghost's official Docker setup or the Ghost-CLI installer are the two common paths).
2. Export content from Ghost(Pro): Settings → Advanced → Import/Export → Export.
3. On the new self-hosted install: Settings → Advanced → Import/Export → Import, upload the `.json`.
4. Separately export and import the members CSV via the Members area on each side.
5. Connect the same Stripe account to the new self-hosted install. For each member row, a `stripe_customer_id` set to `auto` (or carried over as-is from the export) tells Ghost to search the connected Stripe account for a matching customer by email and reattach the live subscription — no new charge is created, and the member's billing cycle is undisturbed.

What doesn't come along automatically:

- **Images.** The content JSON references image URLs but doesn't embed the files. Ghost(Pro) support will pull your media library for Ghost(Pro) customers on request — worth doing before you cancel your plan, since access to that support channel presumably ends with the subscription. Confirm this with current Ghost(Pro) support directly, since export-assistance policies are the kind of detail that can shift between plan tiers or over time.
- **Themes, custom routes, redirects.** If you've customized your Ghost(Pro) theme or set up custom routing/redirect rules, those live outside the content export and need to be pulled separately from the Labs and Themes screens in Ghost admin (redirects as `redirects.yaml`, custom routing as `routes.yaml`, the active theme as a `.zip`).

Ghost's own community forum confirms this is a well-trodden path — multiple self-hosters have asked this exact question, and the consistent answer is: yes, straightforward, get help from Ghost(Pro) support for images, everything else reverses cleanly.

## Path 2: Ghost(Pro) → Own Your Site

OYS ships a dedicated Ghost importer:

- Admin → Content → Import, choose Ghost, upload the `.json` export.
- Dry-run preview shows what will be created before anything is written.
- On confirm, OYS creates the posts/pages and **auto-generates a 301 redirect from every old Ghost URL** to its new location — this is the detail that makes OYS's importer worth calling out specifically, since it removes the manual redirect-mapping work most CMS migrations require.

Scope and gaps:

- Covered: posts, pages, original URL preservation via automatic redirects.
- Not covered by the importer itself: members and images — both separate exports on the Ghost side, handled through OYS's own membership setup and media re-hosting respectively.
- Leftover cleanup: old RSS subscriber URLs, tag/author archive pages, or a changed base path. OYS's **Bulk redirects** tool (Admin → Growth → SEO → Bulk redirects) either ingests Ghost's published `sitemap.xml` directly and proposes a full mapping, or accepts wildcard rules (`/tag/* -> /blog`, `/author/* -> /about`) with capture-group substitution. Nothing writes until you commit the batch, and the batch is rollback-able.

## Path 3: Ghost(Pro) → self-hosted WordPress

No native import — Ghost's JSON isn't a format WordPress understands out of the box. The realistic path runs through a conversion step:

1. Export Ghost's `.json`.
2. Convert to WordPress's native import format (WXR, an XML dialect) using a browser-based Ghost-to-WordPress converter, or convert to CSV and run it through a WordPress import plugin that accepts CSV.
3. Import the converted file via WordPress's built-in importer (Tools → Import) or the plugin's own import screen.
4. Content lands as WordPress posts/pages using the block editor (Gutenberg) format.

Practical caveats:

- Multiple community-documented tools exist for the JSON-to-WXR conversion step; none of them are Ghost's own tooling, so validate output on a staging WordPress install before trusting it with a production import — check that HTML content rendered correctly, feature images resolved, and tags/categories mapped the way you expect.
- Images referenced by URL in Ghost's export need re-hosting on the WordPress side; the conversion tools generally don't fetch and re-upload them automatically.
- Members and Stripe billing are entirely outside this conversion. If you're bringing paying subscribers to WordPress, you need a separate membership/paywall plugin, and you handle the subscriber CSV import and Stripe reconnection as manual steps — there's no Ghost-aware automation for this on the WordPress side the way there is going Ghost-to-Ghost.

## Path 4: Ghost(Pro) → a custom stack

If you're scripting this yourself, Ghost's export is the most pleasant of the source formats covered in this hub to parse programmatically:

- Well-documented, stable schema (Ghost publishes it as part of their own developer docs, specifically so third parties can generate valid import files).
- Flat, predictable structure: posts/pages differentiated by a `type` field on the same underlying model, relationships expressed as simple join arrays (`posts_tags`, `posts_authors`) rather than deeply nested objects.
- No proprietary blocks or platform-specific shorthand to reverse-engineer — `html` (or `lexical`, Ghost's newer structured-content format) carries the actual post body directly.

A parsing script needs to handle, at minimum:

- Mapping `posts` rows into your schema, keyed by the file-relative `id`.
- Resolving `posts_tags` and `posts_authors` join rows against the `tags` and `users` arrays.
- Re-hosting every image URL referenced in `html`/`feature_image`/`posts_meta.feature_image_alt` fields — these are just URLs pointing at Ghost's storage, not embedded binary data, so you're fetching and re-uploading each one.
- Separately parsing the members CSV and, if you're handling paid subscriptions yourself, writing your own Stripe reconciliation logic — see the expert guide for the mechanics.

For hosting, point to my Vercel + Supabase deploy guides rather than re-deriving that setup here — this guide is about getting Ghost's data into a shape your stack can use, not about standing up the stack itself.

## Site-size considerations

- **Small blog** (a few dozen posts, free or lowest Ghost(Pro) tier): any of the four paths is a same-day job. No deliverability concerns, no meaningful Stripe risk.
- **Medium publication** (hundreds of posts, paid memberships via Ghost's built-in Stripe integration): treat the member export and Stripe reconnection as their own checklist item, separate from the content migration. It's the step most likely to get skipped because content migration feels like "the real work" — it isn't, mechanically, the harder half.
- **Large publication** (thousands of posts, significant paid-member revenue, newsletter sends at scale): budget real verification time. Spot-check a sample of reattached Stripe subscriptions for correct billing status before canceling anything on the old side. If your new destination sends newsletters through different infrastructure than Ghost(Pro)'s, ramp up sending volume gradually rather than mailing your full list from day one — a sudden high-volume blast from unfamiliar sending infrastructure reads as spam to Gmail/Outlook regardless of your actual sender reputation on the old platform. This mirrors the same Stripe-transfer and deliverability-warmup considerations covered in the Substack and beehiiv migration guides — the mechanics are close to identical because the underlying constraint (Stripe doesn't move a billing relationship automatically, email providers distrust new senders) isn't platform-specific.

## Data governance by destination

| Destination | Who controls server & database | Vendor could change terms or cut you off | Export/backup ease | Code auditability |
|---|---|---|---|---|
| Ghost(Pro) (the one you're leaving) | Ghost's team — you get an admin panel, not a server | Yes — hosted ToS relationship; pricing, feature set, and account status are Ghost's call regardless of how well-run the company is | Built-in export button is easy, but you're always exporting out of infrastructure you don't own | Ghost core is MIT-licensed and public, but that's the code Ghost is running for you here, not code you're running yourself |
| Self-hosted Ghost | You — full root on the VPS | Only your VPS provider, and only at the infrastructure layer; switching VPS providers is trivial next to switching CMS | Full — native export tool plus direct DB access for real backups | Same MIT-licensed Ghost codebase Ghost(Pro) runs, fully public |
| OYS | You — full root on the VPS | Only your VPS provider, at the infra layer | Full — direct DB access, data never leaves a server you run | Source is inspectable but not yet released under a formal open-source license (no MIT/GPL/commercial license chosen yet) — you can read it, you don't yet have the explicit reuse rights Ghost or WordPress grant |
| Self-hosted WordPress | You — full root on the VPS | Only your VPS provider, at the infra layer | Full — direct DB access plus a mature backup-plugin ecosystem | GPLv2, one of the most heavily audited codebases in existence given its market share |
| Custom stack | You — your code, your database | Only whatever host you chose for it | Whatever you built — you own the backup strategy | Your own code; no third-party license question to resolve |

The pattern that matters: every self-hosted destination here (Ghost, OYS, WordPress, custom) moves control from "a vendor's infrastructure" to "yours." OYS is the one exception worth flagging precisely — it's self-hosted and its source is readable, but it doesn't carry Ghost's or WordPress's formal open-source license yet, so the legal permissions around forking or redistributing the code aren't spelled out the same way.

## Managed cloud vs. renting your own server: the real tradeoff

Every destination path above still needs infrastructure underneath it. Two options, opposite tradeoffs:

| | Managed/cloud (Vercel, Netlify, Railway, Ghost(Pro)) | Self-managed VPS (Hetzner, DigitalOcean Droplet) |
|---|---|---|
| Security patching | Handled by the platform, invisible to you | Your responsibility — OS, Ghost/WordPress core, plugins, database |
| On-call for outages | Platform's ops team, usually SLA/status-page backed | You — no monitoring or alerting exists unless you set it up |
| Cost predictability | Usage-based; often cheap to start, can climb with traffic/storage | Flat monthly rental, doesn't move with traffic unless you resize the box |
| Data portability | Generally exportable, but configuration lives in platform-specific conventions | Total — it's your filesystem and database dump, no platform convention to unwind |
| Technical skill required | Low — git push or dashboard deploy | Real sysadmin literacy — SSH, firewall, backup scripting, your own incident response |

See my **Deploy on Vercel + Supabase** guides for the managed path and **Deploy on Hetzner + self-hosted Postgres** for the self-managed VPS path — both go deep on setup mechanics I won't repeat here.

## Who this migration isn't for

Being direct about this:

| If this is you... | ...this migration probably isn't the right move yet |
|---|---|
| You want zero ongoing server maintenance | Self-hosting (Ghost, OYS, WordPress) means patching, backups, and uptime become your job. "Ghost to Ghost" is the easiest path in this series, not a maintenance-free one — stay on Ghost(Pro) or a fully managed destination instead |
| You're not comfortable with SSH, a terminal, or basic Linux administration | Every self-hosted destination here assumes baseline sysadmin literacy. Either budget time to learn it, hire it out, or don't self-host |
| You're carrying meaningful paid-subscriber revenue and can't spare verification time | The Stripe reconnection is reliable but needs spot-checking — don't run this migration during a week you can't spare attention for it |
| You're picking WordPress or a custom stack without developer resources | WordPress adds ongoing plugin/theme maintenance Ghost never asked of you; a custom stack has no importer at all — both assume you or someone you hire can write and maintain code |
| You need this live immediately | Even the same-platform path requires standing up and testing a new server first — there's no same-day guarantee here |

None of this means these migrations are hard in absolute terms — the Ghost-to-Ghost path specifically is the easiest thing in this entire guide series. It means "easy" here is relative to the other migrations covered in this hub, not relative to doing nothing.

## Where I land

- **Leaving the bill, not the platform:** self-hosted Ghost. Same importer, same Stripe account, minimal manual work outside of images and themes.
- **Leaving Ghost as software too, wanting a dedicated importer:** OYS — the automatic 301 generation is a real time-saver over hand-mapping redirects.
- **Already committed to WordPress's ecosystem:** workable, but budget time for validating the JSON-to-WXR conversion and plan on handling members/Stripe by hand.
- **Building something bespoke:** Ghost's export is the easiest source schema in this hub to script against — lean into that if you're already committed to a custom stack.

## Sources

- [Ghost Help: Importing content](https://ghost.org/help/imports/)
- [Ghost Help: Exporting content and data](https://ghost.org/help/exports/)
- [Ghost Help: Import members](https://ghost.org/help/import-members)
- [Ghost Developer Docs: Migrating from Ghost to Ghost](https://docs.ghost.org/migration/ghost)
- [Ghost Developer Docs: Developer Migration Docs (custom/JSON schema)](https://ghost.org/docs/migration/custom)
- [Ghost Forum: Is it possible to migrate from Ghost Pro to self-hosted?](https://forum.ghost.org/t/is-it-possible-to-migrate-from-ghost-pro-to-self-hosted/39942)
- [Ghost Forum: How to migrate with Ghost Pro to self-hosting](https://forum.ghost.org/t/how-to-migrate-with-ghost-pro-to-self-hosting/29341)
- [WPBeginner: How to Properly Move from Ghost to WordPress](https://www.wpbeginner.com/wp-tutorials/how-to-properly-move-from-ghost-to-wordpress/)
- [Ghost Schema Reference — TryGhost/Ghost on GitHub](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/data/schema/schema.js)
- [Ghost Pricing](https://ghost.org/pricing/)
- [Ghost LICENSE (MIT) — TryGhost/Ghost on GitHub](https://github.com/TryGhost/Ghost/blob/main/LICENSE)
- [WordPress.org: GNU Public License (GPLv2)](https://wordpress.org/about/license/)
- [Hetzner Cloud pricing](https://www.hetzner.com/cloud/)
- [DigitalOcean Droplets pricing](https://www.digitalocean.com/pricing/droplets)
- [Vercel Pricing](https://vercel.com/pricing)
