---
title: "Should you build on Squarespace? (Intermediate guide)"
tagline: "What's exportable, what's scriptable, and what a real migration involves"
category: own-your-stack
source_platform: squarespace
difficulty: intermediate
level: intermediate
cost_range_usd: "16-139/mo"
tags: ["website-builder", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Familiarity with HTML/CSS and basic web development concepts"
  - "Understanding of what an API, DNS record, and webhook are"
  - "Comfortable reading a rate-limit or API documentation table"
  - "Some experience scoping or estimating a technical migration"
requirements:
  - "A sense of your current Squarespace plan tier and any Code Injection usage"
  - "Awareness of your site's content volume (pages, products, subscribers) to weigh migration cost"
  - "30-45 minutes to read the technical and data governance sections"
effort_hours_min: 0.5
effort_hours_max: 1.5
---

# Should you build on Squarespace? (Intermediate guide)

I get asked about Squarespace a lot, usually by someone who wants a site up fast and doesn't want to manage a server. If you've done some HTML/CSS, know roughly what an API and DNS record are, and are trying to decide whether Squarespace is a smart foundation or a trap — this guide is for you. I'll skip the "what is hosting" explainer and go straight to what's actually exportable, what's scriptable, and what a real migration off the platform would cost you in hours.

This sits inside a larger project I'm building around avoiding platform lock-in — eventually pointing toward owning your own hosting and data outright. Squarespace is the extreme "managed, closed" end of that spectrum, so it's a useful baseline for what you're trading away when you pick convenience.

## Pricing, concretely

> **[📸 SCREENSHOT PLACEHOLDER]** — the pricing page at squarespace.com/pricing with plan comparison table expanded

As of July 2026, four tiers, priced with annual billing (month-to-month runs higher across the board — up to $139/mo on Advanced):

- **Basic** — $16/mo. No code injection, no real ecommerce.
- **Core** — $23/mo. This is the floor for anything technical: it's the cheapest tier with full Code Injection (custom `<head>`/`<footer>` HTML and JS) and zero-fee physical product sales.
- **Plus** — $39/mo. Subscriptions, abandoned cart recovery, more automation.
- **Advanced** — $99/mo. Lower payment processing rates at volume; built for high-throughput stores.

There's no free tier, only a 14-day trial with the site unpublished. If you're integrating anything external — a CMS webhook receiver, a custom analytics script, a third-party booking widget — budget for Core minimum. Payment processing runs on top of the subscription at roughly 2.9% + $0.30/transaction on lower tiers.

## What "scriptable" actually means here

Squarespace is not headless. Content and presentation are not separated the way they are in Webflow or a proper CMS — you're editing inside their rendering pipeline, not pulling structured content into your own front end. That said, there's more surface area than the marketing suggests:

1. **Template-level access** — on Code Injection–enabled plans, you get to inject custom HTML/CSS/JS into headers, footers, and (on some page types) individual pages. This is enough for tracking pixels, custom widgets, and minor DOM manipulation via JS — not enough to change how Squarespace renders its own blocks. You cannot touch the underlying markup of native blocks or Cover Pages.
2. **The JSON view** — append `?format=json-pretty` to nearly any live page URL and Squarespace will dump that page's content as JSON. This is undocumented-adjacent but widely used by developers to understand the page's data shape before writing template code. It's read-only and not a substitute for a real API.
3. **Developer Platform / Template.conf-based development** — Squarespace's actual developer tooling lets you build custom templates using their templating language (a Squarespace-flavored variant, not something portable like Liquid or Handlebars) plus JSON-T. This is a real skill investment that doesn't transfer to any other platform — you're not learning React or a general templating standard, you're learning Squarespace's proprietary system.
4. **Commerce APIs** — if you need programmatic access to orders, inventory, products, profiles, or transactions, that's a separate authenticated REST API (OAuth or API key). This is the closest thing to a "real" API Squarespace offers, and it's commerce-focused, not general CMS content access.

## Rate limits and webhooks, since you'll actually hit them

If you're planning any integration heavier than a contact form, know the numbers going in:

- Commerce API requests are capped at **300 requests/minute** (roughly 5 requests/second) per site. Exceeding it gets you a 429 response and a one-minute cooldown.
- The **Create Order** endpoint has a separate, tighter cap: **100 requests/hour per site** when authenticating with an API key (this stricter limit doesn't apply under OAuth).
- Webhooks exist (Webhook Subscriptions API) for commerce events like order creation, but Squarespace explicitly documents them as **"at least once delivery, best effort"** — not guaranteed ordering, not guaranteed exactly-once, and delivery retries can continue for up to 48 hours. If you're building anything that assumes idempotent, ordered event processing, you need to deduplicate by notification ID yourself; Squarespace does not do it for you.

None of this is disqualifying for a small store, but it rules out Squarespace as a backend for anything with meaningful transaction volume or real-time sync requirements.

## What a real migration involves

> **[📸 SCREENSHOT PLACEHOLDER]** — the Export panel under Settings, showing the "Export your site" XML download option

This is the part most people underestimate. The native export is an XML file, originally built to look like a WordPress import (WXR-style), and it only covers:

- Blog posts and basic (non-specialty) pages — text content, image *blocks* referenced within them, publish dates, and authors
- Product name/description/price data for **physical and service products only** — bundled instead as a CSV, not the XML

What it does **not** include:
- The actual image files (only references — you must bulk-download media separately, page by page or via a scraper)
- Any design, CSS, layout, or navigation structure
- Gallery/portfolio pages, cover pages, index pages, calendar pages, or store pages — entire page types are simply excluded
- Advanced blocks: Forms, Code blocks, Calendar blocks, Maps
- Digital products (non-exportable, period — if you sell downloadable goods, plan a manual re-upload elsewhere)
- Image captions/alt text/metadata
- **Squarespace 7.1 sites cannot export XML at all** as of current documentation — if you're on 7.1 (the current default version for new sites), your migration path is scraping the rendered HTML or rebuilding by hand, not exporting

A realistic migration script for a mid-size Squarespace site needs to:

1. **Crawl the live site** to capture rendered HTML/images, since the XML export is incomplete.
2. **Parse the XML** for post metadata and publish dates to preserve URLs and SEO signal.
3. **Hit the Contacts panel CSV export** for the mailing list — this part is genuinely clean, a full subscriber list with subscribed/unsubscribed status.
4. **Manually rebuild** any gallery, portfolio, or landing pages that fall outside the XML's scope. Budget real hours for this step — it's usually the majority of the work.

One more practical wrinkle: several 2026 migration write-ups note that structured data (FAQ schema, review schema, event schema) and page-level SEO metadata don't transfer and need to be manually re-entered on the destination platform — so treat SEO continuity as a manual QA pass, not an automated step.

## The content license, concretely

Publishing content grants Squarespace "a non-exclusive, worldwide, perpetual, irrevocable, royalty-free, sublicensable, transferable right and license to use, host, store, reproduce, modify, create derivative works of... communicate, publish, publicly display, publicly perform and distribute" your content, for the stated purpose of providing/improving/promoting/protecting the service. Here's what that means broken into its actual parts:

- Squarespace can use, host, store, reproduce, modify, and create derivative works from your content — not just store and serve it.
- Separately, they get a perpetual, royalty-free license to use your site (including your name and trademarks) in their own marketing, unless you opt out in account settings.
- Neither license disappears when you cancel — "perpetual" and "irrevocable" mean exactly what they say.

This is fairly standard boilerplate for hosting platforms, but it's broader than, say, a self-hosted setup where no such grant exists because there's no counterparty to grant it to.

## Data governance: how Squarespace actually handles your data

The content license covers what Squarespace can do with what you publish. Data governance is the layer underneath that: where your data (and your visitors' data) physically sits, who it's shared with, and what your compliance obligations look like if you're running anything more than a hobby site.

| Category | What Squarespace actually does |
|---|---|
| **Third-party/ad sharing** | Squarespace's policy states it doesn't "sell" data in the traditional sense, but discloses sharing Account History and Site Usage data with ad partners "to tailor our advertising outside of the Services." Under CCPA's broader definition, this counts as "sharing" for behavioral advertising even without a direct sale — the policy names the categories involved (hashed identifiers, transactions, activity data) and confirms opt-out rights apply where state law provides them. |
| **Data center locations** | Squarespace runs data storage out of Tier III data centers in the US, and serves static assets through a global CDN so visitors load pages from a nearby edge location. Exact addresses aren't published. The infrastructure is also not single-vendor — public case studies confirm it runs workloads on Google Cloud in addition to AWS (CloudFront is explicitly part of the delivery chain) — a multi-cloud setup, not one company owning the whole stack end to end. |
| **GDPR posture** | Squarespace publishes a DPA relying on the EU-US Data Privacy Framework as its primary transfer mechanism for EEA/UK/Switzerland data, with Standard Contractual Clauses as backup. It commits to "reasonable assistance" when you, as data controller, need to respond to a data subject access request. It doesn't make your site GDPR-compliant on its own — cookie banners, lawful-basis documentation, and subject-request handling stay your responsibility. |
| **Account deletion** | Squarespace's own help documentation is direct about this: deleting your account "removes data and content linked to your account from our systems," and once it's done, "it's not possible to recover your deleted account" — there's no grace period or undo. The one carve-out: Squarespace says it may retain certain data beyond that point where required for legal, financial, dispute-resolution, or policy-enforcement obligations (billing records for tax purposes, for example). |
| **Acquisition/shutdown precedent** | Not speculative — Squarespace has been on both sides of it. In 2023 it acquired Google Domains after Google exited the domain-registrar business, absorbing roughly 10 million domains. In 2024, after going private under Permira, it sold Tock — a reservation platform it had owned since 2021 — to American Express. If a feature or acquired product isn't core to the business, Squarespace's own recent history shows it's willing to divest it. |

None of this is disqualifying on its own — most of it is standard SaaS practice. But it's worth treating as a checklist item if you're building anything where a client, investor, or compliance requirement will eventually ask "where does this data live and who can access it."

## Managed cloud vs. renting your own server: what leaving Squarespace actually means

If you're evaluating whether to leave, the destination question splits into two genuinely different models, not just "Squarespace vs. everything else":

| | Staying on Squarespace | Self-hosted (Ghost/WordPress on a rented VPS) | Managed-but-open cloud (e.g. Vercel + Supabase) |
|---|---|---|---|
| **Who patches security updates** | Squarespace, entirely | You, or whoever you hire — OS patches, app updates, dependency CVEs, all of it | The platform handles infrastructure patching; you still own application-level dependencies |
| **Who's on call if it goes down** | Squarespace's ops team for infrastructure; you still have to notice your own site is affected | You, unless you build your own monitoring/alerting stack | The platform for infra-level incidents; you for app-level bugs |
| **Cost predictability** | Fixed subscription tier, predictable | Fixed server rental cost, predictable regardless of traffic | Usage-based — cheap at low volume, can scale up meaningfully with traffic |
| **Data portability** | Limited — see the export gaps covered above | Full — it's your server and your database, exportable on your own terms | Real, but not absolute — your database (e.g. Supabase Postgres) is genuinely yours to dump; some platform-specific config doesn't travel |
| **Technical skill required** | None | Real — server hardening, backups, uptime monitoring, patching cadence | Moderate — initial setup requires some comfort with deploys and environment config; day-to-day is largely hands-off |

For the mechanics of each path, I go deep on the self-hosted model in my Hetzner self-hosted Postgres guides, and on the managed-but-open model in my Vercel + Supabase guides. If Squarespace specifically is your starting point, my migrate-from-Squarespace guide covers the actual export-and-import steps.

The tradeoff in one line: Squarespace optimizes for zero operational burden at the cost of control; a rented VPS inverts that completely; the managed-but-open middle tier is where most technically-comfortable teams actually land, because it keeps data portability without asking you to run a mail server or patch a kernel.

## Who should actually stay on Squarespace

It's tempting for a series like this to read as one long argument for leaving. It isn't, and I don't think it should be. Here's where staying is the right call, not a compromise:

| If you're... | Then... |
|---|---|
| Validating a business model that might not exist in six months | Don't spend engineering time on a migration for a site whose survival is still uncertain |
| Running content/commerce volume small enough that a full rebuild is a weekend, not a quarter | The lock-in cost hasn't caught up to you yet — revisit this once your archive or SKU count grows |
| Working solo with no one to own ongoing server maintenance | A self-hosted stack trades convenience for a maintenance burden you'd be taking on personally, with no team to share it |
| Optimizing for speed to market over long-term flexibility | Squarespace is legitimately the fastest path from idea to live site — that's a real advantage, not a consolation prize |

Where I'd push back on staying: if you're already running Code Injection, integrating a commerce API, and hitting the rate limits I covered above, you've outgrown the "no technical burden" case for Squarespace and are just absorbing its constraints without getting its main benefit in return. That's the point where "not yet" should become an actual migration timeline, not a permanent default.

## Where I land

> **💡 Tip — Where I land**

For a project I intended to keep for years — a blog with real archive value, a store with a growing SKU count, anything with a subscriber list I cared about owning cleanly — I'd treat Squarespace as a staging platform, not a destination. The Core-plan Code Injection ceiling and the incomplete export are fine for a 20-page marketing site; they become a real liability past a few hundred pages of content or once you need real-time integrations. If your instinct is "I'll deal with migration later," know that "later" gets more expensive every month you're on 7.1, since template lock-in means even a redesign forces a rebuild, not a re-skin.

## Sources
- [Squarespace Pricing](https://www.squarespace.com/pricing)
- [Squarespace Developer Platform FAQ](https://support.squarespace.com/hc/en-us/articles/206545717-Squarespace-Developer-Platform-FAQ)
- [Using code injection](https://support.squarespace.com/hc/en-us/articles/205815908-Using-code-injection)
- [Exporting your site](https://support.squarespace.com/hc/en-us/articles/206566687-Exporting-your-site)
- [Rate limits — Developer Portal](https://developers.squarespace.com/commerce-apis/rate-limits)
- [Webhooks overview — Squarespace Developers](https://developers.squarespace.com/webhooks/overview)
- [Notification delivery — Squarespace Developers](https://developers.squarespace.com/webhooks/notification-delivery)
- [Squarespace Terms of Service](https://www.squarespace.com/terms-of-service)
- [Switching templates in version 7.0 FAQ](https://support.squarespace.com/hc/en-us/articles/206545367-Switching-templates-in-version-7-0-FAQ)
- [TechCrunch: Permira completes Squarespace acquisition after upping bid to $7.2B](https://techcrunch.com/2024/10/17/permira-completes-squarespace-acquisition-after-upping-bid-to-7-2b/)
- [Squarespace Privacy Policy](https://www.squarespace.com/privacy)
- [Squarespace Data Processing Addendum](https://www.squarespace.com/dpa)
- [GDPR and Squarespace](https://support.squarespace.com/hc/en-us/articles/360000851908-GDPR-and-Squarespace)
- [Where does Squarespace store my data?](https://support.squarespace.com/hc/en-us/articles/115012540827-Where-does-Squarespace-store-my-data)
- [Deleting your account](https://support.squarespace.com/hc/en-us/articles/228036268-Deleting-your-account)
- [Squarespace Enters Definitive Agreement to Acquire Google Domains Assets](https://www.prnewswire.com/news-releases/squarespace-enters-definitive-agreement-to-acquire-google-domains-assets-301852507.html)
- [Squarespace — Wikipedia (acquisition and divestiture history, incl. Tock)](https://en.wikipedia.org/wiki/Squarespace)
