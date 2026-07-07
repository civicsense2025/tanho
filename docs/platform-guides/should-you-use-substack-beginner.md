---
title: "Should you build on Substack? (Beginner's guide)"
tagline: "Free to start, a real 10% cut, and almost nothing you can customize"
category: own-your-stack
source_platform: substack
level: beginner
difficulty: beginner
cost_range_usd: "0-0/mo"
tags: ["newsletter", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "No coding or technical background needed"
  - "Comfortable doing basic monthly cost math on a subscription cut"
  - "Willing to read a privacy policy section on data sharing"
requirements:
  - "A rough idea of what you'd charge subscribers, if you plan to go paid"
  - "15-20 minutes to read the fee math and data governance sections"
  - "Access to Substack's settings panel if checking export options"
effort_hours_min: 0
effort_hours_max: 1
---

# Should you build on Substack? (Beginner's guide)

If you've never written a line of code and you're just trying to figure out whether to start a newsletter, this guide is for you. I'm going to skip the technical stuff and focus on one question: what actually happens to your audience and your income if you build on Substack.

This is part of a bigger project I'm working on about not getting trapped by the platforms you build on — "owning your site" instead of renting space on someone else's. Substack is the easiest possible way to start a newsletter. It's also a good first case study in what "platform lock-in" costs you, because the lock-in here is mild compared to some platforms, which makes it easier to see clearly.

## What Substack actually is

Substack lets you write posts and email them to subscribers, for free, with no setup beyond typing your publication name and clicking publish. Here's the basic shape of it:

- **Free tier** — write and send as many posts as you want to your email list, no cost at all.
- **Paid tier** — if you want to charge subscribers, Substack handles the credit card processing (through a company called Stripe) and the payouts for you.
- **No setup required** — no hosting to configure, no code to write, no server to maintain.

> **[📸 SCREENSHOT PLACEHOLDER]** — Substack's publication creation screen, showing how few steps stand between "nothing" and "live newsletter"

## The fee math, in plain numbers

This is the part most beginners skip past, so let's slow down. Substack takes a 10% cut of whatever you charge subscribers. On top of that, Stripe — the payment processor Substack uses under the hood — takes its own cut, plus a per-transaction fee. According to Substack's own help documentation and multiple independent breakdowns published this year, the combined bite is roughly 13–16% of what a subscriber pays you, depending on the price point.

Here's what that looks like with real numbers:

- A reader pays you **$10/month**. Substack takes 10% ($1). Stripe takes roughly 2.9% + $0.30, plus a smaller recurring-billing fee Stripe added in mid-2024. **You net about $8.40.**
- Scale that to **100 paying subscribers at $10/month** ($1,000/month gross): you'd take home roughly **$836–$840/month**, with the rest split between Substack and Stripe.
- Scale to **1,000 paying subscribers at $10/month** ($10,000/month gross): the same percentage applies — Substack doesn't reduce its cut as you grow, and there's no way to negotiate it down as an individual writer. You'd still be handing over roughly $1,600/month combined, forever, with no ceiling.

A few things worth understanding about this fee before you commit to the platform:

- **It's permanent, not a startup fee.** It doesn't go away once you're established, and it scales with your success — the more money your newsletter makes, the more dollars (not just percentage) go to Substack every single month.
- **There's no loyalty discount.** A program called "Substack Pro" used to pay writers a cash advance to join in exchange for a bigger cut over the first year. It's closed to new writers now.
- **Large publications can negotiate, individuals can't.** Substack has an "Enterprise" tier for very large publications, but the pricing isn't published anywhere — you'd have to talk to their sales team. As an individual writer, you have no such leverage.

## What "you don't own the platform" means for you, day to day

This is the part that's easy to gloss over as a beginner because it doesn't bite you on day one. Here's what it means concretely:

- **Your website address isn't really yours.** By default you get `yourname.substack.com`. You can pay a one-time $50 fee to point your own domain (like `yourname.com`) at your Substack, but even then, the newsletter itself still lives on Substack's servers, running Substack's code.
- **You can't change how it looks or works.** There's no custom design, no custom code, no plugins. If Substack redesigns something you relied on, you have no vote and no workaround.
- **Your growth is tied to Substack's app and algorithm.** Substack has built a social feed called "Notes," and in 2026 it's become one of the biggest sources of new subscribers for writers on the platform — sometimes bigger than direct recommendations. That's a real benefit if you're starting from zero. It's also a dependency: your discoverability is governed by an algorithm you don't control and that can change overnight.
- **You're publicly associated with whoever else is on the platform.** This is the part that's caused real writers to leave, and it's worth understanding as a beginner even though it feels abstract.

Here's the timeline on that last point, because it matters more than it sounds like it should:

1. **November 2023** — The Atlantic published an investigation identifying more than a dozen newsletters using overt Nazi symbols and dozens more promoting far-right extremism, all monetizing on Substack.
2. **December 2023** — Substack's CEO initially defended a hands-off moderation stance in response.
3. **January 2024** — after 247 writers signed an open letter and some began leaving, Substack removed five accounts, but did not change its underlying policy.
4. **Through 2025** — reporting shows a steady trickle of writers, some prominent and some not, citing the platform's political associations as one reason they're leaving for other tools.

None of this means you can't succeed on Substack — plenty of people do. It means the platform's reputation is not fully separable from your own while you're building your audience there.

## The one thing that genuinely protects you

> **ℹ️ Note — Export is real**

Unlike some platforms, Substack does let you download everything: your posts and your subscriber email list, as a zip file you can request from your settings at any time. That's meaningfully better than a platform that traps your subscriber list forever. It means if you outgrow Substack, or decide you don't want to be associated with it, you can leave with your writing and your readers' emails intact — you're not starting over from zero.

> **[📸 SCREENSHOT PLACEHOLDER]** — the Settings → Exports panel where you request a data export

## Data governance: how Substack actually handles your data

I touched on "you don't own the platform" above, but there's a more specific question worth answering in plain terms: what does Substack actually do with your data, and your subscribers' data, once it's sitting on their servers? I read Substack's actual privacy policy (last updated May 2026) so you don't have to. Here's the honest breakdown.

**Who Substack shares your data with**, according to its own privacy policy:

- **Affiliates** — companies under the same corporate umbrella as Substack.
- **You, the creator** — when someone subscribes to your newsletter, Substack hands you their name and email so you can actually send them your posts.
- **Service providers doing work for Substack** — Stripe for payments, plus hosting, security, "generative AI services," customer support, and analytics companies. Substack doesn't publish the full list of who these are.
- **Other users** — if your profile or reading activity is set to visible, other Substack users can see it.
- **Buyers, if Substack is ever sold** — more on this below.
- **Law enforcement and government requests**, when legally required.

A distinction worth understanding: Substack's privacy policy says it does **not sell** your personal information, and does not share it for what's called "cross-context behavioral advertising" (the kind of ad-targeting where a company you've never heard of buys your browsing habits from site to site). That's a real, meaningful line most social apps don't draw. But Substack's own site does run tracking cookies from Google and Meta (Facebook) for analytics, so "no ad sales" doesn't mean "no tracking at all" — it means a narrower kind of tracking than some other platforms.

**GDPR (the EU's privacy law) compliance**: Substack says it complies through something called the "EU-U.S. Data Privacy Framework," a US-government-certified program, plus "Standard Contractual Clauses" in its agreements with publishers. In plain terms, Substack has done the paperwork EU regulators require for moving European users' data to US servers. One wrinkle worth knowing if you have European subscribers: Substack treats *you*, the newsletter writer, as the legally responsible party for your own subscriber list, not just Substack.

**If you delete your publication**: per Substack's own help documentation, deletion is permanent. Your data — posts, subscriber list, everything — is erased, except for anonymized analytics and whatever minimal records Substack is legally required to keep. There's no "restore" option. Substack's own advice, and mine: export everything first, every time, before you delete anything.

**If Substack itself gets sold or shuts down**: this is the one people don't think to ask about. Substack's privacy policy has a specific clause covering exactly this — your data (your subscriber list and account information) can be transferred to a new owner "in connection with the sale or merger" of the business, or if Substack "goes out of business, enters bankruptcy, or goes through some other change of control." In other words, if Substack is acquired tomorrow, your subscribers' emails go with the sale, under whatever privacy terms the new owner sets — not the terms you signed up under.

| Question | What Substack's policy actually says |
|---|---|
| Does Substack sell my data? | No, per its own policy — but it does share data with service providers, affiliates, and (if you opt in) other users |
| Does it track me for ad targeting? | Not "cross-context behavioral advertising" by its own definition, but Google/Meta analytics cookies are present on its site |
| Is it GDPR compliant? | Substack says yes, via the EU-U.S. Data Privacy Framework and Standard Contractual Clauses — you (the writer) share legal responsibility for your own subscriber list |
| What happens if I delete my publication? | Permanent erasure, no restore — export your data first |
| What happens if Substack is sold or shuts down? | Your data transfers to the new owner as part of the sale, under new terms you didn't agree to |

None of this is unusual for a venture-backed tech company — most platforms you'd move to instead (beehiiv, Ghost's hosted option, etc.) have similar acquisition and merger clauses in their own policies. The point isn't that Substack is uniquely bad here. It's that "my data is safe because it's just a newsletter" isn't really true — it's sitting under the same kind of corporate-acquisition and vendor-lock-in terms as any other tech platform, and it's worth reading before you build something on top of it.

## Managed cloud vs. renting your own server: what leaving Substack actually means

If you do eventually decide to leave, it helps to understand upfront what you're trading, because "leaving Substack" doesn't mean one specific thing — it means picking a different arrangement of who's responsible for what. Here's the plain-language version of your three broad choices.

- **Staying on Substack**: a company runs everything for you. You never touch a server. In exchange, that company decides the rules — the fee, the moderation policy, the features — and you have essentially no say.
- **Self-hosting Ghost on a rented server (called a "VPS," short for virtual private server)**: you rent a bare computer from a company like Hetzner, and you install and run everything on it yourself. Total control, but also total responsibility — nobody's coming to fix it for you if something breaks at 2 a.m.
- **A managed-but-more-open setup, like Vercel + Supabase**: a middle path. You're still relying on companies to run the actual servers, but the software running on top is yours, and your data lives in a more standard, exportable format than Substack's.

| | Staying on Substack | Self-hosted Ghost on a rented VPS | Managed-but-open (Vercel + Supabase) |
|---|---|---|---|
| **Who patches security updates** | Substack, automatically, invisibly | You do — the server, the operating system, everything | The platform companies do |
| **Who's on call if it goes down** | Substack's support team | You are, including at 2 a.m. | The platform's support team |
| **Cost predictability** | Free to start, 10%+ of any paid revenue forever | A flat, cheap monthly rent (often under $15/month) for the server, but your own time isn't free | Usually free or cheap to start; cost grows with traffic |
| **Data portability** | Good for a walled platform — you can export your posts and subscribers | Total — it's your machine and your database | Good — standard database export tools |
| **Technical skill required** | None | High — comfortable with a command line, managing a server | Low to moderate — mostly clicking through dashboards |

I go into the full mechanics of the middle and self-hosted paths in my `deploy-on-vercel-and-supabase` guides and my `deploy-on-hetzner-self-hosted-postgres` guides, and I've written a dedicated walkthrough of the actual move in my `migrate-from-substack` guides if you get to that point. This section is just here so you know, before you read either of those, roughly which category you're even choosing between.

## Who should actually stay on Substack

I've spent most of this guide on why Substack has real limits. In fairness, here's the honest other side: reasons to stay, at least for now.

- **You're just starting out and don't know yet if anyone wants to read what you write.** If you have a tiny list (a few dozen or a few hundred subscribers) and no paying subscribers, there's nothing to protect yet. Migrating is real work; do it when you actually have something worth protecting.
- **Substack's built-in audience network (called "Notes") matters more to you than the moderation concerns do.** Some writers get a real, measurable amount of their growth from Substack's own recommendation feed. If that's genuinely working for you and the platform's reputation doesn't bother you personally, that's a legitimate reason to stay — I'd rather you say so honestly than leave for a principle you don't actually hold.
- **You have zero technical background and no budget for anything else.** Every alternative costs you either money (a platform like beehiiv, which still isn't free once you have paid subscribers) or time and comfort with things like servers and command lines (self-hosting). If neither is available to you right now, staying on Substack while you build up either money or skills is a completely reasonable, honest answer — not a failure.
- **You're not ready to give up the free tier.** Substack's free tier costs nothing, ever, as long as you don't take payments. Every self-hosted or managed alternative has some real cost, even if it's small. If your budget is genuinely zero, that constraint is real and worth respecting.

This isn't a one-sided argument. I think most people who build something real should eventually own more of their own infrastructure — that's the whole point of this project. But "eventually" is doing real work in that sentence, and if you're not there yet, staying put is the honest answer, not a compromise.

## My verdict

> **💡 Tip — Where I land, for a beginner**

If you've never done this before and you just want to find out if you like writing a newsletter and if anyone wants to read it, Substack is a genuinely good place to start — free, fast, and the exit door isn't locked.

Where I'd draw the line as a beginner:

- **Good for:** testing whether you like writing regularly, and whether anyone wants to read it, with zero setup cost.
- **Not something I'd build a long-term financial plan around:** not without understanding that the 10% cut is permanent, that you can't fully control your own storefront, and that the platform comes with a reputation you're inheriting.
- **My advice:** start on Substack to learn. Plan to eventually move somewhere you control, once you know your newsletter is real.

## Sources
- [Substack Privacy Policy](https://substack.com/privacy)
- [Substack: How does Substack comply with Data Regulations?](https://support.substack.com/hc/en-us/articles/13579258227092-How-does-Substack-comply-with-Data-Regulations)
- [Substack: How do I delete my Substack publication?](https://support.substack.com/hc/en-us/articles/360037465892-How-do-I-delete-my-Substack-publication)
- [Substack: How do I delete my Substack account?](https://support.substack.com/hc/en-us/articles/360060692511-How-do-I-delete-my-Substack-account)
- [Substack Terms of Use](https://substack.com/tos)
- [Substack CCPA Policy](https://substack.com/ccpa)
- [Substack: How much does Substack cost?](https://support.substack.com/hc/en-us/articles/360037607131-How-much-does-Substack-cost)
- [Substack Fee Calculator, 2026](https://payoutmath.com/substack-fee-calculator/)
- [Substack: custom domain setup](https://support.substack.com/hc/en-us/articles/360051222571-How-do-I-set-up-my-custom-domain-on-Substack)
- [Can I edit the CSS or HTML on Substack?](https://support.substack.com/hc/en-us/articles/360037463152-Can-I-edit-the-CSS-or-HTML-on-Substack)
- [How do I export my posts](https://support.substack.com/hc/en-us/articles/360037466012-How-do-I-export-my-posts)
- [How do I export my email list on Substack](https://support.substack.com/hc/en-us/articles/6314498343700-How-do-I-export-my-email-list-on-Substack)
- [TechCrunch: Substack's Nazi content policies controversy](https://techcrunch.com/2024/01/09/substack-nazi-content-policies-controversy/)
- [Georgetown Free Speech Project tracker](https://freespeechproject.georgetown.edu/tracker-entries/substack-decision-to-remove-nazi-accounts-leads-to-outcry-over-censorship/)
- [NBC News: Substack removed newsletters after criticism about Nazi content](https://www.nbcnews.com/tech/tech-news/substack-removed-newsletters-criticism-nazi-content-rcna132963)
- [Digiday: More writers are leaving Substack over its ideological shift in 2025](https://digiday.com/media/creators-are-ditching-substack-over-ideological-shift-in-2025/)
- [The Notes algorithm explained](https://pubstacksuccess.substack.com/p/the-notes-algorithm-explained-by)
