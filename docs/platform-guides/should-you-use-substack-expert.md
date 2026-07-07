---
title: "Should you build on Substack? (Expert guide)"
tagline: "Free to start, a real 10% cut, and almost nothing you can customize"
category: own-your-stack
source_platform: substack
level: expert
difficulty: expert
cost_range_usd: "0-0/mo"
tags: ["newsletter", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can evaluate an API surface (or the lack of one) for integration feasibility"
  - "Comfortable scoping a migration script covering HTML/CSV parsing and re-hosting"
  - "Understands DNS, SPF/DKIM/DMARC, and email sender-reputation warm-up"
  - "Can read a GDPR controller/processor distinction and M&A data-transfer clause critically"
requirements:
  - "Access to your current subscriber engagement/activity data, if planning a migration"
  - "A copy of Substack's Terms of Use and privacy policy for compliance review"
  - "45-90 minutes to read the technical and governance sections in full"
effort_hours_min: 1
effort_hours_max: 3
---

# Should you build on Substack? (Expert guide)

For a technical publisher evaluating Substack, the interesting questions aren't "is it easy" (it is) or "what's the fee" (10% + Stripe's cut) — they're systems questions: what's the integration surface, what does a real export-and-rebuild migration script need to handle, and what happens to deliverability when you move a list off Substack's sending infrastructure. This guide assumes you're deciding whether to build now and migrate later, versus self-hosting from day one.

Context: this sits in a series about avoiding platform lock-in in favor of infrastructure you actually control. Substack is a useful case study because its lock-in isn't primarily technical (the export format is genuinely usable) — it's economic and reputational, which changes what "migration risk" means for you as an engineer.

## API surface: there isn't one

Substack has no public CMS/content API. What Substack calls the "Developer API" is narrowly scoped: it returns public profile data for a Substack creator, keyed to a verified LinkedIn handle they've linked to their account. It is not a content-management endpoint, not a publishing endpoint, and not a subscriber-data endpoint. Rate limits and quota terms apply at Substack's sole discretion, and profile lookups aren't guaranteed to return data even for legitimate accounts — Substack applies undisclosed authenticity thresholds to filter results.

Practically, this means:

- **No programmatic publishing.** You cannot post content to Substack via API. Anything you've seen claiming otherwise — scripts that "automate Notes" or "import subscribers via API" — is reverse-engineered against Substack's internal web app endpoints by inspecting network requests in DevTools, not a supported integration. Substack can break these without notice and has no obligation not to.
- **No webhook system** for new-subscriber or new-post events that you could wire into your own systems (CRM, analytics pipeline, etc.).
- **No read API for your own subscriber data** beyond what's in the manual CSV export. If you wanted a live sync between Substack subscriber state and an external database, there's no supported way to build it.

If your evaluation criteria include "can this integrate with my existing stack," the answer for Substack is functionally no, beyond email-based automations (Zapier-style tools that watch for new emails, RSS feed parsing of your own public posts, etc.).

## What the export actually contains, structurally

Requesting an export from Settings → Exports produces a zip with (per Substack's own documentation and confirmed by third-party migration guides):

- `subscribers.csv` — full subscriber list. You choose "all columns" (includes engagement metadata like last-email-open timestamp and per-post view counts) or "visible columns only." For a real migration, pull all columns — the engagement data is what protects your sender reputation during cutover (see deliverability section below).
- A posts-by-title CSV with metadata.
- One HTML file per post, with images inlined or referenced — not markdown, not a structured JSON export. If you're scripting a rebuild into a different CMS, budget time for an HTML-to-your-format conversion pass (Ghost's and beehiiv's importers already do this for you if you're targeting either; anything else, you're writing the parser).
- Supplementary CSVs for additional account-level data.

A migration script targeting a non-Ghost, non-beehiiv destination needs to handle at minimum:

1. **HTML sanitization** — Substack's editor emits some platform-specific markup and embed wrappers that won't map cleanly to another CMS.
2. **Paid-post gating metadata** — this isn't preserved in a structured way; you'll need to reconstruct your paywall logic manually against the posts-by-title CSV.
3. **Image re-hosting** — Substack-hosted image URLs will eventually 404 if you don't re-upload them to your new host.

> **[📸 SCREENSHOT PLACEHOLDER]** — the raw zip file structure after extraction, showing the CSV/HTML layout

## Deliverability and DNS mechanics of moving the list

Three separate technical concerns, all real:

- **DNS/domain cutover.** If you're running a Substack custom domain, note Substack requires the publication to be served from a subdomain (typically `www`), with a CNAME pointed at Substack's infrastructure, and root-domain requests handled via 301 redirect to that subdomain. Substack states its own side of a new custom-domain configuration can take up to 36 hours to propagate. On migration, you're doing the reverse: repointing that CNAME (or switching to A/ALIAS records) to your new host, which introduces its own propagation window — budget a low-traffic window and expect stale DNS caches for up to 48 hours depending on registrar TTLs. If you're on Cloudflare as registrar/DNS, note Substack explicitly requires "DNS only" (grey-clouded) mode on the CNAME record, not proxied — the same constraint applies in reverse if your new destination needs direct connection verification.
- **Email deliverability.** This is the higher-risk item and gets underweighted by technical migrators. Your Substack-era sending reputation doesn't transfer — a new ESP or self-hosted mail setup (Ghost's built-in Mailgun integration, a custom SES/Postmark setup, whatever you choose) starts with no sending history on your new domain or IP range. beehiiv's own migration documentation is explicit about the mitigation: exclude subscribers with zero engagement (Substack's own "Activity Rating" column, included in the all-columns export, flags these) from your first sends, and throttle initial sending volume for 2–4 weeks rather than blasting your full list on day one. If you're self-hosting mail (Ghost + your own transactional provider), you additionally need SPF/DKIM/DMARC configured and warmed on the new sending domain before cutover — treat this like any new domain's cold-send reputation problem, because that's exactly what it is.
- **Paid subscriptions don't migrate as live billing relationships.** Substack's Stripe integration is Substack's Stripe account, not yours. Moving to any other platform means your paying subscribers need to be re-invited to create a new payment method on the new platform's billing system. This is the actual reason migrations are staged around moderation/cost decisions rather than executed casually — the revenue-continuity risk during re-subscription is the dominant cost, not the technical export/import work.

## The fee model and why it doesn't get renegotiated

Here's the full cost stack, from a systems-cost perspective:

- **Substack's cut** — 10% of gross subscription revenue, flat.
- **Stripe's processing fee** — ~2.9% + $0.30 per transaction.
- **Stripe's recurring-billing surcharge** — an additional 0.7%, introduced for subscriptions in mid-2024.
- **Combined real-world cost** — roughly 13–16% of gross, depending on price point.
- **No volume discount** — there is no published tier for individual creators.
- **No legacy workaround** — the old "Substack Pro" cash-advance arrangement is closed to new entrants.
- **No negotiating leverage below Enterprise scale** — "Enterprise" terms are undisclosed and sales-negotiated.

This fee is a permanent, non-negotiable tax on revenue with none of the usual scale economics you'd expect from infrastructure vendors as usage grows — it's a revenue share, not a usage-based hosting bill.

## Moderation history as an operational risk factor, not just an ethics question

For a technical publisher, the moderation controversy matters less as a values question and more as a platform-stability signal. Here's the timeline:

1. **November 2023** — The Atlantic's investigation identified 16+ Nazi-symbol newsletters and dozens of far-right extremist newsletters actively monetizing on Substack's payment infrastructure.
2. **Following that** — Substack's leadership initially declined to change policy.
3. **December 2023** — 247 writers signed an open letter.
4. **January 2024** — Substack removed five accounts without a policy change; a follow-up count found roughly 75 similar newsletters still active. Casey Newton's Platformer executed a full migration to self-hosted Ghost that same month over this issue specifically, and documented that the move also eliminated the 10% fee entirely — saving what he described as tens of thousands of dollars annually once paid subscribers re-upped on the new platform.
5. **October 2025** — Anne Helen Petersen, Lyz Lenz, and Virginia Sole-Smith moved to Patreon, citing moderation policy alongside fee structure, email deliverability complaints, and thin platform support.
6. **Q1 2025** — roughly 1,000 creators moved from Substack to beehiiv.

The operational lesson: policy-driven migration waves are a recurring, not one-time, feature of this platform, and each wave has produced better third-party tooling (import scripts, migration guides) as a side effect — worth checking current tooling maturity before you build your own from scratch.

## Data governance: how Substack actually handles your data

For a technical evaluation, the governance question isn't "is my data safe" in the abstract — it's "what's the actual data-flow graph, and what's my legal exposure as controller vs. processor." Substack's privacy policy (last updated May 2026) is specific enough to answer both.

**Disclosed sharing surface**, per the policy's "How will Substack share the Personal Information it receives?" section:

- **Corporate affiliates/subsidiaries** — undefined scope.
- **Creators** — subscriber name + email, passed to you as the operator of the relationship; this is the mechanism by which your subscriber CSV export exists at all.
- **Service providers** — Stripe (payments), plus unnamed vendors across hosting, security, "generative AI services," CDN, customer support, and analytics. No subprocessor list is published (contrast with SaaS vendors that maintain a public subprocessor registry as an Article 28 hygiene practice).
- **Third-party integrations** — data handed to a linked service (e.g., YouTube) is governed by that service's own policy the moment it leaves Substack's boundary, not Substack's.
- **Other users** — public profile/reading-activity data, contingent on account visibility settings.
- **Prospective buyers/sellers** — a standing M&A clause, detailed below.
- **Government/law enforcement**, and (per the May 2026 revision) **child-safety industry consortia** for CSAM-detection account-identifier sharing.

On the CCPA-defined "cross-context behavioral advertising" carve-out: Substack's policy states it does not sell personal information and does not share for that specific purpose. That's a narrower commitment than "no advertising-adjacent data sharing" — the site's own cookie disclosure lists first- and third-party analytics/attribution cookies (Google-family, Meta-family, a session-replay vendor) active by default, which is standard SaaS instrumentation but worth distinguishing from the no-ad-sharing claim, since they're not the same guarantee.

**GDPR mechanism, structurally**: Substack self-certifies under the EU-U.S. Data Privacy Framework (plus UK and Swiss extensions) for the transfer leg, and layers Standard Contractual Clauses into publisher agreements as the fallback/complementary mechanism — the standard two-track approach for a US processor handling EU personal data post-Schrems II. It has also appointed EU and UK Article 27 representatives (Bird & Bird) for regulatory-contact purposes, which is a real compliance signal, not just a policy statement.

The controller/processor split is the part worth internalizing precisely: Substack's privacy policy explicitly scopes itself to Substack-as-controller processing (platform-level data — account, billing, analytics). It states outright that the policy "does not apply to any processing of Personal Information by Substack as a data processor on behalf of a Creator" — meaning for your subscriber list specifically, *you* are the GDPR controller, and Substack acts as your processor. That's not a technicality: a GDPR data-subject access or erasure request about your newsletter operations is legally yours to fulfill, with Substack's role limited to passing along the notice — Substack's policy says as much directly ("Substack's obligation as a data processor is to provide any privacy notice it receives to the appropriate data controller").

**Deletion mechanics**: publication/account deletion is permanent erasure with two documented exceptions — anonymized analytics, and whatever minimum retention Substack's own legal/regulatory/security obligations require. No restore path. This is a one-way operation; treat export as the only durable backup, because it is.

**M&A/shutdown clause, verbatim in effect**: the policy's "Prospective sellers or buyers" provision permits transfer of customer information "in connection with the sale or merger of our business or assets," and separately "if we go out of business, enter bankruptcy, or go through some other change of control." Read alongside the Terms of Use's termination clause (Substack may terminate or suspend any account "for any reason at [its] discretion," with a best-effort, not guaranteed, advance-notice commitment), the actual risk model is: your subscriber relationship is contractually revocable, and your subscriber data is contractually transferable to an acquirer under that acquirer's privacy terms, not the terms you originally agreed to. This is standard boilerplate for a VC-backed platform, not a Substack-specific defect — but "standard" and "irrelevant to your risk model" aren't the same thing, especially if your business depends on that subscriber relationship persisting under known terms.

| Governance vector | Substack's documented position |
|---|---|
| Sale of personal data | Excluded by policy |
| Cross-context behavioral ad-sharing | Excluded by policy; standard analytics/attribution cookies still present |
| GDPR transfer mechanism | EU-U.S. DPF + SCCs; Article 27 reps appointed |
| Controller/processor split | You're the controller of your subscriber list; Substack is your processor |
| Deletion | Permanent, two narrow retention exceptions, no restore |
| M&A/shutdown | Explicit transfer-on-sale/bankruptcy clause; account termination at Substack's sole discretion |

The comparison worth making isn't "Substack vs. an idealized privacy-perfect platform" — every VC-funded SaaS vendor in this category (beehiiv, Ghost(Pro)) carries structurally similar processor/controller and M&A clauses. The comparison that actually changes your risk model is managed-vendor governance (your data's fate tied to a company's cap table and acquisition outcome) versus self-hosted governance (there's no entity to be acquired — the risk surface moves entirely into your own operational and backup discipline instead).

## Managed cloud vs. renting your own server: what leaving Substack actually means

Three distinct operating models, not two — worth being precise about which one "leaving Substack" actually points you toward, since the engineering tradeoffs are materially different across all three.

| | Substack (fully managed) | Self-hosted Ghost on a rented VPS | Vercel + Supabase (managed, open stack) |
|---|---|---|---|
| Security patching | Entirely Substack's | Yours — OS, DB engine, every dependency, on your own cadence | Platform vendors' |
| Incident response | Substack's ops/on-call | You are the on-call rotation, full stop | Vendor SLA/status page for infra; you own app-level incidents |
| Cost predictability | Free floor; 10%+ of gross revenue permanently, no volume discount, no ceiling | Flat compute rent (~$4-15/mo), but every hour of patch/backup/monitoring labor is uncosted in that number | Cheap/free floor; usage-based ceiling that scales with traffic in ways you don't fully control |
| Data portability | Vendor-format export (CSV/HTML) — real, but you're exporting *out of* a proprietary system, not operating a live copy | Total — it's your Postgres/MySQL instance; no export step exists because there's nothing to export *from* | High — the data already lives in standard Postgres; migration off Supabase specifically is a `pg_dump`, not a vendor-specific tool |
| Technical skill required | None | High — SSH, firewall rules, WAL-aware backup strategy, patch management | Moderate — environment config and API surface, not systems administration |

The Ghost-on-VPS and Vercel+Supabase columns aren't actually competing for the same workload — Ghost-on-VPS is a full self-hosted CMS/newsletter stack, while Vercel+Supabase is infrastructure you build a custom app on top of (relevant if you're going the bespoke-app migration path rather than a drop-in CMS replacement). Cross-reference my `deploy-on-hetzner-self-hosted-postgres` guides and `deploy-on-vercel-and-supabase` guides for the actual deployment mechanics behind each column, and my `migrate-from-substack` guides for the Substack-specific export/import engineering — none of that is re-derived here.

The honest calibration at this skill level: if you already run production infrastructure professionally, defaulting to managed hosting here is often just inertia — you're paying a recurring platform premium not to use skills you already have. But reaching for a bare VPS purely to prove you can, without monitoring/alerting/backup discipline already in place as muscle memory, is volunteering for outages you won't hear about until a subscriber emails you.

## Who should actually stay on Substack

Technical capability isn't the only variable, and it's worth being explicit about the cases where staying is the correct call even for someone who could self-host tomorrow:

- **The migration cost genuinely exceeds the governance/fee cost at your current scale.** At a few hundred subscribers and no paid revenue, the 10%+ fee is a rounding error and the acquisition/processor risk is theoretical. Spending engineering hours on infrastructure purity here is optimizing a problem you don't have yet — the same anti-pattern as premature infrastructure investment anywhere else.
- **Substack's Notes network is a measurable, load-bearing acquisition channel for you.** If a real share of subscriber growth traces to Substack's own recommendation surface rather than your own distribution, leaving is a genuine trade against future business metrics, not just a technical migration — model that tradeoff explicitly before treating "leave" as the obviously correct engineering decision.
- **You don't have monitoring, alerting, and backup discipline already operationalized, and you're not planning to build it before cutover.** Self-hosting without that discipline in place isn't "full control" — it's unmonitored downtime with your name on the pager. If you're not ready to run that ops surface today, staying managed is the more honest engineering decision than migrating and hoping the ops maturity catches up afterward.
- **You've priced the full migration risk — deliverability warm-up, Stripe re-subscription risk, ongoing patch/ops labor — and it doesn't clear the bar against what you're actually getting from self-hosting.** Not every workload benefits from owning the infrastructure. If the honest cost-benefit says "not yet" at your current revenue and risk tolerance, that's a legitimate engineering conclusion, not a failure to commit to the project's broader thesis.

None of this contradicts the case for eventually owning your own infrastructure — it's the same argument I'd make about any migration: do it when the tradeoff clears, not on a fixed timeline dictated by principle alone.

## My verdict

> **💡 Tip — Where I land**

Substack's technical lock-in is genuinely lower than its reputation suggests — the CSV/HTML export is real, both Ghost and beehiiv have built importers against it, and DNS cutover is standard CNAME work. The actual risk surface comes down to two things:

1. **A permanent, non-negotiable 13–16% revenue tax**, with no API to build around it.
2. **Deliverability and billing-continuity risk concentrated entirely in the migration event itself**, not in ongoing operation.

If I were building for the long term, I'd treat Substack as a distribution/growth-testing channel — its Notes recommendation network has genuine acquisition value you can't replicate self-hosted — while keeping my canonical content and subscriber list exportable and my expectations calibrated to migrate before, not after, the list gets too large for the re-subscription risk to be trivial.

## Sources
- [Substack Privacy Policy](https://substack.com/privacy)
- [Substack: How does Substack comply with Data Regulations?](https://support.substack.com/hc/en-us/articles/13579258227092-How-does-Substack-comply-with-Data-Regulations)
- [Substack: How do I delete my Substack publication?](https://support.substack.com/hc/en-us/articles/360037465892-How-do-I-delete-my-Substack-publication)
- [Substack: How do I delete my Substack account?](https://support.substack.com/hc/en-us/articles/360060692511-How-do-I-delete-my-Substack-account)
- [Substack Terms of Use](https://substack.com/tos)
- [Substack CCPA Policy](https://substack.com/ccpa)
- [Substack Developer API docs](https://support.substack.com/hc/en-us/articles/45099095296916-Substack-Developer-API)
- [Substack API Terms of Service](https://substack.com/api-tos)
- [How do I export my posts](https://support.substack.com/hc/en-us/articles/360037466012-How-do-I-export-my-posts)
- [How do I export my email list on Substack](https://support.substack.com/hc/en-us/articles/6314498343700-How-do-I-export-my-email-list-on-Substack)
- [Substack: custom domain setup](https://support.substack.com/hc/en-us/articles/360051222571-How-do-I-set-up-my-custom-domain-on-Substack)
- [Substack: configure a CNAME with your registrar](https://support.substack.com/hc/en-us/articles/360051222791-How-do-I-configure-a-CNAME-with-my-registrar)
- [beehiiv: How to migrate from Substack to beehiiv](https://www.beehiiv.com/support/article/14966988360215-How-to-migrate-from-Substack-to-beehiiv)
- [Substack: How much does Substack cost?](https://support.substack.com/hc/en-us/articles/360037607131-How-much-does-Substack-cost)
- [Substack Fee Calculator, 2026](https://payoutmath.com/substack-fee-calculator/)
- [Why Platformer is leaving Substack](https://www.platformer.news/why-platformer-is-leaving-substack/)
- [TechCrunch: Substack's Nazi content policies controversy](https://techcrunch.com/2024/01/09/substack-nazi-content-policies-controversy/)
- [Georgetown Free Speech Project tracker](https://freespeechproject.georgetown.edu/tracker-entries/substack-decision-to-remove-nazi-accounts-leads-to-outcry-over-censorship/)
- [Nieman Journalism Lab: Top Substack writers depart for Patreon](https://www.niemanlab.org/2025/10/top-substack-writers-depart-for-patreon/)
