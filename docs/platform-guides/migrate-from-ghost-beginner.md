---
title: "Moving off Ghost(Pro): your migration options (Beginner's guide)"
tagline: "Leaving Ghost's managed hosting, not Ghost itself — the actual tools that move your posts, pages, and members"
category: own-your-stack
source_platform: ghost
difficulty: beginner
cost_range_usd: "0-0/mo"
tags: ["cms", "newsletter", "migration", "platform-evaluation"]
level: beginner
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can log into an admin dashboard and click through settings menus"
  - "Comfortable following multi-step instructions without live help"
  - "Can download and upload files (a JSON export and a members CSV)"
  - "Basic understanding of Stripe as your connected payment account"
requirements:
  - "A Ghost(Pro) content export (.json) via Settings → Advanced → Import/Export"
  - "A separate members export (.csv) if you have free or paying subscribers"
  - "A fresh destination instance ready to import into (self-hosted Ghost, OYS, or WordPress)"
  - "The same Stripe account reconnected on your new install if you have paying members"
  - "Time to manually re-host images, since Ghost's export doesn't include image files"
effort_hours_min: 1
effort_hours_max: 4
---

# Moving off Ghost(Pro): your migration options (Beginner's guide)

Let me say this clearly before anything else: this guide is not "Ghost is bad, leave it." Ghost is one of the more ethical platforms in this whole hub — it's open-source (meaning the underlying code is free and public for anyone to inspect or run), and self-hosting it entirely is a real, supported option. If you're picking a destination platform from scratch, Ghost is genuinely one of my recommended targets elsewhere in this project.

What this guide is actually about is **Ghost(Pro)** — the managed hosting service Ghost's own team sells, where you pay them monthly and they run the servers for you. That's a completely reasonable choice for a lot of people, but it's still a hosted, billed service with its own lock-in dynamics: you're paying rent every month, you're subject to their infrastructure choices, and if you ever want to stop paying, you need a way out. This guide is that way out — specifically the move from Ghost(Pro)'s hosted billing to **self-hosting Ghost yourself**, or to a different destination entirely if you've decided Ghost as software isn't the right fit either.

Here's the good news up front: moving from Ghost(Pro) to self-hosted Ghost is, hands down, the simplest and lowest-risk migration covered anywhere in this guide series. You're not translating your content into a different platform's format — you're moving the exact same software from a computer Ghost's team manages to a computer you manage. Everything else in this guide (WordPress, a custom app, or Own Your Site) is more work than that, in roughly that order.

## First, a few words you'll see throughout

- **Export**: a file a platform generates for you, containing your content and data, that you can take elsewhere.
- **Import**: the reverse — a tool on your *new* platform that reads an export file and recreates your content there.
- **Self-hosting**: running software on a server (a computer built to stay on and connected to the internet) that you rent or own, instead of paying a company to run it for you inside their app.
- **JSON**: a plain-text file format for structured data (short for "JavaScript Object Notation"). It's readable by both computers and, with a little squinting, humans. Ghost's export is a JSON file.
- **Members**: Ghost's name for your subscribers — the people who signed up to read your content, whether for free or as paying supporters.
- **Stripe**: the payment company that actually processes credit cards behind the scenes when someone pays for a Ghost membership. Ghost doesn't handle money itself; it connects to your Stripe account.

## Getting your Ghost export (do this first, no matter where you're headed)

Every path below starts here:

1. Log into your Ghost(Pro) admin dashboard.
2. Go to **Settings → Advanced → Import/Export** (some versions of the interface simply call this **Settings → Migration**).
3. Click **Export**, then the **Content & settings** button.
4. Ghost generates a `.json` file — something like `my-site.ghost.2026-07-07-14-15-49.json` — and downloads it to your computer.

A few things worth knowing about that file before you go further:

- It contains your posts, pages, tags, and author information — everything about *content*, not people.
- It does **not** contain your images. Ghost's export is text-only; images stay referenced by their web address (URL) inside the file, not embedded in it.
- It does **not** contain your members (subscribers) either. Members are a completely separate export, covered below.
- If you're a paying Ghost(Pro) customer specifically (not self-hosting already), Ghost's own support team can help pull your images for you directly — worth asking for if you have a large media library, since re-hosting images by hand is the most tedious part of any Ghost migration.

> **[📸 SCREENSHOT PLACEHOLDER]** — Ghost admin Settings → Advanced → Import/Export page with the Export button visible
>
> _Replace this callout with the real screenshot before publishing._

If you have paying or free members, you'll also need a second export:

1. Go to the **Members** area in Ghost admin.
2. Click the gear/settings icon in the top right.
3. Select **Export all members**.
4. Ghost generates a CSV (a plain spreadsheet file that nearly every tool on earth can open) containing each member's ID, email, name, note, subscription status, complimentary-plan flag, Stripe customer ID, signup date, and any labels you've applied.

Two separate exports, two separate files — it's an easy step to forget, and forgetting it is far more costly the more paying members you have. Keep both files somewhere safe before you touch anything else.

With those two files in hand, here are your four realistic destinations.

## Option 1: Move to self-hosted Ghost — the simplest path here

This is the one I'd point most Ghost(Pro) users toward if their only complaint is the monthly bill, not the software itself.

Because you're moving the *same* platform, Ghost's own importer already knows exactly how to read its own export file. Ghost's official documentation calls this the "Ghost to Ghost" migration, and it uses what they call the **Universal import** option — the same importer screen used for every migration source, but it auto-detects a native Ghost file and handles it natively rather than needing a conversion step.

Here's what the process actually looks like:

- Stand up a fresh, empty self-hosted Ghost install on your own server first (Ghost's own hosting recommendations and most VPS — "virtual private server," a rented slice of a physical server — providers document this setup).
- Log into the *new* self-hosted site's admin dashboard.
- Go to **Settings → Advanced → Import/Export**, click **Import**, and upload the `.json` file you exported from Ghost(Pro).
- Ghost recreates your posts, pages, tags, and authors on the new install.
- Separately, upload your member CSV through **Members → (gear icon) → Import members** to bring your subscriber list over.
- If you have paying members, connect the *same* Stripe account to your new self-hosted install that was connected to your Ghost(Pro) site. When you set each member's `stripe_customer_id` field to `auto` in the CSV (or leave the ID Ghost already exported), Ghost searches your connected Stripe account for a matching customer by email and reattaches the existing subscription — no new charge, no gap in billing.

A couple of things worth flagging honestly, since I want this section to be useful rather than a sales pitch for self-hosting:

- **Images are the one manual step.** Because Ghost's export doesn't include image files, you'll need to either download your media library separately (Ghost(Pro) support can help with this) or point your new site's storage at wherever those images already live.
- **Ghost's own forum confirms this is a well-worn path.** Multiple self-hosters have asked this exact question — moving Ghost(Pro) to self-hosted — and Ghost's community answer has consistently been: yes, just reverse the normal "migrate into Ghost(Pro)" process, get help from Ghost(Pro) support for the images, and everything else (content, members, Stripe) carries over natively.
- **You'll need to actually run the server yourself from here on.** Self-hosting Ghost means you're now responsible for updates, backups, and uptime — that's the tradeoff for not paying Ghost's monthly fee anymore.

> **[🎥 VIDEO PLACEHOLDER]** — full screen recording of exporting from Ghost(Pro) and importing into a fresh self-hosted Ghost install
>
> _Replace this callout with the real video before publishing._

## Option 2: Move to Own Your Site (OYS)

OYS has a real, dedicated Ghost importer built in — no third-party conversion tool required. Here's the flow:

1. Go to **Admin → Content → Import** inside your OYS site.
2. Choose **Ghost** from the list of import sources.
3. Upload the `.json` file you exported from Ghost's Settings → Migration → Export screen.
4. OYS runs a **dry-run preview** first — it reads the file and shows you what it found (post counts, page counts) without writing anything yet, so you can sanity-check the numbers before committing.
5. Confirm, and OYS creates the posts and pages for real.

One detail that makes this importer genuinely convenient: OYS **auto-creates a 301 redirect** (an instruction telling browsers and search engines "this old address permanently moved, go here instead") from every old Ghost URL to its new home on OYS. In most cases, that's the whole job — you don't need to hunt down old links by hand.

What this importer covers and doesn't:

- **Covered**: posts, pages, and their original URLs (via the automatic redirects).
- **Not covered by this importer**: members and images, since those are separate exports on Ghost's side to begin with. You'd bring members over through OYS's membership setup separately.
- **Left over after the import**: old RSS subscriber links, tag/author archive URLs, or anything tied to a base path you've changed. OYS's **Bulk redirects** tool (Admin → Growth → SEO → Bulk redirects) can either fetch Ghost's published `sitemap.xml` directly and propose redirect mappings for every remaining old URL, or accept simple wildcard rules like `/tag/* -> /blog`.

> **[📸 SCREENSHOT PLACEHOLDER]** — OYS Admin → Content → Import screen with Ghost selected and the dry-run preview showing post/page counts
>
> _Replace this callout with the real screenshot before publishing._

## Option 3: Move to self-hosted WordPress

WordPress is the world's most widely used website software, and it's self-hostable — you run it on your own server instead of renting space inside someone else's app.

Unlike the Ghost-to-Ghost path, WordPress doesn't read Ghost's JSON format natively. You need a conversion step in the middle:

1. Export your `.json` file from Ghost, same as above.
2. Run it through a free browser-based conversion tool built specifically for this — upload the Ghost JSON file, and it generates a WordPress-compatible import file (WordPress's native import format is called **WXR**, an XML-based file WordPress's built-in importer already knows how to read).
3. In WordPress, go to **Tools → Import**, choose the WordPress importer (installing it from the plugin directory if it's not already active), and upload the converted file.
4. WordPress recreates your posts and pages using its native block editor format (called "Gutenberg blocks").

Some practical notes:

- Several tools exist for this Ghost-to-WordPress conversion step — free browser-based converters and WordPress import plugins that accept a converted CSV are both documented, actively discussed approaches on WordPress community sites. Verify whichever specific tool you pick still works before trusting it with your only copy of the export — test on a staging site first if you can.
- Like every other path here, **images, members, and Stripe billing are not part of this conversion.** WordPress needs separate plugins for membership/paywall functionality if you're bringing paying subscribers along, and you'll handle that subscriber CSV and the Stripe reconnection by hand.
- WordPress is a much bigger, more flexible platform than Ghost, which is a real upside if you want more than a blog — but it also means more moving parts (plugins, themes, updates) to maintain yourself going forward.

## Option 4: Build a custom app on your own stack

This is the path with no importer at all — you or a developer write code that reads the Ghost export and puts it into a database you built yourself. It's the most work, and it's only worth it if you're building a custom product rather than a blog or newsletter.

The good news, if you're going this route: Ghost's JSON export is probably the **easiest of any source platform in this hub to script against**. It's a clean, well-documented format:

- The file has exactly two top-level sections: a `meta` block (export timestamp and Ghost version) and a `data` block.
- Inside `data`, everything is arrays of plain objects — `posts`, `tags`, `users`, and small relationship tables (`posts_tags`, `posts_authors`) linking them together by ID.
- Each post object has clearly named fields — `title`, `slug`, `html`, `status`, `visibility`, `published_at`, and so on — with no guessing about structure.
- Ghost publishes this schema openly as part of its own developer documentation, meant for exactly this use case.

For hosting the app itself once you've parsed the data in, see my deploy guides for Vercel + Supabase — I won't repeat that setup here, just build on top of it once your parsing script has the content in a database.

## Does site size change anything?

Yes, and it applies no matter which destination you pick:

- **Small blog (a few dozen posts, free or Ghost(Pro)'s lowest tier)**: you can do this in one sitting. Export, import, done. There's no meaningful subscriber base to worry about breaking, and if something looks slightly off, you fix it by hand.
- **Medium publication (hundreds of posts, paid memberships via Ghost's built-in Stripe integration)**: plan the Stripe reconnection as its own deliberate step, not an afterthought. Double-check every paying member's subscription actually reattached correctly before you cancel your Ghost(Pro) plan.
- **Large publication (thousands of posts, significant paid-member revenue, newsletter sends at scale)**: treat this as a real project with a checklist, not a weekend task. Everything below matters much more at this size.

Why size matters mechanically:

- **Member export is separate from content export, every single time.** It's an easy step to forget at any size, but forgetting it is far more expensive once real subscription revenue is riding on it.
- **Stripe reconnection needs verification, not just trust.** At a handful of paying members, a mistake is annoying. At thousands, a botched reconnection means real people either get double-charged or silently lose access they're still paying for — check a sample of accounts by hand after the move, not just the summary count.
- **Email deliverability**: if your new destination sends newsletters through different infrastructure than Ghost(Pro) used, email providers (Gmail, Outlook, etc.) treat a sudden, unfamiliar sending source with more suspicion — especially at high volume. A large list benefits from a slower ramp-up rather than blasting everyone on day one.

## Data governance by destination

"Data governance" is a fancy way of asking a simple question: **who actually controls your stuff, and what happens if they change their mind?**

| Destination | Who controls the server & database | Could a company change terms or cut you off | How easy is ongoing export/backup | Can the code be inspected |
|---|---|---|---|---|
| Ghost(Pro) — what you're leaving | Ghost's own team. You get an admin dashboard, not a server | Yes — it's a hosted, billed relationship. Ghost is a nonprofit and better-behaved than most, but pricing, features, and account status are still their call | Easy in the moment (built-in export button), but you're always exporting *out of* a machine you don't own | Ghost's core software is open (MIT license), but that's the code Ghost runs for you — you're not the one running it here |
| Self-hosted Ghost | You. Full access to the server you're renting or own | Only your server/VPS company, and only at the "the machine itself" level — switching VPS providers is nowhere near as disruptive as switching content platforms | Full control — Ghost's own export tool plus direct access to the actual database for real backups | Yes — same MIT-licensed Ghost code Ghost(Pro) runs, fully public and inspectable |
| Own Your Site (OYS) | You. Full access to the server you're renting or own | Same as above — only your server/VPS company, at the infrastructure level | Full control — your database, on your server | Source is visible and readable, but it hasn't been released under a formal open-source license yet (no MIT/GPL/commercial license chosen) — you can look, but you don't have the same explicit reuse rights Ghost or WordPress grant in writing |
| Self-hosted WordPress | You. Full access to the server you're renting or own | Same as above — only your server/VPS company | Full control, plus a huge ecosystem of backup plugins built for exactly this | Yes — WordPress is GPLv2-licensed and one of the most widely audited codebases that exists, given how much of the internet runs on it |
| Custom app stack | You — it's your code, on infrastructure you chose | Only whatever hosting company you picked for it | Entirely up to how you built it | It's your own code — there's no license question because nobody but you owns it |

The short version: leaving Ghost(Pro) for *any* of these four options moves you from "a company controls the machine" to "you control the machine." That's true even for OYS, which is the one destination here without a formal open-source license yet — you're still the one running the server, you just don't yet have the same explicit legal permission to fork or redistribute the code that Ghost and WordPress spell out in writing.

## Managed cloud vs. renting your own server: the real tradeoff

Every self-hosted option in this guide (Ghost, OYS, WordPress, or a custom app) still needs to live *somewhere*. You've got two basic choices for that "somewhere," and they trade off very differently:

- **Managed/cloud platforms** — services like Vercel, Netlify, Railway, or Ghost(Pro) itself. You deploy your code or content, and the platform runs the actual computer for you.
- **Renting your own server (a VPS)** — a "virtual private server" from a company like Hetzner or DigitalOcean. You get a bare Linux machine and you're responsible for everything running on it.

| | Managed/cloud platform (Vercel, Netlify, Railway, Ghost(Pro)) | Renting your own VPS (Hetzner, DigitalOcean Droplet) |
|---|---|---|
| Who patches security updates | The platform does — you never see it happen | You do (or whoever you hire) — the operating system, Ghost/WordPress itself, and any plugins are your responsibility |
| Who's on call if it goes down | The platform's own ops team, usually with a public status page | You. If the server has a problem at 2am, nobody's coming unless you've set up your own monitoring |
| Cost predictability | Often free or cheap to start, but usage-based — the bill can climb as your traffic or storage grows | A flat monthly rental (commonly $4-40/month for a small site) that doesn't move with traffic unless you resize the server yourself |
| Data portability | Reasonable — most platforms let you export your content — but your setup lives inside that platform's specific conventions | Total — it's your machine, your files, your database. Nothing about it is platform-specific |
| Technical skill required | Low — deploy with a git push or a dashboard click, no server knowledge needed | Real — basic Linux/command-line comfort, understanding backups, and being willing to troubleshoot your own outages |

For a closer look at each side, I've got dedicated guides: **Deploy on Vercel + Supabase** for the fully-managed path, and **Deploy on Hetzner + self-hosted Postgres** for the do-it-yourself server path — both walk through the setup in detail.

## Who this migration isn't for

I want to be straightforward here, not just sell you on leaving Ghost(Pro).

- **You want zero server maintenance, ever.** Self-hosted Ghost is the easiest migration in this whole series — but "easiest" is relative to migrating to WordPress or building a custom app, not "effortless." You (or someone you pay) will still need to apply updates, watch disk space, and respond if the server has a problem. If that sentence made you uneasy, stay on Ghost(Pro), or pick a fully managed destination instead of self-hosting.
- **You've never opened a terminal or used SSH before.** Every self-hosted option here — Ghost, OYS, WordPress — assumes you're comfortable getting a command line open and following setup instructions without it feeling like a foreign language. If that's not you yet, either budget time to learn the basics first, hire someone for the initial setup, or stay managed.
- **You have real subscription revenue riding on this and no time to double-check the Stripe reconnection by hand.** The mechanics described above are reliable, but "reliable" doesn't mean "walk away and don't check." If you can't set aside time to verify paying members actually reattached correctly, don't run this migration during a busy week — do it when you can pay attention.
- **You're choosing WordPress or a custom app and don't have a developer (yourself or hired).** WordPress needs its own ongoing plugin and theme maintenance beyond anything Ghost asked of you. A custom app has no importer at all — you're writing code from scratch. Neither is a realistic weekend project if you don't already write code, or know someone who does.
- **You need this done today.** Even the simplest path here — Ghost to Ghost — means standing up and testing a brand-new server first. If you need your site live in the next hour, this isn't that.

If any of those describe you, the honest answer is: stay on Ghost(Pro) a while longer, or if the monthly bill is your only complaint, wait until you have a free stretch of time and nothing time-sensitive competing for your attention.

## My verdict

> **💡 Tip — Where I land, for a beginner**
>
> If you're happy with Ghost as software and only want out of the monthly Ghost(Pro) bill, self-hosted Ghost is the obvious answer — it's the same platform, the same import tool, and your paying members reconnect to the same Stripe account without missing a beat. It's genuinely the easiest migration in this entire guide series. OYS is my next pick if you want a dedicated importer with automatic redirect handling and you're open to a different platform. WordPress is fine if you're already invested in that ecosystem, but expect an extra conversion step. Building your own is only worth it if you're already committed to a custom product.

- **Good for staying in the Ghost family:** self-hosted Ghost — same format, same importer, Stripe reconnects natively.
- **Good for a clean move to a different platform:** OYS — dedicated Ghost importer with automatic 301 redirects.
- **Fine if you're already invested in WordPress:** the JSON-to-WXR conversion path, understanding it needs an extra tool and doesn't touch members or billing.
- **Only worth it if you're building something bespoke:** the custom-app path — Ghost's export is clean JSON, probably the easiest source format in this hub to parse.

## Sources

- [Ghost Help: Importing content](https://ghost.org/help/imports/)
- [Ghost Help: Exporting content and data](https://ghost.org/help/exports/)
- [Ghost Help: Import members](https://ghost.org/help/import-members)
- [Ghost Developer Docs: Migrating from Ghost to Ghost](https://docs.ghost.org/migration/ghost)
- [Ghost Developer Docs: Developer Migration Docs (custom/JSON schema)](https://ghost.org/docs/migration/custom)
- [Ghost Forum: Is it possible to migrate from Ghost Pro to self-hosted?](https://forum.ghost.org/t/is-it-possible-to-migrate-from-ghost-pro-to-self-hosted/39942)
- [Ghost Forum: How to migrate with Ghost Pro to self-hosting](https://forum.ghost.org/t/how-to-migrate-with-ghost-pro-to-self-hosting/29341)
- [WPBeginner: How to Properly Move from Ghost to WordPress](https://www.wpbeginner.com/wp-tutorials/how-to-properly-move-from-ghost-to-wordpress/)
- [Ghost Schema Reference — TryGhost/Ghost on GitHub](https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/data/schema/schema.js)
- [Ghost LICENSE (MIT) — TryGhost/Ghost on GitHub](https://github.com/TryGhost/Ghost/blob/main/LICENSE)
- [WordPress.org: GNU Public License (GPLv2)](https://wordpress.org/about/license/)
- [Hetzner Cloud pricing](https://www.hetzner.com/cloud/)
- [DigitalOcean Droplets pricing](https://www.digitalocean.com/pricing/droplets)
- [Vercel Pricing](https://vercel.com/pricing)
