---
title: "Moving off Ghost(Pro): your migration options (Expert guide)"
tagline: "Scripting the JSON parse and the Stripe/member transfer mechanics precisely"
category: own-your-stack
source_platform: ghost
difficulty: expert
cost_range_usd: "0-20/mo"
tags: ["cms", "newsletter", "migration", "platform-evaluation"]
level: expert
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can script against Ghost's JSON export schema (posts, posts_tags, posts_authors)"
  - "Can write a Stripe reconciliation script with dry-run diffs and double-billing safeguards"
  - "Understands Lexical vs HTML content body formats"
  - "Can build a Ghost-JSON-to-WXR field mapping if targeting WordPress"
  - "Comfortable validating against Stripe test mode before a production cutover"
requirements:
  - "A Ghost(Pro) content export (.json) and members CSV, parsed programmatically"
  - "API/scripting access to the relevant Stripe account(s) for customer and subscription lookups"
  - "A staging or Stripe test-mode environment to validate the member/billing transfer"
  - "A fetch-and-rehost pipeline for images referenced by URL in the content JSON"
  - "Time budgeted for a phased cutover and statistically meaningful subscription verification"
effort_hours_min: 4
effort_hours_max: 14
---

# Moving off Ghost(Pro): your migration options (Expert guide)

Scope note, stated once: this is about leaving **Ghost(Pro)** — the managed hosting SKU — not about Ghost as a platform, which remains one of the more defensible self-hostable targets in this hub. If you're architecting a migration *off* Ghost(Pro), the Ghost(Pro) → self-hosted-Ghost path is close to a non-event technically; everything else here requires actual engineering judgment.

## The export surface, precisely

Two independent artifacts, no cross-references between them:

**Content JSON** (Settings → Advanced → Import/Export → Export → Content & settings):

```json
{
  "meta": { "exported_on": 1753891082041, "version": "6.0.0" },
  "data": {
    "posts": [...],
    "posts_meta": [...],
    "tags": [...],
    "posts_tags": [...],
    "users": [...],
    "posts_authors": [...]
  }
}
```

- IDs are file-relative, not global — a `post_id` in `posts_tags` resolves only within this file's `posts` array.
- `posts.type` distinguishes `post` vs `page` on a shared model — no separate pages table.
- `posts.visibility` (`public` | `members` | `paid`) is your paywall state; carries no Stripe price/tier binding, just a gate class.
- Content body lives in `html` or, on newer Ghost versions, `lexical` (Ghost's structured-content format, a JSON-serialized editor state) — check which key is populated before assuming `html` exists.
- Images are referenced by path/URL only (`feature_image`, inline `<img>` src in `html`, `posts_meta.feature_image_alt/caption`) — nothing binary is embedded. A migration script needs a separate fetch-and-rehost pass for every distinct URL found across all three locations.
- No members, no Stripe references, anywhere in this file.

**Members CSV** (Members → gear icon → Export all members): `id`, `email`, `name`, `note`, `subscribed_to_emails`, `complimentary_plan`, `stripe_customer_id`, `created_at`, `deleted_at`, `labels`. This is the entire member record — no plan/price ID, no MRR figure, no billing-interval field. Everything about *what* a member is paying for lives in Stripe, not in this export; the CSV only carries the pointer (`stripe_customer_id`).

## Path 1: Ghost(Pro) → self-hosted Ghost

Mechanically a no-op migration at the data layer — same schema on both ends, so there's no transformation step, only transport:

1. Provision the target (Ghost-CLI or the official Docker image; either way, same Ghost version or newer on the target, per Ghost's own compatibility notes for the `version` field in `meta`).
2. Content: export → import through **Settings → Advanced → Import/Export**, routed automatically through the **Universal import** path since Ghost detects its own native JSON.
3. Members: export → import through **Members → Import members**. Set `stripe_customer_id` to the value already present in the export (or `auto`) — Ghost resolves `auto` against the *currently connected* Stripe account by email lookup at import time, not against any account reference baked into the CSV.
4. Stripe: connect the identical Stripe account (not a new one) to the target install before running the member import. This is the detail that makes this migration nearly frictionless — you are not moving Stripe customers or re-creating subscriptions, you're pointing a second Ghost instance at the same live Stripe account and letting Ghost's importer re-link existing `cus_...` IDs to newly created Ghost member records. No new charge event, no billing-cycle disruption, no dunning reset.
5. Artifacts outside the content JSON that need separate handling: `redirects.yaml`/`redirects.json` (Labs → Download current redirects), `routes.yaml` if you're using custom routing, and the active theme `.zip` (Themes → Installed → active theme's `…` menu). None of these travel with the content export.
6. Images: not in the export. For Ghost(Pro) customers specifically, Ghost support can pull the media library on request — get this before your Ghost(Pro) subscription lapses, since post-cancellation support access is a reasonable thing to lose. Otherwise, script a crawl of every image URL referenced in the content JSON and re-host at the same relative path structure your new install expects (`/content/images/...`) so you don't need to rewrite URLs inside `html`.

Failure modes worth testing for before cutover: Ghost version mismatch between source and target changing expected schema fields (check `meta.version` against your target's Ghost version), and members with `complimentary_plan=true` but a stale or missing `stripe_customer_id` — those need to import as complimentary, not silently drop.

## Path 2: Ghost(Pro) → Own Your Site

OYS's Ghost importer (Admin → Content → Import → Ghost) consumes the content JSON directly, runs a dry-run diff before any write, and on confirm generates a 301 for every source URL. Two things worth knowing if you're scripting around this rather than doing it by hand:

- The importer's scope is posts/pages only, matching the source export's actual scope — it isn't silently dropping a members import capability, Ghost's own export just doesn't include members in this file.
- Anything the automatic redirect generation doesn't catch (tag/author archive routes, RSS subscriber URLs, or a base-path change) is closeable via OYS's Bulk redirects tool, which accepts either a fetched `sitemap.xml` (Ghost publishes one at the standard path) for auto-proposed mappings, or wildcard rules with capture groups (`/tag/* -> /blog`, `$1` substitution supported) for bulk namespace remaps. Both the importer and the bulk-redirect tool are dry-run-then-commit, and the bulk-redirect commit is rollback-able as a batch.
- Members/Stripe: handle exactly as in Path 4 below, since OYS's Ghost importer doesn't ingest the member CSV — you're building or using OYS's own member-import path plus your own Stripe reconciliation.

## Path 3: Ghost(Pro) → self-hosted WordPress

No native path; every route runs a Ghost-JSON → WXR (or CSV) conversion before WordPress's own importer can act on it. If you're scripting this rather than using a community converter:

- WXR is XML; you're mapping `posts[].html` → `<content:encoded>`, `posts[].title` → `<title>`, `posts[].slug` → `<wp:post_name>`, `posts[].status` → `<wp:status>`, `tags[]` → `<category domain="post_tag">` entries, and reconstructing author assignment from `posts_authors` against `users[]`.
- `visibility: "members"|"paid"` has no WordPress-native equivalent — decide upfront whether that gate gets dropped (content goes public), tagged for manual paywall reconstruction in whatever membership plugin you choose, or excluded from the import entirely pending manual handling.
- Feature images and inline image URLs need the same fetch-and-rehost treatment as Path 1, targeted at WordPress's media library (via the REST API's `/wp/v2/media` endpoint if scripting, so returned attachment IDs can be wired into post content afterward) rather than a flat file path.
- Whatever conversion tool or script you use, validate against a staging WordPress install first — check rendered HTML fidelity, tag/category mapping, and author assignment before trusting a production run. This is the one path here with no vendor-maintained importer keeping the schema mapping honest for you.
- Members/Stripe: entirely manual, same as Path 4.

## Path 4: Ghost(Pro) → a custom stack

This is the cleanest source format in this hub to build a script against — take advantage of that rather than reaching for a converter tool.

**Content parse**, roughly:

```
posts = data.posts
tags_by_id = index(data.tags, "id")
users_by_id = index(data.users, "id")
post_tags = groupBy(data.posts_tags, "post_id")
post_authors = groupBy(data.posts_authors, "post_id")

for post in posts:
  record = mapToYourSchema(post)
  record.tags = post_tags[post.id].map(pt => tags_by_id[pt.tag_id])
  record.authors = post_authors[post.id].map(pa => users_by_id[pa.author_id])
  record.body = post.lexical ?? post.html
  enqueueImageRehost(extractImageUrls(record.body, post.feature_image))
  insert(record)
```

Handle `lexical` vs `html` explicitly — don't assume one key's presence. If you're moving to a system that doesn't understand Ghost's Lexical format, converting from `html` is more tractable than reverse-engineering Lexical's node structure.

**Member/Stripe transfer**, the part that actually carries risk:

- The member CSV gives you email + `stripe_customer_id` + plan flags, nothing more. There is no price/product mapping in this file — that lives in Stripe itself.
- If you keep the *same* Stripe account (recommended whenever possible): no data migration needed on the Stripe side at all. Your new system just needs to authenticate against that Stripe account and look up `cus_...` IDs to render subscription status — this is a read integration, not a transfer.
- If you're moving to a *different* Stripe account (e.g., consolidating into a new business entity): this is a live two-party operation, not a data export. You need a scoped, restricted API key on the source Stripe account, and you're copying customer records and re-mapping every price/tier combination — including any legacy or region-specific pricing that's accumulated over time. Stripe doesn't offer a built-in "move a subscription to another Stripe account" primitive; existing community tooling for this pattern (built originally for platform-to-Ghost migrations, e.g. off beehiiv) generally re-creates customers and subscriptions on the destination account rather than literally moving the originals.
- **The double-billing hazard is real and it's on you to prevent.** Because the old platform's billing isn't automatically paused when you reconnect Stripe elsewhere, a subscriber can end up charged twice in the same cycle if both the old and new integrations fire a renewal. Build an explicit safeguard: pause or cancel billing on the Ghost(Pro) side (or the source Stripe integration generally) before or immediately upon activating billing on the new side, and treat this as a manual, verified step — not something your script assumes happened.
- Currency and legacy-pricing mismatches are the most common silent failure in this kind of transfer — a customer on a EUR-denominated legacy price with no equivalent product on the destination side needs explicit handling, not a default fallback that silently reprices them.
- Build a dry-run/preview mode into whatever script does this, the same way Ghost's own importer and OYS's importer do — generate a diffable report (planned creates, planned re-links, anything that fails to map) before writing anything to Stripe or your database.

For the hosting layer once data lands correctly, see the Vercel + Supabase deploy guides in this hub — this guide stops at getting Ghost's data into your schema correctly, not at standing up the infrastructure underneath it.

## Site-size mechanics that actually change your approach

- **Small** (a few dozen posts): script correctness matters less than at scale — manual spot-checks after a single-pass import are sufficient.
- **Medium** (hundreds of posts, paid memberships): the member/Stripe reconciliation deserves its own test pass independent of the content migration — run it against a Stripe test-mode clone of your account first if you're writing custom transfer code, not just against production.
- **Large** (thousands of posts, meaningful MRR, newsletter sends at scale): budget for a phased cutover. Verify a statistically meaningful sample of reattached subscriptions (status, price, next billing date) against source-of-truth Stripe data before decommissioning the old side. Ramp newsletter sending volume on new infrastructure gradually — a sudden full-list blast from an unfamiliar sending domain triggers spam heuristics at major providers regardless of your actual historical sender reputation, since that reputation doesn't transfer with the list. This is the same deliverability-warmup and Stripe-transfer risk profile covered in the Substack and beehiiv migration guides in this hub — the mechanics converge because the constraints (Stripe subscriptions don't move themselves, IP/domain sending reputation doesn't travel) are platform-agnostic.

## Data governance by destination

| Destination | Server/DB control | Vendor lock/shutdown exposure | Export/backup | Auditability |
|---|---|---|---|---|
| Ghost(Pro) (source) | Ghost's infra, admin-panel access only | Hosted ToS relationship — pricing/feature/account decisions are theirs regardless of governance quality | Native export is functional but always extracted from infra you don't operate | MIT-licensed core, but irrelevant to your control here since you're not the operator |
| Self-hosted Ghost | Full root, your VPS | VPS provider only, infra-layer only — trivially substitutable | Native export tool + direct DB access | Same MIT-licensed codebase as Ghost(Pro), fully public |
| OYS | Full root, your VPS | VPS provider only, infra-layer only | Direct DB access, no vendor intermediary | Source-visible, no formal license grant yet (LICENSE file is a placeholder — no MIT/GPL/commercial terms chosen) — inspectable, not yet licensed for reuse the way Ghost/WordPress are |
| Self-hosted WordPress | Full root, your VPS | VPS provider only, infra-layer only | Direct DB access + mature backup-plugin ecosystem | GPLv2, exceptionally high audit surface given install base |
| Custom stack | Full control by construction | Whatever host you selected | Backup strategy is your own design decision | N/A — proprietary code you own outright |

Note the OYS asymmetry precisely: it's self-hosted and source-visible like the others, but it's the only destination in this table without a chosen open-source license backing that visibility — treat "I can read the code" and "I have explicit legal rights to fork/redistribute it" as two separate claims until that changes.

## Managed cloud vs. renting your own server: the real tradeoff

| | Managed/cloud (Vercel, Netlify, Railway, Ghost(Pro)) | Self-managed VPS (Hetzner, DigitalOcean Droplet) |
|---|---|---|
| Patch ownership | Platform-side, opaque to the operator | Yours — OS, runtime, application, and dependency patching |
| Incident response | Platform on-call, SLA/status-page backed | Yours — no default monitoring/alerting exists |
| Cost curve | Usage-based; low floor, variable ceiling | Flat rental; fixed until you resize |
| Portability | Content generally exportable; deployment config is platform-idiomatic | Full — filesystem and DB dump, zero platform-specific unwind |
| Operational skill floor | Low | Real — SSH, firewall/hardening, backup automation, incident diagnosis |

Cross-reference: **Deploy on Vercel + Supabase** for the managed-path mechanics, **Deploy on Hetzner + self-hosted Postgres** for the VPS path — this guide doesn't re-derive either.

## Who this migration isn't for

Stated plainly:

- **Zero-maintenance requirement.** If "I never want to think about server patching, uptime, or backups" is a hard constraint, none of the self-hosted paths here qualify — including Ghost-to-Ghost, which is the least-effort migration in this series but still a self-managed Linux box. Stay on Ghost(Pro) or move to a platform you don't operate yourself.
- **No sysadmin capacity, in-house or contracted.** Every path here assumes someone can SSH in, read logs, and diagnose a failed service. If that capacity doesn't exist on your team, this migration creates an operational liability regardless of how clean the data migration itself is.
- **Meaningful MRR with no bandwidth for reconciliation verification.** The Stripe re-link mechanics are sound, but "sound" isn't "unattended." Skipping verification at scale is how double-billing incidents happen — see the member/Stripe transfer mechanics above.
- **WordPress or custom-stack destination with no engineering ownership.** WordPress inherits its own patch/plugin lifecycle; a custom stack has zero vendor-maintained importer. Neither is appropriate without a developer who will own it after cutover, not just build it once.
- **Hard deadline.** There's no path here that's safely compressible into "today," including the same-platform migration — provisioning and validating a target instance takes real time even when the data transformation itself is trivial.

None of this changes the underlying assessment: Ghost(Pro) → self-hosted Ghost remains the lowest-risk migration in this guide series. "Lowest-risk" and "zero-effort" are not the same claim.

## Where I land

- **Ghost(Pro) → self-hosted Ghost**: do this natively, don't script it. The built-in importer and Stripe's email-based customer lookup handle the entire case correctly; custom tooling only adds risk here.
- **Ghost(Pro) → OYS**: use the dedicated importer for content, handle members/Stripe as a same-Stripe-account reconnection exactly like Path 1.
- **Ghost(Pro) → WordPress**: budget real validation time for the JSON→WXR mapping; nothing here is vendor-maintained the way Ghost-to-Ghost or OYS's importer are.
- **Ghost(Pro) → custom stack**: Ghost's export is the easiest schema in this hub to parse correctly — spend your engineering effort on the Stripe transfer safeguards instead, since that's where the actual operational risk lives.

## Sources

- [Ghost Help: Importing content](https://ghost.org/help/imports/)
- [Ghost Help: Exporting content and data](https://ghost.org/help/exports/)
- [Ghost Help: Import members](https://ghost.org/help/import-members)
- [Ghost Developer Docs: Migrating from Ghost to Ghost](https://docs.ghost.org/migration/ghost)
- [Ghost Developer Docs: Developer Migration Docs (custom/JSON schema)](https://ghost.org/docs/migration/custom)
- [Ghost Schema Reference — TryGhost/Ghost on GitHub](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/data/schema/schema.js)
- [Ghost Forum: Is it possible to migrate from Ghost Pro to self-hosted?](https://forum.ghost.org/t/is-it-possible-to-migrate-from-ghost-pro-to-self-hosted/39942)
- [magicpages/ghost-stripe-migration-toolkit — GitHub](https://github.com/magicpages/ghost-stripe-migration-toolkit)
- [WPBeginner: How to Properly Move from Ghost to WordPress](https://www.wpbeginner.com/wp-tutorials/how-to-properly-move-from-ghost-to-wordpress/)
- [Ghost LICENSE (MIT) — TryGhost/Ghost on GitHub](https://github.com/TryGhost/Ghost/blob/main/LICENSE)
- [WordPress.org: GNU Public License (GPLv2)](https://wordpress.org/about/license/)
- [Hetzner Cloud pricing](https://www.hetzner.com/cloud/)
- [DigitalOcean Droplets pricing](https://www.digitalocean.com/pricing/droplets)
- [Vercel Pricing](https://vercel.com/pricing)
