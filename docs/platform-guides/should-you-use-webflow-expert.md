---
title: "Should you build on Webflow? (Expert)"
tagline: "Data API internals, migration-script requirements, and the AWS/Fastly/Cloudflare hosting stack"
category: own-your-stack
source_platform: webflow
level: expert
difficulty: advanced
cost_range_usd: "0-2500/mo"
tags: ["website-builder", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can read API rate-limit, auth-scope, and pagination documentation critically"
  - "Comfortable evaluating a CDN/hosting architecture (origin, edge cache, DNS layers)"
  - "Can assess a DPA, SCCs, and controller/processor split for compliance risk"
  - "Experience architecting a data-extraction or sync script against a REST API"
requirements:
  - "Access to API documentation and ability to test authenticated requests"
  - "A concrete inventory of your Collections, reference fields, and item counts"
  - "Familiarity with your own compliance obligations (GDPR/CCPA) as data controller"
  - "45-60 minutes to review the API, hosting-architecture, and governance sections in full"
effort_hours_min: 1
effort_hours_max: 3
---

# Should you build on Webflow? (Expert)

Webflow is the only platform in this series with a real Collections-based CMS and a documented Data API — the rest are page builders with a blog bolted on. That makes it worth evaluating from a systems angle: what the API actually gives you, what a migration script would need to do given the export gap, and what's underneath the hosting claims. This is written for someone evaluating from an integration/infrastructure perspective, not someone who needs the CMS concept explained.

## Pricing structure, post-May 2026 restructure

Rolled out for new purchases May 13, 2026; existing sites migrate at next renewal on or after June 29, 2026.

- **Starter (free)** — 1 site, webflow.io subdomain, 2 pages, CMS capped at 20 Collections / 50 items
- **Basic — $15/mo** annual — 300 static pages, no CMS
- **Premium — $25/mo** annual, $39/mo month-to-month — merges the old CMS + Business tiers; 20,000 CMS items, 40 Collections, 50GB bandwidth (down from the old Business plan's 100GB — a real regression if you're serving media-heavy Collection pages at volume)
- **Team — $2,500/mo** annual — 10 seats, 100 Collections, Localize, page branching, single-page publishing

CMS item add-ons were eliminated in this restructure — the 20,000-item Premium ceiling is now a hard cap, not an extensible one. If you're modeling a Collection that could exceed that (a large product catalog, a directory site), your options are:

- **Upgrade to Team pricing** for the higher 100-Collection ceiling
- **Split content across multiple Collections or sites**, which has its own referential-integrity headaches given Collections support reference fields between each other within a single site

## Data API: auth model and rate limits

Two auth paths exist:

- **Site Tokens** — scoped to a single site, suit simple single-tenant integrations
- **OAuth 2.0** (authorization code flow) — required for anything spanning multiple sites or acting on behalf of a user, with granular scopes (e.g., `cms:read`, `cms:write`, `sites:read`, `users:read`, `users:write` for full user lifecycle operations)

Rate limiting is the detail that actually shapes integration design. Key facts:

- **Default ceiling** — 60 requests/minute
- **Shared bucket per site** — every integration hitting the same site's API draws from the same 60–240 req/min allowance depending on plan tier, not 60 per app. If you're running a CMS sync job alongside a separate analytics or forms integration against the same site, they compete for the same quota.
- **Exceeding the limit** — returns HTTP 429 with a `Retry-After` header (typically 60s); the response also carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers, so a well-behaved sync client should back off proactively rather than waiting to hit 429.
- **Site Publish operations** — a separate, tighter constraint of one successful publish per minute, which matters if your sync pattern is "batch-update N items, then publish," since you can't just fire a publish call after every single item write.

Design implication: a bulk sync of a few thousand Collection Items at 60 req/min is a multi-minute-to-hour job by construction, not a bug to work around. Batch endpoints exist for CMS Items and should be preferred over per-item calls wherever the workflow allows it, specifically to stay under the shared bucket.

> **[📸 SCREENSHOT PLACEHOLDER]** — API response headers showing rate-limit fields in a request inspector
>
> _Replace this callout with the real screenshot before publishing._

## What a migration script actually needs to handle

The static code export explicitly excludes Collections/CMS content, user accounts, e-commerce data, and localized content — Collection list elements render empty, and item template pages simply don't get generated. This means "export my site" and "get my content out" are two different problems, and any real migration tooling has to solve the second one directly. Here are the three viable approaches, in order of robustness:

1. **API-based extraction (preferred).** Walk every Collection via the Data API's list/get endpoints, paginate through all Items, and serialize the full field set — including reference/multi-reference fields, which resolve to Item IDs you'll need to re-map if you're rebuilding relationships in a new system. Rich-text fields come back as Webflow's own HTML-ish serialization and need normalization if the destination isn't also rendering Webflow-flavored markup. This is the only approach that reliably captures structured data (typed fields, not just rendered text) and should be run as a standing scheduled job, not a one-time event at migration time — it doubles as ongoing backup.

2. **Rendered-page scraping.** Tools like Wget, HTTrack, or the community-built ExFlow crawl the *published* site and save rendered HTML per item page. This captures what a visitor sees but loses field-level structure — you get a paragraph of HTML, not a `price` field and a `description` field separately — and it silently fails to capture anything gated behind forms, search, or password protection, since those don't function on crawled/exported output. It also won't find Items that exist in the CMS but aren't linked from any page a crawler can reach — an orphaned Collection Item with no inbound link is invisible to a scraper but fully visible via the API.

3. **Manual/hybrid.** For small Collections, exporting via the API to CSV/JSON and hand-verifying is often faster and lower-risk than building crawler infrastructure for a one-time job.

A migration script should assume approach 1 wherever the API scope allows it, and fall back to approach 2 only for content types the API doesn't expose (if any) or where reference relationships have already degraded.

## Hosting architecture

The stack, layer by layer:

- **Origin** — Webflow-published sites are hosted on AWS
- **CDN** — static asset delivery runs through Fastly, with edge nodes across North America, Europe, Asia-Pacific, and Latin America in a pull-through cache model where cold requests hit AWS origin and get cached for subsequent hits
- **Optional layer** — Cloudflare is available as an additional integration layer (DNS/proxy) rather than a replacement for the Fastly edge
- **Publish flow** — compiles your design into static HTML/CSS/JS, then distributes it to the Fastly edge
- **Stated targets** — Webflow says this architecture delivers 99.99% uptime and sub-50ms delivery to 95% of global traffic

The practical constraint: full custom hosting — pushing the compiled output to your own AWS account, Azure, or GitHub Pages as the primary serving path — is gated to Enterprise plans. On Premium and Team, Webflow's hosting is mandatory for the live site; the static export is a point-in-time snapshot you can self-host separately, not a way to run your production site on infrastructure you control while still using the Webflow builder day-to-day.

## Company trajectory

Two rounds of workforce reduction in two years:

- **July 2024** — ~8% of staff laid off
- **June 2024** — Linda Tong takes over as CEO
- **March 2026** — Webflow acquires Vidoso.ai for AI-generated brand/creative assets
- **May 27, 2026** — a further restructuring under Tong, framed publicly as a pivot toward an "agentic web marketing platform" rather than a pure site builder
- **May 2026 severance terms** — 16 weeks base pay plus one week per year of service, and six months of COBRA
- **May 2026 fallout** — reporting described same-day system lockouts without advance notice for affected US staff

No ownership change or acquisition of Webflow itself has occurred — it remains private, last valued near $4B in 2022 — but the product strategy is visibly in motion, which matters if you're betting on API stability or feature continuity over a multi-year horizon.

## Data governance: how Webflow actually handles your data

Worth separating from the CMS-export mechanics above: what Webflow's data-handling posture actually is today, and what it implies for anyone treating Webflow as infrastructure rather than a rendering layer.

Pulled directly from Webflow's Global Privacy Policy (effective March 17, 2025), its EU & Swiss Privacy Policy, and its DPA:

| Control area | Details |
|---|---|
| Personal data monetization | Policy explicitly prohibits selling, renting, or loaning Personal Information to third parties. Separately, "De-identified Data" (anonymized/aggregated) is shared with customers, partners, and service providers, with advertising and marketing use named explicitly as a permitted purpose — a real data flow that a strict "we never share" reading would miss. |
| Log/telemetry collection | IP addresses, request timestamps, user-agent strings, installed fonts, MIME types, browser language/timezone, installed plugins, HTTP headers, and screen resolution, collected from end-user traffic hitting customer sites. Used for tiered billing (visitor-count-based plans), security, and building separate analytics products — the policy states those analytics products are built only from de-identified data. |
| Controller/processor split | Webflow is processor for site content and visitor data you collect; you are controller, responsible for your own site's GDPR/CCPA-facing obligations (consent banners, privacy notices, DSAR handling for your own end users). Webflow's DPA incorporates the EU Standard Contractual Clauses for the processor-to-processor transfer chain. |
| Cross-border transfer mechanism | Webflow, Inc. is a Delaware corporation based in San Francisco; hosting/processing runs primarily on U.S.-based AWS infrastructure. Certified under the EU-U.S. Data Privacy Framework, its UK extension, and the Swiss-U.S. DPF — DPF complaints route through JAMS as the named arbitration provider. |
| State privacy law exposure | CCPA and equivalent state statutes (Colorado, Connecticut, Virginia, Utah, named explicitly in the policy) grant right-to-know, right-to-delete, and right-to-opt-out-of-sale. Webflow maintains a dedicated "Do Not Sell My Info" opt-out — a tell that its de-identified-data-for-marketing sharing is being treated internally as a CCPA-scoped "sale," despite not literally exchanging PII for cash. |
| Account/content lifecycle on deletion | Deletion is a multi-step gated process: cancel all site plans → archive to two sites per workspace → downgrade to free Starter → request deletion via support. Webflow's docs state the result is unrecoverable once processed. Independent write-ups describe a roughly 30-day dormant-but-recoverable window before purge; this isn't in Webflow's own docs, so don't treat it as a guarantee — a hard SLA on destruction timing is an Enterprise-contract conversation. |
| The May 2026 restructuring's data implications | The privacy policy predates the May 2026 "agentic web" pivot under CEO Linda Tong by over a year — unrevised for whatever new AI-driven data pipelines that pivot introduces. For anyone treating Webflow as a long-term dependency: do "agentic" features (site content feeding AI agents, cross-customer analysis) fold into the existing "De-identified Data" carve-out, or trigger a rewrite? Unanswered — recheck at each product announcement. |

The practical takeaway for someone integrating against the Data API: your obligations as controller don't change because Webflow is the processor doing the heavy lifting underneath — you still need your own DPA execution, your own retention policy for anything you cache locally from the API, and your own answer for what happens to synced data if Webflow's policy changes out from under a live integration.

## Managed cloud vs. renting your own server: what leaving Webflow actually means

The rate-limit and auth details above only matter if you're staying integrated with Webflow as the presentation layer. If you're evaluating a full exit, the real architectural decision is which infrastructure model replaces Webflow's managed hosting — and each one shifts operational burden differently.

| | Webflow (fully managed) | Self-hosted VPS (Ghost/WordPress on Hetzner, DigitalOcean) | Managed-but-open cloud (Vercel + Supabase, Webflow Data API as sync source) |
|---|---|---|---|
| Security patch responsibility | Webflow's — origin (AWS), CDN (Fastly), and application layer are all vendor-managed, opaque to you | Yours entirely — OS-level CVEs, app framework updates, dependency audits, TLS renewal, all of it | Split — platform vendor patches the managed runtime/DB engine; you own your own application dependencies and code-level vulnerabilities |
| On-call/incident response | Webflow's infra team, against a stated 99.99% uptime target and sub-50ms edge delivery to 95% of traffic | You, or whoever you contract, with no SLA beyond what your hosting provider guarantees for the bare VM | Platform SLA covers infra/DB availability; your application logic (including Data API sync jobs) is your incident surface |
| Cost model | Tiered flat pricing that steps sharply at scale — Team tier is $2,500/mo for 10 seats regardless of actual resource consumption | Flat monthly VM cost, largely traffic-insensitive — genuinely predictable, but you're paying for capacity whether you use it or not | Usage-metered — compute, bandwidth, row counts, and function invocations all scale cost with load, which is efficient at low volume but requires active monitoring as you grow |
| Data portability | Weak specifically for CMS content — static export excludes Collections, e-commerce data, and localized content entirely; portability exists only via the Data API, which you have to build yourself | Total — raw filesystem and database access, standard dump/restore tooling, no vendor gate on your own data | Strong — Postgres is a portable, standard format; Supabase-specific features (RLS policies, edge functions) require translation work on exit, but the core data doesn't |
| Technical skill floor | Low — no infrastructure knowledge required at all | High — full systems administration: networking, backups, patching, monitoring, disaster recovery | Moderate-high — no OS/network administration, but real schema design, API integration code, and rate-limit-aware sync logic (see the 60 req/min shared bucket above) |

Cross-referencing the rest of this hub: the self-hosted path is covered in depth in my deploy-on-hetzner-self-hosted-postgres guides, the managed-open path in my deploy-on-vercel-and-supabase guides, and the mechanics of actually extracting Webflow content for either destination in my migrate-from-webflow guides.

The architectural read: none of these is strictly "better" — they sit on a control-versus-maintenance-burden curve, and the right point on that curve is a function of whether you have (or want) in-house operational capacity, not a function of which one is more virtuous.

## Who should actually stay on Webflow

Framed as a systems decision rather than a philosophical one: staying is the correct call whenever the maintenance burden of any alternative exceeds the actual lock-in risk you're carrying. Concretely, that's:

- **Your Collection footprint is small enough that the export gap is a rounding error.** If a full manual CSV re-entry of every Collection Item would take an afternoon, not a quarter, the lock-in risk this whole series is about barely applies to you — architecting around it costs more than eating it would.
- **You have no in-house capacity for infrastructure operations.** Every alternative in the table above requires either full systems administration (the VPS path) or real application-layer engineering with rate-limit-aware sync logic (the Vercel+Supabase path). If neither exists on your team today and hiring for it isn't in the budget, migrating trades a known, bounded vendor risk for an unbounded operational one.
- **You're already running the correct architecture against Webflow.** If you've implemented the pattern this guide's verdict recommends — Webflow as rendering layer only, canonical content in your own database, the Data API as a scheduled pull-based backup — you've already neutralized the export-gap risk without leaving. There's no additional lock-in reduction to be gained from migrating the rendering layer itself; you've already solved the actual problem.
- **Your integration depends on Webflow-specific product surface you'd have to rebuild.** Localization (Webflow Localize), e-commerce checkout, or form-handling built against Webflow's native tooling represents real engineering investment that a self-hosted alternative doesn't hand you for free — Ghost and WordPress have their own equivalents, but porting to them is a rebuild, not a migration, for anything beyond basic CMS content.
- **The compliance or data-handling gap you're worried about isn't actually closed by self-hosting.** Moving off Webflow doesn't automatically make you GDPR-compliant — you're the data controller either way, on Webflow or off it. If your actual concern is the controller/processor split described above, the fix is doing your own compliance work properly, not necessarily changing infrastructure vendors.

The honest bottom line for this platform specifically: Webflow is the most technically credible platform in this evaluation series, and for a meaningful share of the people reading it, the right move is deeper integration against its Data API rather than migration away from it. Leave when a documented cost, a compliance requirement Webflow's model genuinely can't meet, or a feature ceiling forces the decision — not on lock-in anxiety alone.

## Verdict

> **💡 Tip — Where I land**
>
> Of the platforms in this series, Webflow is the one I'd trust with real integration work — the Data API, auth model, and rate-limit contract are documented well enough to build against with confidence. My architecture preference: treat Webflow purely as the rendering/hosting layer, keep canonical content in your own database, push to Webflow via the batch CMS endpoints respecting the shared rate-limit bucket, and run the same API as a scheduled pull-based backup so the export gap never becomes a fire drill. Don't rely on Enterprise-gated custom hosting or the static export as your actual ownership guarantee — build the ownership yourself, one API call at a time.

## Sources

- [Webflow: Updated pricing and simplified plans for May 2026](https://help.webflow.com/hc/en-us/articles/51059955082387-Updated-pricing-and-simplified-plans-for-May-2026)
- [Webflow Data API docs](https://developers.webflow.com/data/docs/data-clients)
- [Rate Limits – Webflow Developer Documentation](https://developers.webflow.com/data/reference/rate-limits)
- [Authenticating with the Webflow API](https://developers.webflow.com/data/reference/authentication)
- [Publish Site API: New Rate Limits – Webflow Developer Documentation](https://developers.webflow.com/data/changelog/publish-site-api-new-rate-limits)
- [How do I export my Webflow site code? – Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961386739347-How-do-I-export-my-Webflow-site-code)
- [Can you export a Webflow website? Understanding code export limitations](https://brixtemplates.com/blog/can-you-export-a-webflow-website-understanding-code-export-limitations)
- [Webflow architecture: hosting, CDN & security — werun.dev](https://werun.dev/blog/webflow-architecture-explained-hosting-cdn-security-and-performance)
- [Webflow hosting overview – Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961342422547-Webflow-hosting-overview)
- [A message to the Webflow team (restructuring announcement)](https://webflow.com/blog/restructuring-announcement)
- [Locked Out Before Logoff: Webflow's Sudden SF Layoffs Jolt Tech Workers](https://hoodline.com/2026/05/locked-out-before-logoff-webflow-s-sudden-sf-layoffs-jolt-tech-workers/)
- [Webflow Global Privacy Policy](https://webflow.com/legal/privacy)
- [Webflow EU & Swiss Privacy Policy](https://webflow.com/legal/eu-privacy-policy)
- [Webflow Data Processing Addendum](https://webflow.com/legal/dpa)
- [Delete your Webflow account – Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961237847443-Delete-your-Webflow-account)
- [Webflow Account Deletion: Site & Data Consequences – Chillybin](https://www.chillybin.co/webflow-sites-data-delete-account/)
