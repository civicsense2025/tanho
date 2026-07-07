---
title: "Should you build on Webflow? (Intermediate)"
tagline: "The Data API, the export gap, and what a real migration actually involves"
category: own-your-stack
source_platform: webflow
level: intermediate
difficulty: intermediate
cost_range_usd: "0-2500/mo"
tags: ["website-builder", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Understand what an API is and how a CMS collection maps to structured data"
  - "Comfortable reading API documentation at a conceptual level"
  - "Basic familiarity with custom code injection (script tags, head/body embeds)"
  - "Willing to compare controller/processor responsibilities in a privacy policy"
requirements:
  - "A sense of your Collection/CMS item count and total site page count"
  - "Access to your current site's custom code injection or embed usage, if any"
  - "30-45 minutes to read the Data API, export-gap, and governance sections"
effort_hours_min: 0.5
effort_hours_max: 1.5
---

# Should you build on Webflow? (Intermediate)

Webflow is the platform in this series I'd call the most technically legitimate — a real visual builder paired with a real, structured CMS and a documented API. It's also the most expensive to run at real scale, and it's a company visibly repositioning itself. This guide assumes you know the basics (what a CMS is, what an API is, roughly what hosting means) and goes one level deeper into what integrating with — or migrating off of — Webflow actually looks like.

## Current pricing (post-May 2026 restructure)

Webflow simplified its plan lineup on May 13, 2026, for new purchases; existing sites move to the new structure at their next renewal on or after June 29, 2026.

- **Starter (free)** — 1 site, webflow.io subdomain, 2 pages, CMS capped at 20 Collections / 50 items
- **Basic — $15/mo** (annual billing) — up to 300 static pages, no CMS access at all
- **Premium — $25/mo** annual ($39/mo monthly) — the old separate CMS and Business plans merged into one tier: up to 20,000 CMS items, 40 Collections
- **Team — $2,500/mo** on an annual contract — 10 seats, 100 Collections, Webflow Localize, page branching, single-page publishing

Two changes worth flagging for planning purposes:

- **CMS item add-ons were removed.** The 20,000-item ceiling on Premium is now fixed rather than something you can pay to extend incrementally.
- **Bandwidth on Premium dropped to 50GB**, down from the old Business plan's 100GB. If you're running a content-heavy site with real traffic, model your bandwidth against 50GB before committing, not against the old numbers you might find in older reviews.

## The CMS as a real data layer

Webflow's Collections aren't just a "blog module" bolted onto a page builder — they're closer to a lightweight headless CMS with a visual front end attached. Each Collection has typed fields:

- Plain text
- Rich text
- Image
- Reference/relationship to another Collection
- Number
- Date

You design one template that renders every item in that Collection as its own page.

> **[📸 SCREENSHOT PLACEHOLDER]** — the Collection field-type configuration panel
>
> _Replace this callout with the real screenshot before publishing._

Where this gets useful for integration work is the Data API. It's documented, versioned, and covers:

- Sites
- CMS content (Collections and Items)
- Forms
- Orders

If you wanted to push content from an external system — say, a Supabase table, or an internal editorial tool — into a Webflow-hosted marketing site, this is the API I'd actually trust for that job: you can create, update, and delete CMS Items programmatically, then trigger a publish. That's a legitimate one-way sync pattern (external source of truth → Webflow as the rendering layer), and it's a reasonable architecture if you want Webflow's design tooling for a marketing site while keeping your actual data somewhere you control.

What it is not: a live, bidirectional sync. There's no built-in mechanism to keep an external database and Webflow's CMS continuously mirrored — you build that yourself against the API, with your own polling or webhook logic.

## Custom code injection specifics

Here's where custom code injection is available, and what it costs you:

- **Site level (Site Settings)** — head and before-closing-body-tag injection, available on any paid plan
- **Per-page (Page Settings)** — same injection points, scoped to a single page
- **Free Starter tier** — not available at all
- **Character limit** — Webflow raised these limits in a recent update: each injection field now supports up to 50,000 characters, up from the older 10,000–20,000 character ceiling. The same 50,000-character cap applies to Code Embed elements placed directly on the canvas and to CMS rich-text fields.

Practically, that's enough room for most third-party scripts, tag managers, and small custom widgets, but if you're injecting something larger (a sizeable JS bundle), the standard workaround is to host the file elsewhere and reference it with a `<script src="...">` tag rather than pasting the whole thing inline.

## The CMS-content export gap, concretely

This is the part that matters most if you're evaluating Webflow against a "don't get locked in" standard. Webflow's static code export gives you real HTML/CSS/JS — but explicitly excludes Collections content, user accounts, e-commerce data, and localized content. What actually breaks on an exported site:

- Collection list elements render as their empty state
- Collection template pages don't generate individual item pages at all
- Site search stops functioning
- Forms stop functioning
- Password-protected pages lose their protection

> **⚠️ Warning — what a real migration requires**
>
> If your site is CMS-driven, the official export tool cannot get your content out. Your realistic options, in order of how much they preserve:
>
> 1. **A community tool like ExFlow**, built specifically to work around this gap by capturing CMS-rendered pages as static HTML.
> 2. **A scraping tool** (Wget, HTTrack, or similar) that crawls your live, published site and saves every rendered page, item pages included.
> 3. **Pulling structured content back out via the Data API itself** — actually the cleanest option if you planned for it. Read every Item in every Collection via API and reconstruct your content as JSON or into a new database, rather than scraping rendered HTML.

Option 3 is the one worth designing around from the start: if you treat the Data API as a standing export mechanism — periodically pulling a full snapshot of your Collections into your own storage — you sidestep the export gap almost entirely. It just has to be a deliberate habit, because Webflow won't do it for you.

## A company in transition

Here's the timeline:

- **July 2024** — Webflow cut about 8% of staff.
- **June 2024** — Linda Tong took over as CEO.
- **March 2026** — Webflow acquired Vidoso.ai for AI-generated brand assets.
- **May 2026** — Under Tong, the company went through a further restructuring tied to a pivot toward what it calls the "agentic web" — positioning itself as an AI-driven marketing platform rather than purely a site builder.
- **May 2026 fallout** — Reporting described the layoffs as abrupt, with early-morning system lockouts and no advance notice for affected staff.

> **ℹ️ Note — no ownership change, but a real strategic shift**
>
> Webflow remains private, last valued near $4B in 2022. There's no acquisition or platform shutdown here. But two rounds of layoffs in two years and a public pivot in company identity are reasonable signals to weigh against how deeply you want to integrate before you're comfortable with the export story above.

## Data governance: how Webflow actually handles your data

The CMS-export gap covered above is about getting content *out*. It's worth also understanding what Webflow does with data *while you're in*, since that shapes how comfortable you should be relying on it as infrastructure.

I went through Webflow's current Global Privacy Policy (effective March 17, 2025) directly. Here's the breakdown:

| Area | What the policy actually says |
|---|---|
| Selling/sharing personal data | Webflow won't "give, sell, rent, or loan" Personal Information to third parties. It does share "De-identified Data" (anonymized/aggregated) with customers, partners, and service providers, and explicitly says this includes advertising and marketing purposes — a real, if narrower, data flow than "we never share anything." |
| What gets collected automatically | Log file data on your site's visitors: IP addresses, timestamps, user-agent strings, installed fonts and plugins, HTTP headers, browser language/timezone, and screen resolution — used for billing (tiered plans based on visitor counts), security, and analytics. |
| GDPR posture | Webflow is the data processor for content you publish; you're the data controller, responsible for your own site's cookie consent and privacy notices. Webflow is certified under the EU-U.S., UK, and Swiss Data Privacy Frameworks, and its Data Processing Addendum incorporates the EU Standard Contractual Clauses for international transfers — all hosted sites ultimately run on U.S.-based AWS infrastructure. |
| CCPA/state privacy rights | California and several other states' residents get a right to know, delete, and opt out of "sale" of Personal Information. Webflow's de-identified-data sharing for marketing purposes is the kind of activity that can qualify as a "sale" under CCPA's broad definition, which is why Webflow maintains a dedicated opt-out page rather than claiming the question doesn't apply to it. |
| Account/content deletion | Deleting your account isn't a single button — Webflow's process requires you to cancel all site plans, archive down to two sites, downgrade to the free Starter plan, and then request deletion through support. Once processed, Webflow's help center is explicit that it's unrecoverable. Third-party guides describe roughly a 30-day inaccessible-but-not-purged window before permanent deletion; that window isn't in Webflow's own official help content, so treat it as informal, not guaranteed. |
| The May 2026 "agentic web" pivot | Not yet reflected in the privacy policy, which is dated March 2025 — before the restructuring. A company repositioning around AI-driven marketing tools has an obvious incentive to lean harder on aggregated usage data to power those features. Worth re-reading the policy every few months rather than assuming the March 2025 version still fully describes the company's practices a year from now. |

Practically: if you're piping visitor data or CMS content through Webflow as part of a real business, the processor/controller split means the compliance paperwork for your own site is still yours to do — Webflow gives you the contractual tools (the DPA, the SCCs) but doesn't do your GDPR homework for you.

## Managed cloud vs. renting your own server: what leaving Webflow actually means

Migrating off Webflow eventually forces a second decision that has nothing to do with CMS exports: what do you replace the hosting with? There are three real options, and they trade control for maintenance burden in different amounts.

| | Staying on Webflow (managed) | Renting your own server (Ghost/WordPress on a Hetzner or DigitalOcean VPS) | Managed-but-open cloud (Vercel + Supabase, scripted against Webflow's Data API) |
|---|---|---|---|
| Who patches security updates | Webflow, entirely, with zero action from you | You — OS patches, app updates, dependency CVEs, all of it | The platform for infrastructure; you for application code and dependencies |
| Who's on call if it goes down | Webflow's infra team, against their own 99.99% uptime target | You, unless you're paying for managed VPS support | The platform's infra team for hosting/DB; you for anything your code introduces |
| Cost predictability | Flat tiered pricing, jumps at real scale (Team is $2,500/mo) | A flat server bill regardless of traffic — genuinely predictable | Cheap at low volume, but bandwidth/compute/row-based fees scale with usage and can surprise you |
| Data portability | Weak for CMS content specifically — the code export excludes Collections entirely | Total — your database, your backups, your schedule | Strong — your Postgres database is fully yours to export, even while Webflow remains the presentation layer |
| Technical skill required | Low — this is Webflow's core value proposition | High — you own uptime, security, and backups as an ongoing responsibility | Moderate to high — no server to patch, but real application code to write and maintain, including handling Webflow's Data API rate limits if you're syncing content |

I go deeper on the self-hosted route in my deploy-on-hetzner-self-hosted-postgres guides and the managed-cloud route in my deploy-on-vercel-and-supabase guides; if Webflow specifically is what you're migrating away from, my migrate-from-webflow guides cover what actually moves per destination.

The pattern that matters: Webflow's managed model buys you speed and zero maintenance, but you're renting, not owning, the CMS layer. A rented VPS buys full ownership at the cost of becoming your own sysadmin. The Vercel+Supabase middle path buys real data ownership without full server administration — but it costs you actual engineering time that Webflow's model doesn't ask for.

## Who should actually stay on Webflow

It's worth being direct here instead of defaulting to "always migrate eventually": a meaningful share of people evaluating Webflow shouldn't leave, and the reasons are concrete, not sentimental.

- **Your CMS footprint is small or nonexistent.** If your site is mostly static pages with a handful of Collection items, the export gap covered earlier barely touches you — there's little to lose and little reason to trade Webflow's design tooling for a rougher stack to protect content you don't really have much of.
- **You're not comfortable maintaining infrastructure, and you're honest about it.** The self-hosted alternative — Ghost or WordPress on a rented VPS — hands you total data portability, but also hands you security patching, uptime, and backup responsibility with no safety net. If you don't have the time or inclination to be your own system administrator, that "ownership" is a liability, not a win.
- **Your business model depends on the visual builder as a workflow, not just an output.** Agencies and freelancers who sell "I can build and adjust your site live in front of you" depend on Webflow's designer specifically — that's a real revenue-generating skill, and moving to a code-based stack changes what you're selling clients, not just how you host it.
- **You've already built real integration against the Data API.** If you're treating Webflow as a presentation layer with your actual data living in Supabase or elsewhere (the pattern I recommend in my verdict below), you've already solved the lock-in problem the export gap is about — there's no urgency to leave the rendering layer itself.
- **You don't have engineering time budgeted for ongoing maintenance.** Every alternative to Webflow's managed model trades ongoing convenience for ongoing responsibility somewhere — a VPS needs patching, a Vercel+Supabase stack needs code maintained. If nobody on your team has that time carved out, adding that responsibility to solve a hypothetical future lock-in problem is a bad trade against a real present cost.

None of this is an argument to never build the Data API integration or a real migration plan — it's an argument for doing it when the reason is concrete (a cost ceiling, a real feature gap, a compliance requirement you can't meet on Webflow), not preemptively out of principle alone.

## My verdict

> **💡 Tip — Where I land**
>
> Webflow is the one platform in this series I'd build real production infrastructure on, specifically because the Data API and CMS are structured enough to integrate properly with something like Supabase as your actual source of truth. My practice: use Webflow for the presentation layer, keep the canonical content elsewhere, and use the Data API as a scheduled export mechanism rather than waiting until a migration to discover the export gap the hard way.

## Sources

- [Webflow: Updated pricing and simplified plans for May 2026](https://help.webflow.com/hc/en-us/articles/51059955082387-Updated-pricing-and-simplified-plans-for-May-2026)
- [Webflow Data API docs](https://developers.webflow.com/data/docs/data-clients)
- [Rate Limits – Webflow Developer Documentation](https://developers.webflow.com/data/reference/rate-limits)
- [Custom code in head and body tags – Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961357265299-Custom-code-in-head-and-body-tags)
- [Increased custom code character limit – Webflow Updates](https://webflow.com/updates/increased-custom-code-character-limit)
- [How do I export my Webflow site code? – Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961386739347-How-do-I-export-my-Webflow-site-code)
- [Can you export a Webflow website? Understanding code export limitations](https://brixtemplates.com/blog/can-you-export-a-webflow-website-understanding-code-export-limitations)
- [A message to the Webflow team (restructuring announcement)](https://webflow.com/blog/restructuring-announcement)
- [Webflow acquires AI startup Vidoso to advance agentic marketing platform](https://mlq.ai/news/webflow-acquires-ai-startup-vidoso-to-advance-agentic-marketing-platform/)
- [Webflow Global Privacy Policy](https://webflow.com/legal/privacy)
- [Webflow EU & Swiss Privacy Policy](https://webflow.com/legal/eu-privacy-policy)
- [Webflow Data Processing Addendum](https://webflow.com/legal/dpa)
- [Delete your Webflow account – Webflow Help Center](https://help.webflow.com/hc/en-us/articles/33961237847443-Delete-your-Webflow-account)
- [Webflow Account Deletion: Site & Data Consequences – Chillybin](https://www.chillybin.co/webflow-sites-data-delete-account/)
