---
title: "Should you build on Squarespace? (Expert guide)"
tagline: "API limits, webhook guarantees, export structure, and ToS license scope — the architecture read"
category: own-your-stack
source_platform: squarespace
difficulty: advanced
level: expert
cost_range_usd: "16-139/mo"
tags: ["website-builder", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can evaluate REST API rate limits and webhook delivery guarantees"
  - "Comfortable reading a Terms of Service content-license grant critically"
  - "Experience scoping a data migration or ETL script"
  - "Familiar with data residency, GDPR, and DPA/SCC compliance concepts"
requirements:
  - "Access to your current or planned API/integration requirements, if evaluating for a client"
  - "A copy of or access to Squarespace's Terms of Service and DPA for legal review"
  - "45-90 minutes to read the architecture and compliance sections in full"
effort_hours_min: 1
effort_hours_max: 3
---

# Should you build on Squarespace? (Expert guide)

I get asked about Squarespace a lot, usually by people evaluating it against Webflow, a headless CMS, or a fully custom stack. This is the systems-level read: rate limits, webhook delivery guarantees, export structure, and the exact license scope you sign away in the ToS. If you're deciding whether Squarespace is viable as a backend for anything beyond a marketing site, these are the numbers that matter.

Context for this series: I'm building toward a broader argument about owning your own hosting and data rather than renting it indefinitely from a platform vendor. Squarespace sits at the fully-managed, fully-closed end of that spectrum. It's useful precisely because its constraints are so explicit — they make a good baseline for evaluating how much control you're giving up anywhere else on the spectrum.

## Pricing and the plan gate for code access

> **[📸 SCREENSHOT PLACEHOLDER]** — pricing comparison table at squarespace.com/pricing

Four SKUs, annual billing (month-to-month adds a meaningful surcharge, up to $139/mo at the top tier), as of July 2026:

- Basic: $16/mo — no Code Injection, no programmatic commerce access worth discussing
- Core: $23/mo — the floor for Code Injection (custom HTML/CSS/JS in header/footer, some page-level injection) and zero-fee physical product transactions
- Plus: $39/mo — subscription commerce, abandoned cart automation
- Advanced: $99/mo — volume discounts on payment processing

There's no programmatic access tier separate from the design plans — API/developer capability rides on top of whichever design plan you're already paying for, gated primarily by Code Injection availability (Core+) rather than a distinct "API plan."

## Architecture: not headless, no general content API

Squarespace's content and rendering are coupled. There is no general-purpose read/write API for arbitrary page content — no equivalent to WordPress's REST API or a headless CMS's content endpoints. What exists instead:

1. **Squarespace Developer Platform** — template-level development using Squarespace's proprietary templating language + JSON-T, deployed via their CLI tooling. This lets you restyle and restructure how content renders, but you're bound to their block model — you cannot rewrite the markup Squarespace's native blocks or Cover Pages emit. It's a theming layer, not a data layer.
2. **The implicit JSON endpoint** — appending `?format=json-pretty` to any live URL surfaces the page's underlying JSON data dictionary. Useful for reverse-engineering data shape during template development; undocumented as a stable public contract and not something to build production tooling against.
3. **Commerce APIs** — the only formally documented, authenticated (OAuth or API key), rate-limited REST surface. Scope is orders, inventory, products, transactions, profiles — commerce operations, not general content CRUD.

If your migration or integration plan assumes you can pull structured page content out programmatically at scale, that assumption is wrong. You're working with the XML export and HTML scraping, not an API, for anything outside commerce objects.

## Rate limits and idempotency requirements

Concrete numbers to design against:

- General Commerce API ceiling: **300 requests/minute per site** (~5 req/s). A 429 triggers a fixed one-minute cooldown — not exponential backoff on their side, so your client needs its own backoff/retry logic.
- **Create Order** endpoint: separately capped at **100 requests/hour per site** when using API-key auth. This constraint is lifted under OAuth, which matters if you're building a multi-merchant integration (e.g., an app listed for other Squarespace merchants) versus a single-site internal script — use OAuth if order-creation volume matters.
- Default/unset User-Agent strings are subject to stricter throttling — set a descriptive User-Agent on every client.

**Webhooks** (Webhook Subscriptions API, commerce events only — order creation, etc.): documented as **at-least-once delivery, best effort**, explicitly *not* guaranteed in event order or generation-time order, with retries continuing for up to 48 hours on non-2xx responses or timeouts. Duplicate delivery is called out as an expected edge case, not a bug. Practical implication: your webhook consumer must be idempotent by notification ID and must not assume causal ordering between event types — if you need strict ordering (e.g., inventory decrement before fulfillment trigger), you need to reconstruct sequence server-side using timestamps in the payload, not delivery order.

There is no documented SLA on webhook latency or the Developer Platform's uptime beyond a public status page; treat this as best-effort infrastructure, not something to build a hard real-time dependency on.

## Export structure: what a migration script must actually handle

The native export is a WXR-style XML file (modeled on WordPress's import format), and as of current documentation, **Squarespace 7.1 sites cannot generate an XML export at all** — only legacy 7.0 sites can. This alone is a material constraint: a large fraction of current Squarespace sites are 7.1 by default, meaning the "native export" path is unavailable to them and migration reduces to HTML scraping plus manual reconstruction.

Where XML export is available (7.0), the file contains:
- Blog posts and standard (non-specialty) page text content, including image *block references* (not the binary image files themselves)
- Metadata: original publish dates, post authors

Explicitly excluded from XML:
- Design/CSS/template/navigation structure entirely
- Specialty page types: gallery, cover, index, portfolio, calendar, and store pages
- Advanced block types: Form, Code, Calendar, Map blocks
- Image files themselves and their metadata (captions, alt text)
- Digital products (non-exportable under any mechanism)

Commerce data ships separately as CSV, and only for **physical and service products** — digital product records are not portable at all, meaning a migration off Squarespace for a digital-goods business requires manually recreating the product catalog on the destination platform from scratch.

A production-grade migration script therefore needs at minimum:

1. **An XML parser** for the 7.0 subset, if applicable.
2. **A site crawler** to capture rendered HTML/CSS/asset URLs for everything XML misses — which on 7.1 is the *only* path.
3. **An asset downloader** that resolves and bulk-fetches referenced media, since image blobs aren't in any export.
4. **A separate CSV ingestion path** for physical/service commerce data.
5. **The Contacts-panel CSV export** for mailing lists — clean, includes subscribed/unsubscribed status, and the one genuinely complete export surface.
6. **Manual reconstruction** of structured data (FAQ/review/event schema.org markup) and page-level SEO metadata, which multiple 2026 migration write-ups confirm do not survive any automated path and must be re-entered by hand on the target platform.

## Content license and compliance surface

The Terms of Service content-license clause grants Squarespace: "a non-exclusive, worldwide, perpetual, irrevocable, royalty-free, sublicensable, transferable right and license to use, host, store, reproduce, modify, create derivative works of... communicate, publish, publicly display, publicly perform and distribute" all user content, scoped to providing/improving/promoting/protecting the Services. A second, separate grant lets Squarespace use your site (including names, trademarks, logos on it) in their own marketing and promotional activities — opt-out is available per-account.

For compliance-sensitive builds, here's what that means concretely:

- **The license survives account termination** — "perpetual" and "irrevocable" mean exactly what they say.
- **It's sublicensable** — Squarespace can pass rights to third-party processors, which the ToS separately identifies as acting on Squarespace's behalf for hosting.
- **It's broader in scope than a typical hosting-only grant** — it covers "modify" and "create derivative works of," not just "store and serve."

This is standard SaaS boilerplate rather than unusual overreach, but if you're evaluating Squarespace for a client with strict content-ownership or data-processing requirements — for example, contractual language requiring the ability to fully revoke a vendor's rights to content on termination — this clause needs explicit legal review. "Irrevocable" is a hard blocker for some contracts by definition.

## Ownership and governance context

Squarespace went private via Permira's acquisition:

- Announced May 2024 at $6.9B ($44.00/share).
- The deal was later increased and closed October 2024 at approximately $7.2B ($46.50/share) — a 36.4% premium over the 90-day VWAP.
- Founder Anthony Casalena rolled over a majority of his equity and remains CEO/Chairman.

From an architecture-risk standpoint, this matters less for day-to-day API stability and more for medium-term roadmap risk: private equity ownership typically optimizes for margin and eventual resale rather than platform openness, and there's no public earnings disclosure anymore to track financial health or strategic direction shifts — like the Developer Platform's investment level — from the outside.

## Data governance: how Squarespace actually handles your data

The ToS content-license clause covers what Squarespace can do with your published content. Data governance is the adjacent, less-discussed layer: where the data actually sits, who it's disclosed to, and what your compliance exposure looks like if you're running this for a client with real regulatory obligations.

| Dimension | Detail |
|---|---|
| **Third-party/ad disclosure** | Squarespace's policy says it does not "sell" data under CCPA's core definition, but discloses sharing Account History and Site Usage data with ad partners "to tailor our advertising outside of the Services." In scope for CCPA "Share"/"Sell" treatment: non-directly-identifying identifiers, commercial transaction data, internet activity data. For a regulated-vertical client, this belongs in their own privacy policy — it's happening at the platform layer, outside their control. |
| **Infrastructure/data residency** | Data storage runs through Tier III data centers in the US, confirmed in Squarespace's own help documentation; static assets are served via a global CDN, with AWS CloudFront explicitly part of the delivery chain. Squarespace also runs workloads on Google Cloud per public case-study material — multi-cloud in practice, not a single stable vendor commitment. Exact facility addresses are undisclosed, so you cannot answer a client's "which specific data center" question with certainty. |
| **GDPR mechanism** | Squarespace's DPA names the EU-US Data Privacy Framework as its primary transfer mechanism for EEA/Swiss/UK data, backed by Standard Contractual Clauses and the UK's addendum. It commits to "reasonable assistance" for controller-side GDPR obligations — but Squarespace is a processor here, not a controller, so liability for your site's consent flows and subject-request SLAs stays with you. The DPA covers Squarespace's obligations to you, not yours to your visitors. |
| **Account/data deletion lifecycle** | Squarespace's docs state plainly that deletion "removes data and content linked to your account from our systems" and afterward "it's not possible to recover your deleted account" — no disclosed grace period or soft-delete window. One exception: data may be retained "to comply with legal or financial obligations, protect our and others' rights, resolve disputes, or enforce our legal terms." Flag that carve-out to a client rather than promising unconditional erasure. |
| **Acquisition/discontinuation precedent** | Concretely observable: Squarespace acquired Google Domains' ~10M-domain book in 2023 after Google exited that business, then in 2024 — post-Permira take-private — divested Tock (acquired 2021) to American Express once it no longer fit strategically. Under PE ownership, capital decisions like this happen without public earnings disclosure — no external signal before a feature you depend on gets sunset or sold. Factor this in for any client counting on one surviving years. |

None of this makes Squarespace non-viable for a compliance-conscious build — the DPA and DPF/SCC coverage are real and match what most SaaS vendors offer. But "matches industry standard" and "meets a specific client's regulatory bar" are different questions, and this table is what I'd hand a client asking the second one.

## Managed cloud vs. renting your own server: what leaving Squarespace actually means

The decision isn't binary. There are effectively three operating models, each with a distinct risk/control profile:

| | Staying on Squarespace | Self-hosted (Ghost/WordPress on a rented VPS) | Managed-but-open cloud (e.g. Vercel + Supabase) |
|---|---|---|---|
| **Patch ownership** | Fully abstracted — Squarespace's responsibility, zero visibility for you into cadence or CVE response time | Fully yours — OS-level patching, app updates, dependency CVEs, kernel security, all of it, on your schedule and your liability | Split — platform patches infrastructure/runtime; you own application dependencies and their CVEs |
| **Incident response** | Squarespace's SRE org for infrastructure-level incidents; no SLA disclosed publicly beyond a status page; you're still solely responsible for detecting your own site-specific breakage | Entirely you — no one pages you at 3am unless you build that pager rotation yourself | Platform SLA covers infra; you still need app-level observability and alerting |
| **Cost model** | Flat subscription, no usage-based surprises, but no ability to negotiate or self-optimize | Flat server rental, fully predictable, but you eat the cost of over-provisioning for headroom | Usage-based — cheap at low traffic, but requires active cost monitoring as you scale; the least predictable of the three |
| **Data portability** | Weak — bound by the export gaps detailed earlier in this guide (no general content API, XML export unavailable on 7.1) | Maximal — full database and filesystem access, portable by construction | Strong but not absolute — Postgres dumps are yours cleanly; platform-specific config (edge functions, auth config) requires manual re-implementation elsewhere |
| **Technical skill floor** | Effectively zero | High — security hardening, backup verification, uptime monitoring, capacity planning are all your problem | Moderate — CI/CD and environment config competence required upfront; low ongoing burden once stable |

I cover the self-hosted model's actual operational surface in the Hetzner self-hosted Postgres guides, and the managed-but-open model in the Vercel + Supabase guides — both go deep on the specific tradeoffs summarized above. For the mechanics of getting content out of Squarespace specifically, see the migrate-from-Squarespace guides.

For an architecture recommendation, the deciding variable is almost never "can this team learn Linux" — it's whether anyone on the team is actually going to own the pager. If the answer is no, the self-hosted option is a liability regardless of technical competence, and the managed-but-open tier is the honest choice even for teams capable of running their own infrastructure.

## Who should actually stay on Squarespace

I'll be direct about this rather than hedging: some of the reasons people give for staying on Squarespace are legitimate, and some are avoidance dressed up as a technical assessment. Worth separating them.

**Legitimate reasons to stay, at least for now:**

- The site is still in a validate-or-kill phase and a migration would be sunk cost if the project doesn't survive six months.
- Content/commerce volume is genuinely small enough that a full rebuild is a bounded, low-risk weekend project rather than a multi-week effort — meaning the lock-in cost this guide documents hasn't materialized into an actual liability yet.
- There's no one on the team who will own security patching and uptime monitoring long-term, and there's no budget to hire that role or outsource it to a managed platform — in that specific case, Squarespace's full abstraction of ops is a legitimate constraint-driven choice, not a lazy one.
- Speed-to-market matters more than architectural purity for this specific launch, and the plan is to re-platform once the business model is validated — as long as that plan has an actual trigger condition, not just a vague someday.

**Where "staying" stops being a technical decision and starts being avoidance:**

- You're already on Core+ paying for Code Injection, hitting the Commerce API's rate limits, and building webhook consumers around Squarespace's best-effort delivery guarantees. At that point you've absorbed every operational constraint of a custom backend without any of the ownership benefits — you're doing the hard part and still renting.
- The stated blocker is "we don't have time to migrate," but the site has been on 7.1 for over a year, meaning the migration cost is only increasing as the XML export gap compounds and content volume grows. Deferral here isn't neutral — it's actively raising the exit cost every month.
- The real objection is "I don't want to learn something new," not "we lack the resources to operate infrastructure." Those require different solutions — the second one is solved by the managed-but-open tier, which asks for very little ongoing operational skill. If it's the first one, that's worth naming honestly rather than letting it hide behind a cost-benefit framing it doesn't actually satisfy.

If you're advising a client rather than deciding for yourself, this is the distinction worth making explicit in the recommendation: "not ready to migrate" and "actively accumulating migration debt while getting no platform benefit in return" are different situations that deserve different advice, even when they look identical from the outside.

## Where I land

> **💡 Tip — Where I land**

Architecturally, Squarespace is fine as a rendering layer for a low-complexity marketing site where you don't need programmatic content access, real-time event guarantees, or a clean migration path later. It is not viable as a system-of-record for anything you plan to integrate deeply or migrate cleanly: no general content API, best-effort-only webhooks, an export format that's actively unavailable on the current default site version (7.1), and a content license that's broad and irrevocable by design. If a client asks me to build something meant to last and stay portable, I steer them toward a headless CMS or a self-hosted stack from day one — the 20 hours saved standing up Squarespace initially are frequently repaid several times over in migration cost the day you need to leave.

## Sources
- [Rate limits — Developer Portal](https://developers.squarespace.com/commerce-apis/rate-limits)
- [Webhooks overview — Squarespace Developers](https://developers.squarespace.com/webhooks/overview)
- [Notification delivery — Squarespace Developers](https://developers.squarespace.com/webhooks/notification-delivery)
- [Frequently asked questions — Squarespace Developers (Commerce APIs)](https://developers.squarespace.com/commerce-apis/faq)
- [Developer Tools APIs at Squarespace](https://support.squarespace.com/hc/en-us/articles/41325887099533-Developer-Tools-APIs-at-Squarespace)
- [Exporting your site](https://support.squarespace.com/hc/en-us/articles/206566687-Exporting-your-site)
- [Squarespace Terms of Service](https://www.squarespace.com/terms-of-service)
- [Squarespace Developer Terms](https://www.squarespace.com/developer-terms)
- [TechCrunch: Permira is taking Squarespace private in $6.9B deal (May 2024)](https://techcrunch.com/2024/05/13/permira-is-taking-squarespace-private-in-6-6-billion-deal/)
- [TechCrunch: Permira completes Squarespace acquisition after upping bid to $7.2B (October 2024)](https://techcrunch.com/2024/10/17/permira-completes-squarespace-acquisition-after-upping-bid-to-7-2b/)
- [Squarespace Privacy Policy](https://www.squarespace.com/privacy)
- [Squarespace Data Processing Addendum](https://www.squarespace.com/dpa)
- [GDPR and Squarespace](https://support.squarespace.com/hc/en-us/articles/360000851908-GDPR-and-Squarespace)
- [Where does Squarespace store my data?](https://support.squarespace.com/hc/en-us/articles/115012540827-Where-does-Squarespace-store-my-data)
- [Deleting your account](https://support.squarespace.com/hc/en-us/articles/228036268-Deleting-your-account)
- [Squarespace Enters Definitive Agreement to Acquire Google Domains Assets](https://www.prnewswire.com/news-releases/squarespace-enters-definitive-agreement-to-acquire-google-domains-assets-301852507.html)
- [Squarespace — Wikipedia (acquisition and divestiture history, incl. Tock)](https://en.wikipedia.org/wiki/Squarespace)
