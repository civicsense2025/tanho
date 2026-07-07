---
title: "Should you build on Substack? (Intermediate guide)"
tagline: "Free to start, a real 10% cut, and almost nothing you can customize"
category: own-your-stack
source_platform: substack
level: intermediate
difficulty: intermediate
cost_range_usd: "0-0/mo"
tags: ["newsletter", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Familiarity with CMS platforms and basic domain/deployment concepts"
  - "Comfortable reading a CSV export's column structure"
  - "Understanding of DNS cutover and CNAME records"
  - "Some awareness of email deliverability basics"
requirements:
  - "A sense of your current or projected subscriber count and paid conversion rate"
  - "Awareness of whether you rely on Substack's Notes network for subscriber growth"
  - "30-45 minutes to read the fee, export, and moderation history sections"
effort_hours_min: 0.5
effort_hours_max: 1.5
---

# Should you build on Substack? (Intermediate guide)

You know your way around a CMS, you've maybe deployed a static site or configured a domain before, and you're trying to figure out whether Substack is a reasonable place to build a newsletter, or a trap you'll need to migrate out of later. Short answer: it's a fine place to start and a genuinely portable one by newsletter-platform standards, but it's built to make you dependent on Substack's ecosystem, not just its editor.

This sits inside a broader thesis I keep coming back to: minimize lock-in early, because the cost of migrating compounds with your audience size, not your technical debt. Substack is actually one of the better-behaved platforms on the "can I get my data out" axis. It's one of the worse ones on the "can I control my own product" axis. Those are different questions and worth separating.

## The fee structure, and why it doesn't shrink

Substack takes a flat 10% of gross subscription revenue. Here's the full stack of fees on top of that:

- **Substack's cut** — 10% of gross subscription revenue, flat.
- **Stripe's processing fee** — the payment processor Substack uses under the hood, at its standard ~2.9% + $0.30 per transaction.
- **Stripe's recurring-billing fee** — an additional 0.7% Stripe added in mid-2024 specifically for subscription charges.
- **Combined real cost** — independent 2026 breakdowns put the total at roughly 13–16% of gross, depending on price point.

The structural point worth internalizing:

- **This fee doesn't decrease with scale.** There's no volume discount tier published for individual writers.
- **The old advance-and-revenue-share arrangement is gone.** "Substack Pro" is closed to new entrants.
- **Enterprise pricing isn't public.** The tier that exists for large publications is sales-negotiated, with no published rate card.

If you're building toward meaningful recurring revenue, you're accepting a permanent ~13–16% tax on it with no contractual path to reducing that percentage as an individual creator.

> **[📸 SCREENSHOT PLACEHOLDER]** — Substack's fee breakdown as shown at subscription setup

## What's actually exportable

This is the part that matters most for evaluating lock-in risk, and Substack does better here than its reputation suggests. From Settings → Exports, you can request a zip export containing:

- A CSV of your full subscriber list (with an option for "all columns," which includes engagement data like last-open timestamps, versus a "visible columns only" export)
- A CSV listing all posts by title and metadata
- An HTML copy of every individual post, images included
- Supplementary CSVs with additional account data

That's a genuinely portable format. Both Ghost and beehiiv have built importers that accept this Substack export directly, and beehiiv explicitly lists Substack as one of four supported one-click migration sources alongside WordPress, Ghost, and Mailchimp.

## What a real migration involves

If you decided today to move off Substack to a self-hosted newsletter tool (Ghost is the most common destination for writers leaving on principle, since it's open-source and self-hostable), here's the realistic scope of work:

1. **Content migration** — importing the HTML post archive is mostly mechanical; expect to manually fix embeds, paid-post gating, and any Substack-specific formatting that doesn't map cleanly (footnotes, subscribe-block CTAs).
2. **Subscriber migration** — importing the subscriber CSV into your new ESP or platform. This is not merely a technical step — it's a deliverability step, which I cover below.
3. **Domain cutover** — if you're on a Substack custom domain, you'll repoint DNS to the new host. Expect a DNS propagation window: Substack itself quotes up to 36 hours just for its own custom domain configuration to finish, and a full migration adds your new host's setup time on top.
4. **Payment migration** — re-establishing paid subscriptions on the new platform. Substack subscriptions don't transfer as live Stripe subscriptions to a new vendor account; you'll typically need to re-invite paying subscribers to re-subscribe on the new platform, which is the single biggest revenue-risk step in any migration.

Casey Newton's Platformer is the reference case study here: he moved from Substack to self-hosted Ghost in January 2024, citing moderation policy as the primary driver, and stated the move would save "tens of thousands of dollars a year" in Substack's 10% cut once Platformer's paid base was re-established on the new platform.

## The moderation history, and its practical effect on writers

Here's the timeline, since it's the part that keeps resurfacing as a reason writers leave:

- **November 2023** — The Atlantic's Jonathan M. Katz published an investigation identifying more than a dozen newsletters using overt Nazi symbolism and dozens more promoting far-right extremism, all actively monetizing through Substack's paid-subscription infrastructure.
- **Shortly after** — Substack CEO Hamish McKenzie initially defended a non-interventionist moderation stance, stating the platform would not proactively remove such content beyond its baseline policies against incitement to violence.
- **December 2023** — 247 writers signed an open letter threatening to leave over the policy.
- **January 2024** — under that pressure, Substack removed five publications for direct incitement, but explicitly declined to change its underlying moderation policy. A follow-up investigation found roughly 75 similar newsletters still monetizing on the platform after the removals.
- **January 2024** — Casey Newton and Platformer left for exactly this reason, migrating to self-hosted Ghost.
- **March 2025** — sportswriter Joe Posnanski left, citing the platform's growing association with politically extreme voices.
- **Late 2025** — several prominent writers, including Anne Helen Petersen, Lyz Lenz, and Virginia Sole-Smith, moved to Patreon, citing a mix of the 10% cut, email deliverability complaints, thin customer support, and the platform's moderation reputation together.
- **Q1 2025** — separately, roughly 1,000 creators moved from Substack to beehiiv, per beehiiv's own reporting. Moderation wasn't the only driver there, but it was cited alongside fee and feature complaints.

Practically, this hasn't been a one-time event — it's an ongoing driver of departures.

> **ℹ️ Note — Discoverability is a real trade-off, not just a talking point**

Substack's "Notes" feed and recommendation network are, per the platform's own 2026 disclosures, now a bigger source of new subscriber growth for many writers than direct link-sharing or SEO. Leaving Substack means giving up that acquisition channel entirely — self-hosted tools have no equivalent built-in audience network. That's a real cost against the moderation and fee arguments for leaving, and it's why some writers who are personally uncomfortable with Substack's policies still haven't left.

## Data governance: how Substack actually handles your data

Worth reading Substack's actual privacy policy (last updated May 2026) rather than assuming, because "it's just a newsletter" undersells what's actually being collected and where it goes.

**Sharing categories, per Substack's own policy:**

- **Affiliates and corporate subsidiaries** — disclosed with no further specificity.
- **You, the creator** — subscriber name and email, passed to you so you can operate your own publication relationship.
- **Service providers** — Stripe for payments; unnamed vendors for hosting, security, "generative AI services," customer support, and analytics.
- **Third-party integrations you opt into** — e.g., if you upload video to YouTube through Substack, account identifiers and video metadata flow to Google under Google's own privacy policy, not Substack's.
- **Other users** — public profile and reading-activity data, if your settings allow it.
- **Prospective buyers or sellers of the business** — covered in a dedicated clause; see the acquisition question below.
- **Law enforcement/regulators**, on legal request.
- **Child-safety industry consortia** — a newer disclosure (added in the May 2026 update) covering CSAM-detection data sharing.

On advertising specifically: Substack's policy states it doesn't sell personal information and doesn't share data for "cross-context behavioral advertising" (the CCPA's term for third-party ad-targeting based on your activity across unrelated sites). That's a real, checkable commitment. It doesn't mean zero tracking — Substack's own cookie disclosure lists Google Analytics and Meta pixel-style cookies (`ga_family`, `_fb` family) running on its site for analytics/attribution purposes, which is standard but worth knowing if you're evaluating this against a platform with a stricter no-third-party-cookie policy.

**GDPR posture**: Substack certifies under the EU-U.S. Data Privacy Framework (and its UK/Swiss extensions) and backs cross-border transfers with Standard Contractual Clauses. It's also appointed EU and UK GDPR representatives (via Bird & Bird) for regulatory contact purposes. The structural nuance that matters for you as a publisher: Substack's privacy policy explicitly does not apply to Substack's processing of your subscriber data on your behalf — you, the creator, are the "data controller" for your own list, and Substack is acting as your "data processor." Practically, if a European subscriber raises a GDPR complaint about how their data is used in *your* newsletter operations, responsibility routes to you as controller, not to Substack.

**Publication deletion**: per Substack's help documentation, deleting a publication or account triggers permanent erasure of your data, with two carve-outs — anonymized analytics, and whatever minimum retention Substack's own legal/regulatory/security obligations require. No restore path exists. Export before you delete, every time — this isn't a "just in case," it's the only backup that will exist.

**Acquisition or shutdown scenario**: Substack's privacy policy contains an explicit "Prospective sellers or buyers" clause — customer information can be transferred "in connection with the sale or merger" of the business, and separately "if we go out of business, enter bankruptcy, or go through some other change of control." Combined with the Terms of Use's account-termination clause — Substack can terminate or suspend your account "for any reason at [its] discretion," with a best-effort, not guaranteed, advance-notice commitment — the honest read is: your subscriber relationship exists at Substack's discretion, and transfers with the company if it's ever sold, under whichever privacy terms the acquirer sets, not the ones you originally agreed to.

| Governance question | Substack's actual position |
|---|---|
| Sells personal data? | No, per policy |
| Behavioral ad-targeting? | Explicitly excluded by policy; standard analytics cookies (Google/Meta) still present |
| GDPR mechanism | EU-U.S. Data Privacy Framework + Standard Contractual Clauses; you're the controller of your own subscriber list |
| Deletion | Permanent, two narrow retention exceptions, no restore |
| Acquisition/shutdown | Data transfers with the sale/bankruptcy; account can be terminated at Substack's discretion |

None of this makes Substack an outlier — beehiiv, Ghost(Pro), and most VC-funded SaaS tools carry equivalent acquisition and processor/controller clauses. The comparison that actually matters is between a *managed vendor's* acquisition risk (your data's fate tied to whoever buys them) and a *self-hosted* setup's acquisition risk (there's no "them" to be acquired — the risk moves to your own operational discipline instead).

## Managed cloud vs. renting your own server: what leaving Substack actually means

"Leaving Substack" collapses into one of three operating models, and it's worth being clear-eyed about which one you're actually signing up for before you export anything.

- **Staying on Substack** — fully managed. Substack owns the infrastructure, the fee schedule, and the moderation policy. You have no vote on any of the three.
- **Self-hosted Ghost on a rented VPS** (Hetzner, a DigitalOcean Droplet) — you own the box. Full control over the software, the data, and the uptime, and full responsibility for all three.
- **Managed-but-open, e.g. Vercel + Supabase** — you don't manage physical infrastructure, but the application layer is yours, and the underlying data (Postgres, in Supabase's case) is in a standard, exportable format rather than a vendor-proprietary one.

| | Substack (fully managed) | Self-hosted Ghost on a VPS | Vercel + Supabase (managed, open stack) |
|---|---|---|---|
| **Security patching** | Substack's problem entirely | Yours — OS, database engine, every dependency | The platforms' problem |
| **On-call if it goes down** | Substack's support/ops team | You, full stop | Vendor support/status page; you handle app-level bugs |
| **Cost predictability** | Free to start; 10%+ of gross paid revenue, permanently, with no ceiling | Flat server rent (~$4-15/mo), but your time is the real cost | Free/cheap floor, usage-based ceiling that scales with traffic |
| **Data portability** | Good relative to its reputation — CSV/HTML export exists, but it's a vendor-format export, not a live database you control | Total — it's your Postgres/MySQL instance, no export step required, ever | Good — it's already Postgres; export is a standard `pg_dump`, not a vendor-specific tool |
| **Technical skill required** | None | High — comfortable with SSH, firewalls, backup strategy | Moderate — config, environment variables, API keys, not systems administration |

For the deeper mechanics of the right two columns, see my `deploy-on-hetzner-self-hosted-postgres` guides and `deploy-on-vercel-and-supabase` guides — and if you're specifically scoping the move off Substack itself, my `migrate-from-substack` guides cover the actual export/import mechanics end to end. This table is just the fork-in-the-road summary before you commit to reading either path in depth.

## Who should actually stay on Substack

It's easy for a guide like this to read as "leave immediately." That's not actually my position, and here's the honest version of who shouldn't move yet:

- **You have no paid revenue and a small list.** There's no fee to escape and no meaningful data-governance exposure yet. Migrating now trades real setup time for a theoretical benefit you're not currently paying for.
- **Substack's Notes network is doing real acquisition work for you.** If a meaningful share of your subscriber growth comes from Substack's recommendation feed rather than your own channels, leaving means giving that up entirely — no self-hosted tool replicates it. If that trade isn't worth it to you yet, staying is a defensible, not a lazy, decision.
- **You don't have the technical skill or budget for the alternative you'd actually pick, and you know it.** beehiiv still isn't free once you're taking payments, and self-hosting Ghost means you're the entire ops team. If you'd be moving to "a platform I don't understand yet" rather than "a platform I've evaluated and prefer," that's a sign to wait and build the skill or the budget first, not to migrate under pressure.
- **Your risk tolerance for the moderation/reputation issue is genuinely different from mine.** I've been direct about where I land on Substack's moderation history in this guide. Plenty of writers with full awareness of that history have made a reasoned decision to stay, because the acquisition channel or the zero-maintenance tradeoff outweighs it for them. That's not a position I need to talk you out of if you've actually weighed it.

The migration math changes as your list and revenue grow — a fee that's negligible at 50 subscribers is a real number at 5,000. But "you should eventually own more of your own stack" and "you should do it this week regardless of your situation" are different claims, and I'd rather you leave when the tradeoff genuinely favors it than because a guide told you to.

## My verdict

> **💡 Tip — Where I land**

Substack is a reasonable place to prototype a newsletter because the exit path is real: CSV and HTML exports that both Ghost and beehiiv already know how to ingest. But "reasonable to start" isn't the same as "safe to depend on."

Here's the compounding case against staying long-term, once you have meaningful paid revenue:

- **The 10% fee doesn't shrink.** It's a permanent tax on your best-performing months, not a startup cost.
- **You have zero product control.** No custom design, no API, no way to build the features your specific audience needs.
- **The reputational exposure is ongoing.** The moderation debate isn't a one-time event you can wait out — it resurfaces.

All three compound in the same direction: toward wanting your own infrastructure. I'd treat Substack the way I'd treat any managed platform in this project's broader theme: fine as a fast on-ramp, not where you want to still be in three years if the newsletter works.

## Sources
- [Substack Privacy Policy](https://substack.com/privacy)
- [Substack: How does Substack comply with Data Regulations?](https://support.substack.com/hc/en-us/articles/13579258227092-How-does-Substack-comply-with-Data-Regulations)
- [Substack: How do I delete my Substack publication?](https://support.substack.com/hc/en-us/articles/360037465892-How-do-I-delete-my-Substack-publication)
- [Substack: How do I delete my Substack account?](https://support.substack.com/hc/en-us/articles/360060692511-How-do-I-delete-my-Substack-account)
- [Substack Terms of Use](https://substack.com/tos)
- [Substack CCPA Policy](https://substack.com/ccpa)
- [Substack: How much does Substack cost?](https://support.substack.com/hc/en-us/articles/360037607131-How-much-does-Substack-cost)
- [Substack Fee Calculator, 2026](https://payoutmath.com/substack-fee-calculator/)
- [How do I export my posts](https://support.substack.com/hc/en-us/articles/360037466012-How-do-I-export-my-posts)
- [How do I export my email list on Substack](https://support.substack.com/hc/en-us/articles/6314498343700-How-do-I-export-my-email-list-on-Substack)
- [Substack: configure a CNAME with your registrar](https://support.substack.com/hc/en-us/articles/360051222791-How-do-I-configure-a-CNAME-with-my-registrar)
- [Ghost: Migrating from BeeHiiv](https://docs.ghost.org/migration/beehiiv/)
- [beehiiv: How to migrate from Substack to beehiiv](https://www.beehiiv.com/support/article/14966988360215-How-to-migrate-from-Substack-to-beehiiv)
- [Why Platformer is leaving Substack](https://www.platformer.news/why-platformer-is-leaving-substack/)
- [Platformer: What I learned in year four](https://www.platformer.news/leaving-substack-platformer-year-four/)
- [TechCrunch: Substack's Nazi content policies controversy](https://techcrunch.com/2024/01/09/substack-nazi-content-policies-controversy/)
- [Georgetown Free Speech Project tracker](https://freespeechproject.georgetown.edu/tracker-entries/substack-decision-to-remove-nazi-accounts-leads-to-outcry-over-censorship/)
- [Nieman Journalism Lab: Top Substack writers depart for Patreon](https://www.niemanlab.org/2025/10/top-substack-writers-depart-for-patreon/)
- [Digiday: More writers are leaving Substack over its ideological shift in 2025](https://digiday.com/media/creators-are-ditching-substack-over-ideological-shift-in-2025/)
- [The Notes algorithm explained](https://pubstacksuccess.substack.com/p/the-notes-algorithm-explained-by)
