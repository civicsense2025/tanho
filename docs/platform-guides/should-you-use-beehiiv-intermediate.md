---
title: "Should you build on beehiiv? (Intermediate Guide)"
tagline: "The Substack alternative built to compete on ownership terms — mostly"
category: own-your-stack
source_platform: beehiiv
difficulty: intermediate
level: intermediate
cost_range_usd: "0-419/mo"
tags: ["newsletter", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Familiarity with REST APIs, webhooks, and OAuth2 concepts"
  - "Comfortable reading API documentation and rate-limit terms"
  - "Basic understanding of Stripe billing and customer records"
  - "Willing to compare processor/controller responsibilities in a privacy policy"
requirements:
  - "Access to your current platform's subscriber export and Stripe dashboard"
  - "A sense of your paid vs. free subscriber counts if you monetize"
  - "Familiarity with your post content's use of embeds, code blocks, or paywalls"
  - "30-45 minutes to read the API and migration-mechanics sections"
effort_hours_min: 0.5
effort_hours_max: 1.5
---

# Should you build on beehiiv? (Intermediate Guide)

You've built a website before, you know what an API is in concept, and you're weighing beehiiv against Substack — or against just running your own stack — for a newsletter you actually intend to grow and maybe monetize. This guide is written at that level: less "what is a newsletter platform," more "what does actually integrating with or migrating off this thing involve." It's part of a broader project I'm building on owning your hosting and avoiding platform lock-in, so the migration mechanics here matter more than the marketing copy does.

## Pricing, with the caveats that matter

beehiiv's current tiers, verified directly against their pricing page:

- **Launch** — free up to 2,500 subscribers, no monetization.
- **Scale** — starts at $43/month billed annually ($49/month billed monthly) for your first tier, scaling up to $329/month near 100,000 subscribers. Unlocks paid subscriptions at a 0% platform take rate, the Ad Network, automations, and webhooks.
- **Max** — starts at $96/month annually ($109/month monthly), rising to roughly $419/month. Adds white-labeling (removes beehiiv branding), a sponsorship storefront, and up to 10 publications per workspace.
- **Enterprise** — custom-priced, required once you exceed 100,000 subscribers.

A few caveats worth flagging before you budget around these numbers:

- Both Scale and Max cap out at 100,000 subscribers collectively across all publications in a workspace — past that you need Enterprise.
- The plan tier is based on *active* subscribers specifically, not your total list size, which matters if you're carrying a lot of dead weight from an old platform.
- The 0% take rate is real and verified in beehiiv's own FAQ, but the comparison to Substack's 10% cut only bites once you're actually running paid subscriptions — Stripe's processing fee (2.9% + $0.30/transaction) applies either way and isn't beehiiv's to waive.

> **[📸 SCREENSHOT PLACEHOLDER]** — the pricing page's subscriber-count calculator
>
> _Replace this callout with the real screenshot before publishing._

## The API, in integration terms

beehiiv's developer platform at developers.beehiiv.com is a genuine REST API with real scope, not a thin wrapper. It's documented with an OpenAPI spec you can pull directly, and authentication is via API key or OAuth2 depending on use case. What it covers:

- Posts — create, update, list, delete, aggregate stats
- Subscriptions — create, update, tag, delete, lookup by email or ID
- Segments
- Custom fields
- Automations
- Webhooks
- Tiers
- Publications

A couple of practical notes on where to actually reach for these:

- If you're wiring beehiiv into an external CMS or building a custom subscribe form that writes into beehiiv's subscriber list, the `subscriptions` and `custom_fields` endpoints are what you'd use.
- If you want to publish content programmatically — say, pushing a post from your own site's CMS into beehiiv as the sending mechanism — the `posts:write` endpoint supports that, though it's for creating drafts/posts, not a raw transactional send API (that's reserved for Enterprise).

Webhooks matter here too: beehiiv fires events for post sent/updated/scheduled and subscription created/confirmed/deleted/upgraded/downgraded, which is what you'd use to keep an external system (a CRM, a paywall gate on your own site, a Slack notification) in sync in near-real time rather than polling.

One practical constraint: rate limiting is 180 requests per minute per organization, with standard `RateLimit-*` response headers and 429 errors on overage. For a typical integration syncing a few thousand subscribers or automating post publication, this is generous. If you're doing a bulk one-time sync of a large list, use the dedicated bulk-subscriptions endpoint rather than looping individual creates — it exists specifically to avoid you hammering the per-minute cap.

> **[📸 SCREENSHOT PLACEHOLDER]** — the developers.beehiiv.com API reference sidebar showing available endpoints
>
> _Replace this callout with the real screenshot before publishing._

## What a real migration involves

beehiiv has a dedicated, first-party Substack migration path, and it's worth understanding its actual mechanics rather than assuming "export CSV, import CSV" covers it. Here's how it breaks down by what you're moving:

**Content migration**:

1. If you only have free posts, paste your Substack publication URL into beehiiv's Content Import tool and it pulls everything directly — no manual export needed.
2. If you have paid/gated posts too, first export a zip file from Substack (Settings → Import/Export), then upload that zip alongside your public URL.
3. Migration typically takes 5–10 minutes.

What doesn't survive the trip:

- Videos, podcasts, photo galleries, comments, embeds, and category structures do not migrate at all.
- Code blocks come through as plain text and need to be manually rebuilt as HTML snippets.
- Paywall placement isn't preserved — every imported paid post is fully gated by default until you manually re-add a paywall block.
- Blockquotes migrate but may render with different styling.

**Free subscriber migration**: straightforward CSV export from Substack, CSV import into beehiiv, with a field-mapping step for custom data and tags.

**Paid subscriber migration is the hard part.** It requires a live Stripe-to-Stripe customer data transfer, and the steps go roughly like this:

1. Copy customer records from your Substack-connected Stripe account to a new beehiiv-connected one.
2. Create a restricted API key in Stripe scoped for beehiiv.
3. Map every Substack price tier to a corresponding beehiiv tier.
4. Manually pause or cancel billing on the Substack side afterward — skip this and subscribers get charged twice.

beehiiv's own documentation is explicit that currency must match exactly between platforms — a subscriber on a localized non-USD price won't migrate cleanly. Budget a real afternoon for this if you have any meaningful number of paid subscribers, and expect to personally verify the tier mapping before you pull the trigger, because the preview step only shows a CSV you have to review yourself.

## Custom HTML — the actual limitation

Within a post, here's what actually happens to your markup:

- Most standard HTML passes through fine.
- `<script>` and `<style>` tags are silently stripped.
- Invalid markup just won't save.
- `<iframe>`, `<audio>`, `<video>`, and similar embed-heavy tags render fine on the web version of your post but get automatically hidden in the emailed version — a real gotcha if you're relying on an embed for something functional rather than decorative.

The separate Website Builder (for your public archive site, not individual posts) is more locked down: no full custom CSS, no drag-and-drop canvas, and full custom HTML blocks for page-level customization are still gated to Max/Enterprise and marked beta as of this writing.

## Data governance: how beehiiv actually handles your data

I read beehiiv's privacy policy directly (last modified April 30, 2026) rather than relying on marketing copy, because "we take privacy seriously" pages tell you nothing. Here's the actual mechanics, in the terms that matter if you're the one accountable for your subscribers' data:

| Question | What beehiiv's policy and API actually say |
|---|---|
| Who's the "controller" of my subscriber data? | You are. For your subscribers' data, beehiiv acts as a "processor" under GDPR/CCPA — you set the purpose and legal basis for collecting it, beehiiv just handles it on your behalf. That relationship runs through beehiiv's Data Protection Addendum (DPA), which incorporates Standard Contractual Clauses and a UK SCC Addendum for EU/UK-to-US transfers. For data about *you* using the product, beehiiv itself is the controller. |
| Does beehiiv sell/share personal data with advertisers? | Yes, under CCPA's broad definition. beehiiv discloses identifiers and internet/network-activity data to "advertising partners and analytics providers" — that's a "sale" or "share" in CCPA terms, opt-outable by email request or by honoring the Global Privacy Control (GPC) browser signal, which beehiiv states it complies with. |
| Can I handle subscriber deletion requests programmatically? | Yes — beehiiv's API exposes a `data_deletion:read/write` OAuth scope. If you're already scripting against the API for subscription sync, it's worth wiring GDPR/CCPA erasure requests into that same pipeline instead of filing them through beehiiv's support inbox by hand. |
| What's the retention policy? | No fixed schedule. beehiiv states it retains personal data "until we determine we no longer need it," and separately retains backups longer than the original records — worth knowing if your own privacy policy promises subscribers a specific retention window. |
| What happens on publication/workspace deletion? | Irreversible, per beehiiv's own support documentation. Deleting a publication removes its subscribers, segments, and associated data with no recovery path — there's no soft-delete state to script a rollback against. |
| What happens if beehiiv is acquired? | The privacy policy already covers this: data transfers "to a buyer or other successor" in a merger, divestiture, or bankruptcy. This isn't boilerplate to skim past — beehiiv has raised roughly $50M (Series B led by NEA) at a reported ~$225M valuation as of 2026, and an acquisition is a live scenario over a multi-year time horizon, not an edge case. |

The technical takeaway: beehiiv's compliance posture (DPA with SCCs, SOC 2 Type 1 as of October 2025, a real deletion-request API scope) is more mature than most tools this size — but that's an argument for treating beehiiv as competently-run infrastructure, not for treating it as permanent. The acquisition clause in its own contract is the same clause every SaaS vendor has, and it means exactly what it says: your subscriber data is a transferable business asset if beehiiv's ownership changes.

## Managed cloud vs. renting your own server: what leaving beehiiv actually means

If you're weighing whether to keep building against beehiiv or move the underlying infrastructure yourself, the real decision isn't "beehiiv vs. not-beehiiv" — it's which of three operating models you want to be responsible for:

| | Staying on beehiiv (fully managed) | Self-hosted (e.g. Ghost on a rented VPS) | Managed-but-open (e.g. your own app on Vercel + Supabase, scripted against beehiiv's API) |
|---|---|---|---|
| Who patches security updates | beehiiv, entirely — not exposed to you at all | You — OS patches, Ghost/Node updates, database patches, all manual or self-scripted | The platform patches the runtime and managed database; you patch your own app dependencies |
| Who's on call if it goes down | beehiiv's support/status page | You, or whoever you hire — there's no vendor SLA on a box you rent | The platform's infrastructure team handles outages; your application logic bugs are yours |
| Cost predictability | Fixed subscriber-tiered pricing, easy to forecast | Flat monthly server cost, but your time is the hidden variable when something breaks | Usage-based — cheap at low traffic, but scales with usage in ways that need monitoring |
| Data portability | Moderate — CSV/API export exists, but you're working inside beehiiv's schema until you pull it out | Total — it's your database on your server, move it anywhere | Good — your own Postgres instance, though still inside that platform's deploy/runtime model |
| Technical skill required | Low — no server, no ops, no code required | High — real systems administration: firewalls, backups, monitoring, uptime | Moderate — comfortable with a CLI and basic deploy config, but no ops burden |

I cover the actual setup for the self-hosted route in my Hetzner self-hosted Postgres guide, and the managed-but-open route in my Vercel + Supabase deploy guide, if you want the concrete steps for either. If your endgame is actually moving *off* beehiiv rather than just building alongside it, my separate migration guide covers the content, subscriber, and Stripe-transfer mechanics in detail — including where beehiiv's own tooling stops and a custom script has to pick up the slack.

For most people integrating with beehiiv today, a managed-but-open stack is the pragmatic middle path: you get real independence from beehiiv's UI and pricing tiers without taking on full systems-administration overhead. Full self-hosting makes sense once you specifically want that control, or once beehiiv's constraints (the Website Builder's lack of custom CSS, the 100K-subscriber tier ceiling) start actively blocking something you're trying to build.

## Who should actually stay on beehiiv

Not every integration is worth building, and not every migration is worth doing. Some honest reasons to keep beehiiv as your platform of record right now:

- **You've already captured the ownership-friendly parts of the trade.** If you moved here specifically to get 0% subscription fees and an actual API instead of Substack's 10% cut and closed ecosystem, you've already made the meaningful ownership decision. Building a parallel self-hosted stack on top of that gains you marginal control at real engineering cost.
- **Your list and revenue don't yet justify the migration engineering time.** A Stripe-to-Stripe paid-subscriber transfer, content re-import, and deliverability warm-up period are real work. If you're under a few thousand subscribers or minimal paid revenue, that work costs more in hours than staying on beehiiv costs you in platform risk.
- **You're already scripting against beehiiv's API as a component, not fighting it as a cage.** If you've built webhook-driven sync into your own systems and treat beehiiv purely as the sending/subscription layer, you've already achieved most of the practical benefit of "not being locked in" — the switching cost is API calls, not a data-format war.
- **You don't have the engineering time or budget right now.** Nothing here is free to execute. If the honest answer is "I don't have a sprint to spend on this," a scheduled export job (subscriptions and posts logged to your own storage on a cron) gets you most of the insurance value of a full migration at a fraction of the effort.

Revisit this when your subscriber count, revenue, or technical needs change enough that the switching cost stops being the dominant factor in the decision.

## My verdict

> **💡 Tip — Where I land**
>
> Of the hosted newsletter platforms, beehiiv is the one I'd actually integrate with — the API surface is broad enough for real automation, webhooks mean you're not stuck polling, and the migration tooling, while not painless, is genuinely built rather than an afterthought. The catch is that "built a migration tool" also means beehiiv knows exactly how sticky paid subscriber data can be, and that Stripe-transfer dance is deliberately not one-click. Treat beehiiv as a good hosted layer to build *against*, not a permanent home — keep your content exports current and your Stripe relationship (once migrated) understood well enough that you could move it again.

## Sources
- [beehiiv Pricing](https://www.beehiiv.com/pricing)
- [Plan types and subscriber plan tier pricing — beehiiv Help](https://www.beehiiv.com/support/article/23874462928663-plan-types-and-subscriber-plan-tier-pricing)
- [beehiiv Developer Documentation: Getting Started](https://developers.beehiiv.com/welcome/getting-started)
- [beehiiv API Rate Limiting](https://developers.beehiiv.com/welcome/rate-limiting)
- [How to migrate from Substack to beehiiv — beehiiv Help](https://www.beehiiv.com/support/article/14966988360215-how-to-migrate-from-substack-to-beehiiv)
- [Using HTML in beehiiv posts — beehiiv Help](https://www.beehiiv.com/support/article/4413248700439-using-html-in-beehiiv-posts)
- [Exporting post content or subscriber data from beehiiv](https://www.beehiiv.com/support/article/12258595483543-exporting-post-content-or-subscriber-data-from-beehiiv)
- [Revenue Rulebreaker: beehiiv's CEO backs a MAGA candidate but don't pack your bags just yet (May 13, 2026)](https://www.revenuerulebreaker.com/beehiivs-ceo-backs-a-maga-candidate-but-dont-pack-your-bags-just-yet/)
- [beehiiv Privacy Policy (last modified April 30, 2026)](https://www.beehiiv.com/privacy)
- [beehiiv Customer Data Protection Addendum](https://www.beehiiv.com/dpa)
- [beehiiv Trust Center (SOC 2 Type 1)](https://security.beehiiv.com/)
- [How to delete your workspace or a publication — beehiiv Help](https://www.beehiiv.com/support/article/12430837307287-how-to-delete-your-workspace-or-a-publication)
- [How to delete your beehiiv account — beehiiv Help](https://www.beehiiv.com/support/article/32057514798231-how-to-delete-your-beehiiv-account)
- [beehiiv company profile: revenue, valuation, and funding — Latka](https://getlatka.com/companies/beehiiv)
