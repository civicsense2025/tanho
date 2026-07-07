---
title: "Should you build on beehiiv? (Expert Guide)"
tagline: "The Substack alternative built to compete on ownership terms — mostly"
category: own-your-stack
source_platform: beehiiv
difficulty: expert
level: expert
cost_range_usd: "0-419/mo"
tags: ["newsletter", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can read OAuth scopes, rate-limit headers, and webhook payload docs critically"
  - "Comfortable evaluating a REST API's auth model and pagination design"
  - "Can assess a DPA, SCCs, and controller/processor obligations for compliance risk"
  - "Experience architecting sync or migration scripts against billing APIs like Stripe"
requirements:
  - "Access to API documentation and ability to test authenticated requests"
  - "Familiarity with your own data-retention and compliance obligations (GDPR/CCPA)"
  - "A concrete list of what your integration needs to support (paywalls, embeds, custom fields)"
  - "45-60 minutes to review the API, governance, and migration-script sections in full"
effort_hours_min: 1
effort_hours_max: 3
---

# Should you build on beehiiv? (Expert Guide)

You're evaluating beehiiv as a system, not a UI. This is the version of the guide for someone deciding whether to build an integration, write a migration script, or architect a newsletter layer that talks to beehiiv's API as one component in a larger stack. It sits inside my broader "own your hosting, avoid lock-in" thesis — beehiiv is closed, hosted infrastructure, full stop, but it's the newsletter platform with the most honest API surface of the ones I've evaluated, which matters if you're treating it as a swappable component rather than a destination.

## Pricing model, mechanically

Four plan types (Launch/Scale/Max/Enterprise), each gated by an "active subscriber" count band, not total list size — inactive/unsubscribed contacts don't count against your tier. Verified against beehiiv's pricing page directly:

- **Launch** — $0 to 2,500 subscribers, with API access (excluding the Send API) and beehiiv MCP read access, but zero monetization surface.
- **Scale** — starts at $43/mo annual ($49/mo monthly), unlocks paid subscriptions at 0% platform take, webhooks, and beehiiv MCP write access, scaling to $329/mo near 100K subscribers.
- **Max** — starts at $96/mo annual ($109/mo monthly), adds branding removal, multi-publication support (10 pubs/workspace vs. 3 on Scale/Launch), and unlimited team seats, topping out near $419/mo.
- **Enterprise** — the only path past the 100K ceiling, and the only tier with the transactional Send API and dedicated IPs.

A couple of mechanics worth flagging:

- Both Scale and Max share a 100K active-subscriber ceiling *per workspace*, not per publication — if you're running multiple newsletters under one account, they draw from the same pool.
- beehiiv now ships an MCP (Model Context Protocol) server — read access on Launch, write access from Scale up — a newer surface for LLM-agent-driven publication management worth knowing about if you're building automation on top of an AI agent rather than a traditional script.

> **[📸 SCREENSHOT PLACEHOLDER]** — the beehiiv API reference OpenAPI spec download link
>
> _Replace this callout with the real screenshot before publishing._

## Auth model and rate limits

Two auth paths:

- **Static API keys** — simplest, scoped per-workspace.
- **Full OAuth2** — an authorize/token/introspect/revoke flow for third-party apps acting on a user's behalf.

Scopes are granular and resource-specific:

- `posts:read`, `posts:write`
- `subscriptions:read`, `subscriptions:write`
- `segments:read/write`
- `webhooks:read/write`
- `custom_fields:read/write`
- `tiers:read/write`
- `automations:read/write`
- `newsletter_lists:read/write` (beta)
- `identify:read`
- `complimentary_access:read`
- `condition_sets:read`
- `data_deletion:read/write`
- `referral_program:read`
- `publications:read`

That granularity means you can issue a key that can create subscriptions but never read post content, which is worth doing rather than defaulting to a full-access key for anything customer-facing.

Rate limiting is a flat 180 requests/minute per organization (not per-key), enforced with standard `RateLimit-Limit`/`RateLimit-Remaining`/`RateLimit-Reset` response headers and a 429 on overage. beehiiv's own documentation recommends a queue-plus-exponential-backoff pattern and explicitly calls out four reasonable implementations:

- Bottleneck (JS)
- Celery (Python)
- Sidekiq (Ruby)
- SQS/QStash

There's no generous burst allowance beyond that, so any bulk sync job needs real client-side throttling, not just retry-on-429. For subscriber-heavy operations, use the dedicated bulk-subscriptions and bulk-subscription-updates endpoints (which support PATCH/PUT semantics and async job status polling via a subscription-updates resource) rather than looping single-record calls against the 180/min ceiling — a 50K-subscriber sync via individual creates would take over four and a half hours minimum against that cap; the bulk endpoint sidesteps this.

Pagination on read endpoints (subscriptions, segments, etc.) is cursor-based per beehiiv's docs, which is the right call for a growing subscriber base — offset pagination on a list mutating in real time would risk skipped or duplicated records mid-sync.

> **[📸 SCREENSHOT PLACEHOLDER]** — a webhook payload example from beehiiv's Post Sent or Subscription Created event
>
> _Replace this callout with the real screenshot before publishing._

## Webhooks as the sync backbone

If you're architecting anything that needs beehiiv state mirrored elsewhere in near-real time, don't poll. beehiiv fires webhooks for:

- **Subscription lifecycle** — created, confirmed, deleted, upgraded, downgraded, paused, resumed, tier added/paused/resumed/deleted
- **Post lifecycle** — sent, updated, scheduled
- **Beta events** — newsletter-list subscription state, survey response submission

Design your integration to treat these as the source of truth and use the REST API for backfill/reconciliation rather than as your primary read path — this keeps you inside the rate limit envelope for anything beyond small lists.

## What a migration script actually needs to handle

If you're building your own migration tooling rather than using beehiiv's built-in Substack importer, or migrating *away* from beehiiv, plan for these concrete failure modes, verified against beehiiv's own migration documentation:

- **Content losses on import**:
  - Videos, podcasts, photo galleries, comments, embeds, and category taxonomies do not carry over from Substack.
  - Code blocks land as plain text — if your source content has meaningful code blocks, you need a post-processing pass to re-wrap them as HTML snippets.
- **Paywall state is destroyed and must be rebuilt**:
  - Imported paid posts land fully gated with no free-preview boundary and generic "Subscribe to Default" copy.
  - Any content-truncation logic you had on the source platform needs to be reimplemented from scratch in beehiiv's paywall block.
- **Paid billing migration is a live two-party Stripe operation, not a data export**:
  - Requires copying Stripe customer records account-to-account, generating a scoped restricted API key on the source Stripe account, and manually mapping every price/tier combination — including legacy and localized pricing.
  - Currency mismatches (e.g., a EUR-denominated subscriber under a USD base price) fail to migrate at all.
  - Any script here needs a dry-run/preview mode (beehiiv's own tool generates a downloadable CSV preview before committing).
  - Build in an explicit safeguard against double-billing: the source platform's billing must be paused or canceled post-migration, and that's a manual step beehiiv does not automate for you.
- **Outbound data portability, if you're leaving beehiiv**, is genuinely first-class by SaaS newsletter standards:
  - Full post-content export and both "quick" and "full" subscriber CSV exports (the full export includes custom fields and engagement stats) are self-serve from Settings, generated async with an emailed download link valid for 24 hours.
  - There's no bulk post-content API export equivalent to the Substack zip — the UI-triggered CSV/export job is the documented path.
  - That's fine for a one-time full migration, but not something you'd want to build a recurring backup job against without checking whether the link-expiry and async-job pattern holds up under automation. I'd treat it as a manual quarterly export rather than a cron target unless you verify the export-trigger endpoints are exposed in the API — as of this writing, they don't appear to be in the public API reference.

## Custom HTML and page-level constraints

Inside post content:

- Standard HTML passes through.
- `<script>`/`<style>` are stripped server-side.
- Invalid markup silently fails to save.
- Email-client rendering differences apply on top — `<iframe>`, `<audio>`, `<video>`, `<source>`, `<track>` render on the web version of a post but are auto-hidden in the emailed MIME version, which any integration generating post HTML programmatically needs to account for. Don't rely on embeds for anything functionally required by email readers.

The separate Website Builder product (for the public archive/site, distinct from post content) lacks custom CSS and a free-form canvas; full custom HTML blocks at the site level are beta-gated to Max/Enterprise. If your integration's goal is a fully custom public-facing site skinned on top of beehiiv content, the more reliable path is pulling content via the `posts` API into your own externally-hosted frontend rather than fighting the Website Builder's constraints.

## Data governance: how beehiiv actually handles your data, mechanically

Treat this as a system-design input, not a compliance footnote — the entity boundaries here determine what you're actually liable for. I read beehiiv's privacy policy directly (last modified April 30, 2026) and its DPA rather than relying on the "we take security seriously" marketing framing:

| Question | The actual mechanics |
|---|---|
| Controller/processor split | For your subscribers' personal data, beehiiv is a GDPR/CCPA "processor" — you're the "controller," owning the legal basis and consent chain, while beehiiv processes on your instruction under a DPA incorporating Standard Contractual Clauses plus a UK SCC Addendum for cross-border transfer. For your own account activity, billing, and support interactions, beehiiv is the controller, processing under its own stated purposes including targeted advertising and analytics. |
| CCPA "sale"/"share" disclosures | beehiiv discloses identifiers and internet/network-activity data to "advertising partners and analytics providers" — this is a "sale" or "share" under CCPA's broad definition regardless of whether cash changes hands. Opt-out is via direct email request or by honoring the Global Privacy Control (GPC) signal, which beehiiv states it complies with at the browser level. |
| Programmatic erasure | The OAuth scope list includes `data_deletion:read/write` — a real API surface for GDPR/CCPA right-to-erasure requests. If you're operating at any meaningful EU/UK subscriber volume, wire this into your existing webhook/API sync pipeline rather than routing erasure requests through beehiiv's support inbox by hand; it's the difference between a compliance process that scales and one that doesn't. |
| Retention and backups | No fixed retention schedule is published — beehiiv states data is retained "until we determine we no longer need it," with backups retained longer than primary records. If your own privacy policy commits subscribers to a specific retention window, you cannot inherit that guarantee from beehiiv's policy; you'd need to build your own deletion verification against the API rather than assume propagation timing. |
| Security posture | SOC 2 Type 1 as of October 7, 2025 — attests to the design of security controls at a point in time, not to GDPR/CCPA compliance itself and not equivalent to a Type 2 report (which would attest to operating effectiveness over a period). Treat it as one data point in a vendor security review, not a substitute for one. |
| Account/publication deletion | Irreversible per beehiiv's own support documentation — deleting a publication removes subscribers, segments, and associated data with no soft-delete or recovery window. There's no API-exposed "undo" to script against; any backup strategy has to live entirely on your side. |
| Change-of-control exposure | The privacy policy's disclosure clause covers transfer "to a buyer or other successor" in a merger, divestiture, restructuring, or bankruptcy — standard SaaS boilerplate, but not hypothetical here: roughly $50M raised, a Series B led by NEA, and a ~$225M reported valuation as of 2026 put beehiiv squarely in acquisition-or-down-round territory over a multi-year horizon. Design accordingly — don't build anything load-bearing that assumes its current ownership, pricing, or API is permanent. |

The architectural takeaway: beehiiv's compliance tooling (DPA with SCCs, a genuine deletion-request API scope, SOC 2 Type 1) is more substantial than most vendors at this size, which is a legitimate point in its favor as infrastructure to build against. But none of that changes the fact that your subscriber relationship is a transferable asset under a contract you didn't write the terms of. The mitigation isn't distrust — it's the same discipline you'd apply to any vendor dependency: scoped API keys, a continuously-running export/webhook log to your own storage, and no single point of irreversible reliance on beehiiv's current form.

## Managed cloud vs. renting your own server: what leaving beehiiv actually means

If you're deciding where the infrastructure boundary sits — stay fully on beehiiv, self-host the alternative, or run a managed-but-open stack that treats beehiiv as one component — here's the tradeoff surface in full:

| | Staying on beehiiv (fully managed, closed) | Self-hosted (e.g. Ghost on a rented VPS — Hetzner) | Managed-but-open (e.g. custom app on Vercel + Supabase, scripted against beehiiv's API) |
|---|---|---|---|
| Who patches security updates | beehiiv entirely — zero visibility or control on your end | You — OS, runtime, database, and application-layer patching are all your job | The platform patches the managed runtime/database; you own your application dependencies |
| Who's on call if it goes down | beehiiv's infra team, against their own SLA/status page, opaque to you | You, or whoever you've hired — no vendor SLA on a rented box | The platform's infra team owns uptime for the managed layer; your own code's failure modes are yours |
| Cost predictability | Fixed, subscriber-tiered — easy to forecast, but priced by beehiiv unilaterally | Fixed monthly compute cost, with your engineering time as the real variable cost | Usage-based — cheap at low scale, requires active monitoring as usage grows |
| Data portability | Moderate — CSV/API export exists, but you operate inside beehiiv's schema and rate limits until you extract | Total — plain server, plain database, moves anywhere with a `pg_dump` | Good — you own the Postgres instance outright, though still inside that platform's deploy/runtime conventions |
| Recovery time if the vendor disappears | Bounded by your own export cadence — if you're not scheduling exports, your recovery point is however old your last manual export is | Immediate — the data already lives on infrastructure you control | Immediate for your own data; bounded by export cadence for anything still sourced from beehiiv's API |
| Technical skill required | None — no server, no ops, no code | High — real systems administration: patching cadence, backup verification, monitoring, incident response | Moderate — CLI comfort and deploy config, no ops burden for infrastructure itself |

The concrete setup for the self-hosted route is in my Hetzner self-hosted Postgres guide; the managed-but-open route is in my Vercel + Supabase deploy guide. If the actual goal is migrating off beehiiv rather than building alongside it, my separate migration guide covers the API-driven migration script requirements, the Stripe-to-Stripe billing transfer, and the specific content losses to account for.

For anything treating beehiiv as a long-term architectural dependency, the managed-but-open model is the sound default: it gets you out from under beehiiv's UI and Website Builder constraints without taking on full infrastructure ownership. Full self-hosting is justified specifically when you need guarantees beehiiv's API can't give you — data residency requirements beyond what its DPA covers, latency/performance control, or a genuine need to eliminate vendor dependency entirely, not as a default posture.

## Who should actually stay on beehiiv

Migrating off working infrastructure has a real opportunity cost, and it's worth being honest about when that cost isn't justified:

- **The integration you've already built captures most of the available value.** If you're running webhook-driven sync into your own storage, using scoped API keys per function, and treating beehiiv purely as the send/subscription layer behind your own frontend, you've already achieved the practical outcome a full migration would buy you — the switching cost left on the table is real but marginal.
- **The engineering cost of migration exceeds the risk being mitigated.** A full migration means: a Stripe-to-Stripe billing transfer with a double-billing safeguard, a content re-import with manual paywall reconstruction, and a deliverability warm-up period on a new sending domain. At a few thousand subscribers or below, that's real engineering time against a risk (acquisition, pricing change) that hasn't materialized yet and may not for years.
- **You've priced in the acquisition risk and it's acceptable.** Given beehiiv's actual funding profile — Series B, NEA-led, ~$225M valuation, ~$30M ARR as of 2026 — an acquisition is plausible but not imminent, and its own contract terms (data transfers to a successor, not deletion) mean the worst realistic outcome is a new owner with different priorities, not sudden data loss. If your mitigation is already a scheduled, automated export/webhook log to your own storage, you've converted an unbounded risk into a bounded one, which is often sufficient.
- **You don't have engineering time allocated to infrastructure migration right now.** This is a legitimate constraint, not a failure of diligence. A read-only API key logging subscriptions and posts to your own storage on a schedule costs near-zero ongoing engineering time and converts "beehiiv disappears" from a rebuild into a restore.

Revisit the calculus when subscriber count, revenue, or API/architectural constraints change enough that the switching cost stops dominating the decision — not on a fixed schedule, but when the underlying numbers actually move.

## My verdict

> **💡 Tip — Where I land**
>
> As infrastructure to build against, beehiiv is the strongest of the hosted newsletter platforms I've evaluated — real scoped OAuth, webhooks that actually cover the lifecycle events you'd want, sane rate-limit documentation, and bulk endpoints that show someone thought about integrators rather than bolting on an API as an afterthought. It is still fundamentally a closed, hosted system: no self-hosting, no direct database access, and your paid-subscriber billing relationship lives inside a beehiiv-managed Stripe connection that takes real engineering effort to extract. If you're building anything that depends on beehiiv long-term, keep the export/webhook pipeline live continuously rather than treating data portability as a one-time insurance policy — a scoped read-only API key logging subscriptions and posts to your own storage on a schedule costs you almost nothing and means a future migration is a diff, not a full rebuild.

## Sources
- [beehiiv Pricing](https://www.beehiiv.com/pricing)
- [Plan types and subscriber plan tier pricing — beehiiv Help](https://www.beehiiv.com/support/article/23874462928663-plan-types-and-subscriber-plan-tier-pricing)
- [beehiiv Developer Documentation: Getting Started](https://developers.beehiiv.com/welcome/getting-started)
- [beehiiv API Rate Limiting](https://developers.beehiiv.com/welcome/rate-limiting)
- [beehiiv API Reference: Bulk Subscriptions](https://developers.beehiiv.com/api-reference/bulk-subscriptions/create)
- [beehiiv API Reference: Subscriptions](https://developers.beehiiv.com/api-reference/subscriptions/index)
- [How to migrate from Substack to beehiiv — beehiiv Help](https://www.beehiiv.com/support/article/14966988360215-how-to-migrate-from-substack-to-beehiiv)
- [Exporting post content or subscriber data from beehiiv](https://www.beehiiv.com/support/article/12258595483543-exporting-post-content-or-subscriber-data-from-beehiiv)
- [Using HTML in beehiiv posts — beehiiv Help](https://www.beehiiv.com/support/article/4413248700439-using-html-in-beehiiv-posts)
- [beehiiv Privacy Policy (last modified April 30, 2026)](https://www.beehiiv.com/privacy)
- [beehiiv Customer Data Protection Addendum](https://www.beehiiv.com/dpa)
- [beehiiv Trust Center (SOC 2 Type 1)](https://security.beehiiv.com/)
- [How to delete your workspace or a publication — beehiiv Help](https://www.beehiiv.com/support/article/12430837307287-how-to-delete-your-workspace-or-a-publication)
- [How to delete your beehiiv account — beehiiv Help](https://www.beehiiv.com/support/article/32057514798231-how-to-delete-your-beehiiv-account)
- [beehiiv company profile: revenue, valuation, and funding — Latka](https://getlatka.com/companies/beehiiv)
