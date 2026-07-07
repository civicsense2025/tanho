---
title: "Moving off WordPress: your migration options (Beginner's guide)"
tagline: "The actual tools that move your posts and your URLs, explained one click at a time"
category: own-your-stack
source_platform: wordpress
difficulty: beginner
cost_range_usd: "0-0/mo"
tags: ["blog", "cms", "migration", "platform-evaluation"]
level: beginner
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Can log into an admin dashboard and click through menus"
  - "Comfortable following multi-step instructions without live help"
  - "Can download and upload a file (the WXR .xml export)"
  - "No terminal or command-line skills required for this path"
requirements:
  - "A WordPress site (wordpress.com or self-hosted) you can export from via Tools → Export"
  - "Admin access to your destination platform (OYS, Ghost, or a new WordPress install)"
  - "Your old site still reachable online while images are fetched during import"
  - "Time to spot-check a handful of imported posts and review redirects before cutover"
effort_hours_min: 2
effort_hours_max: 6
---

# Moving off WordPress: your migration options (Beginner's guide)

Let me say something up front, because "WordPress" means two different things and I don't want you confused about which one I'm talking about. WordPress.org — the free, open-source software you install on your own server — is actually one of the more ethical, self-owned publishing options out there, and it shows up elsewhere in this hub as a destination I'd point people *toward*, not away from. This guide is not about that WordPress.

This guide is for two specific situations:

- You're on **wordpress.com**, the hosted, managed version of WordPress that a company (Automattic) runs for you — and you've hit its paywalls, its plugin restrictions, or its pricing has crept up over time.
- You're running an **old, poorly-maintained self-hosted WordPress site** — outdated plugins, a theme nobody's touched in years, maybe security worries — and you want to modernize onto something fresh, whether that's a rebuilt self-hosted WordPress install or a different platform entirely.

Neither of those is a knock on WordPress the software. It's a knock on lock-in, neglect, or cost creep — the same things this whole guide hub exists to help you escape, whatever platform they show up on.

I'll explain every term as it comes up.

## First, one word you'll see constantly: WXR

- **WXR** stands for "WordPress eXtended RSS." It's WordPress's own built-in export file format — an XML file (a structured text format computers can read reliably) that contains your posts, pages, categories, tags, and comments.
- Every path in this guide either reads a WXR file directly or asks WordPress to produce one as a first step. It's the one file that matters most.

## Getting your WordPress export (do this first, no matter where you're headed)

1. Log into your WordPress admin dashboard.
2. Go to **Tools → Export**.
3. Choose **All content**.
4. Click the export button and download the `.xml` file it generates. That's your WXR file.

That's it — no plugin required for this step, and it works the same whether you're on wordpress.com or a self-hosted install.

> **[📸 SCREENSHOT PLACEHOLDER]** — WordPress admin's Tools → Export screen with "All content" selected
>
> _Replace this callout with the real screenshot before publishing._

With that XML file in hand, here are your four destinations.

## Option 1: Move to Own Your Site (OYS) — the path I built this for

This is the one I know best, because I built it, and I'll say plainly: this is the smoothest migration path in this entire guide hub, for any source platform. WordPress's WXR format is a known, structured, and well-documented file, and OYS has a real, dedicated importer built specifically to read it.

- Go to **Admin → Content → Import** inside your OYS site.
- Choose **WordPress** from the list of import sources.
- Upload the single `.xml` file you exported.
- OYS runs a **dry-run preview** first — it reads the file and shows you exactly what it found (how many posts, how many pages) before writing anything. Nothing is created until you click confirm.
- Once you confirm, OYS imports your posts and pages for real — and here's the part that matters most: it **automatically creates a redirect** from each old URL to its new home. You don't have to build these by hand.

> **[📸 SCREENSHOT PLACEHOLDER]** — the OYS Admin → Content → Import screen with WordPress selected and the dry-run preview showing post/page counts
>
> _Replace this callout with the real screenshot before publishing._

One thing worth knowing about upfront: WordPress often uses "dated" web addresses, like `/2019/03/my-post/` (the year and month baked right into the URL). If your new OYS site uses a flatter address like `/blog/my-post`, the automatic redirects from the importer cover everything it actually imported — but for older links floating around the internet that the importer might not catch, OYS has a second tool called **Bulk redirects** (under **Admin → Growth → SEO**) that can even fetch your *old* site's sitemap (a directory listing of all its pages) and propose a redirect for every single URL on it, reviewed before anything is committed. I walk through exactly how that works in the intermediate guide.

## Option 2: Move to self-hosted Ghost

Ghost is an open-source (meaning the underlying code is free and public) publishing platform you run yourself. Ghost's own team maintains an official WordPress importer, reachable right inside Ghost's admin dashboard under **Settings → Advanced → Import/Export**.

Here's the flow:

1. In Ghost admin, open the WordPress migration tool.
2. Enter your WordPress site's public web address, or upload the same `.xml` export file described above (Ghost supports both entry points, depending on version).
3. Ghost reads the file and shows you a confirmation of how many posts and pages it found.
4. Click import, and Ghost recreates your content in its own format.

A few details worth knowing:

- Ghost converts your WordPress **categories into tags** — the first category on any post becomes what Ghost calls the "primary tag."
- Standard WXR imports are supported up to roughly 100MB and 2,500 posts through the built-in tool; past that, Ghost's own docs point you toward its command-line toolkit (built by the same team) for larger jobs.
- Some page-builder shortcodes (bits of bracketed text certain WordPress plugins use to build layouts, like `[caption]` or `[vc_row]`) are recognized and converted; others aren't, and you'll want to spot-check a few posts after import.
- If you're a paying Ghost(Pro) hosting customer with a migration too large or complex for the built-in tool, Ghost offers a paid migrations team — most small blogs won't need that.

> **[📸 SCREENSHOT PLACEHOLDER]** — Ghost admin's Settings → Advanced → Import/Export panel with the WordPress migrator open
>
> _Replace this callout with the real screenshot before publishing._

## Option 3: Move to self-hosted WordPress

This is the "wordpress.com to self-hosted WordPress.org" move, or the "old, neglected self-hosted install to a fresh, modern self-hosted install" move. Either way, this is the most native pairing of any migration in this entire guide series, because you're moving WordPress content into WordPress — using the tools WordPress itself ships with.

1. Export your `.xml` file the same way described above (Tools → Export → All content).
2. On your new self-hosted WordPress site, go to **Tools → Import**.
3. Find "WordPress" in the list of importers and click **Install Now**, then **Run Importer** — this installs a small, official WordPress-maintained plugin whose only job is reading WXR files.
4. Upload your `.xml` file.
5. WordPress will ask you to assign authors (matching names from your old site to accounts on your new one) and whether to download and import attached images. Say yes to images if you want them hosted on the new site rather than pointed back at the old one.
6. Click **Submit** and let it run.

A couple of things to know:

- The default export doesn't store your images *inside* the XML file — it stores references to them, and the importer fetches the actual image files during import. Make sure your old site is still reachable while you run this step.
- If your export is very large (roughly 1,000+ posts), WordPress splits it into multiple XML files inside a zip. Import each file one at a time, in order.
- This process does **not** bring over your theme, plugins, or site design — only content. You'll set those up fresh on the new install, which is honestly the point if you're leaving an old site because it was neglected.

## Option 4: Build a custom app on your own stack

This is the path with no importer at all — you or a developer write code that reads the WXR XML file and inserts its contents into a database you built yourself.

- WXR is just XML, a structured, predictable text format. A script can open it, walk through each `<item>` (WordPress's per-post entry inside the file), and pull out the title, date, body content, and category/tag data.
- There is no dry-run and no "confirm" button here. You're responsible for validating the data yourself before it goes live.
- Redirects aren't automatic either — you'll need to build a mapping from every old URL to its new one and set that up as its own step.

If this is your path, I'd point you to my existing deploy guides for Vercel + Supabase, which cover exactly how to stand up the hosting and database side of a custom app — I won't repeat that setup here, just go build your WXR-parsing import on top of that foundation once it's live.

## Does site size change anything?

Yes, and this applies no matter which of the four destinations you pick.

- **Small blog (dozens of posts)**: this is a one-sitting job on any of the four paths. Export, import, spot-check a handful of posts, done. Redirects are simple enough to review by eye.
- **Medium site (hundreds of posts, maybe a few plugins in active use)**: still very manageable, but budget extra time for two things — reviewing how your permalink structure maps to your new site's URL shape, and checking whether any plugin-driven content (things like custom fields added by a plugin called Advanced Custom Fields, or special post types beyond regular posts/pages) actually made it through the import intact.
- **Large site (thousands of posts, years of dated permalinks, real search traffic)**: this is where I'd slow down and treat it as a small project rather than an afternoon task. A few reasons:
  - The more posts you have, the more old URLs are out there linked from other sites and bookmarked by readers — losing that traffic on a large site is a much bigger deal than on a small one.
  - Years of dated permalinks (like `/2019/03/my-post/`) mean a lot of pattern-based redirect work, not just one-off fixes.
  - If your old site ran WooCommerce (WordPress's e-commerce plugin) or any membership/subscriber system, that data is out of scope for every content importer described above — a content importer moves posts and pages, not orders, products, or paid memberships. That needs its own separate plan.
  - Fetching your old site's sitemap.xml as a safety net (available in the OYS Bulk redirects tool) matters much more here — with thousands of posts, manually checking for missed URLs isn't realistic, and an automated sitemap sweep is the only practical way to catch stragglers.

## Data governance by destination

Before you pick a destination, it's worth pausing on a question none of the "click here to import" steps above answer: once your content lands somewhere, who actually controls it?

This matters more for this guide than most, because you might be leaving **wordpress.com** — a company-run, hosted version of WordPress — for **self-hosted WordPress**, which despite sharing a name is a genuinely different arrangement. On wordpress.com, Automattic runs the server, and its Terms of Service give it broad discretion to remove content or suspend your account for policy violations, "with or without notice." Once you're self-hosting WordPress yourself, none of that applies — there's no company account sitting between you and your site anymore.

| Destination | Who controls the server & database | Could a vendor change terms or shut it down on you | Ongoing export/backup | Is the code auditable |
|---|---|---|---|---|
| **OYS** | You do. OYS is licensed software you deploy and run yourself — it isn't a hosted service someone else operates for you. | No vendor sits between you and your live site once it's deployed. | Real Postgres database you control, with content export and redirect tools built in. | You control the infrastructure and the data, but OYS's own code is licensed, not published as open source the way WordPress or Ghost are. |
| **Self-hosted Ghost** | You do — it's your server, your install. | No. | Full JSON export on demand, no proprietary lock. | Yes — Ghost is fully open source (MIT license), code is public on GitHub. |
| **Self-hosted WordPress** | You do. | No — this is the whole point of leaving wordpress.com. | Tools → Export any time; direct database access too. | Yes — WordPress core is open source (GPL), the same openness as Ghost. |
| **Custom app stack** | You do, on whatever host and database you pick underneath. | Depends entirely on the hosting/database vendor you chose — see the table below. | Only as good as the export tooling you build. | 100% — it's your own code. |

Worth naming plainly: this table is exactly why "self-hosted WordPress" and "wordpress.com" aren't the same product for the purposes of this guide, even though they share a name and an import format.

## Managed cloud vs. renting your own server: the real tradeoff

Whichever of the four destinations you pick, you'll also be choosing *where it runs* — and that's a separate decision with its own tradeoffs. I've written full deploy guides for both ends of this (my Vercel + Supabase guides for the managed path, my Hetzner + self-hosted Postgres guides for the "rent a bare server" path), but here's the short version.

| | Managed/cloud platforms (Vercel, Netlify, Railway, wordpress.com's own hosting) | Renting your own VPS (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| Who patches security updates | The platform does, automatically | You do, on your own schedule — nobody reminds you |
| Who's on call if it goes down | The platform's support/on-call team | You are |
| Cost predictability | Usage-based; can climb with traffic, bandwidth, or plan tier | Flat monthly server cost, predictable, but backups and monitoring are extra work you add yourself |
| Data portability | Generally good — standard databases, git-based deploys | Excellent — it's just files and a database on a machine you rent, but you build the export tooling |
| Technical skill required | Low to moderate | Real ops skill: SSH, firewalls, backups, patching |

If you're not comfortable with a terminal, the managed path isn't a compromise — it's the correct choice for you. Renting your own server is a good move once you specifically want that level of control, not a default upgrade everyone should aim for.

## Who this migration isn't for

I'd rather tell you this now than have you find out halfway through an import.

- **You're not comfortable following multi-step instructions without someone walking you through it live.** Every path in this guide, even the OYS one, asks you to navigate an admin dashboard, upload a file, and check the results yourself.
- **Your WordPress site is old, has a lot of plugins, or uses WooCommerce.** This is true no matter how technical you are — a WXR export only carries posts, pages, categories, tags, and comments. Plugin-specific data (custom fields, product listings, memberships, orders) isn't in that file at all, and losing it isn't a "beginner mistake," it's a structural limit of the export format itself.
- **You can't tolerate some of your site's current functionality breaking temporarily.** A DIY, single-pass import with no staging site or throwaway test account first is a real risk for anyone with a large, plugin-heavy site — not just less technical users.
- **You need commerce or membership data preserved.** None of the four paths in this guide move WooCommerce orders, products, or paid-subscriber data. If that's part of your site, this guide isn't the whole plan — it's only the content part of it.

If any of those describe your situation, it doesn't mean the migration is impossible. It means slow down, test on a copy of your site first, and don't treat this as an afternoon task.

## My verdict

> **💡 Tip — Where I land, for a beginner**

If you're not particularly technical and just want your content moved with minimal fuss, OYS's built-in WordPress importer is the cleanest option I've built into this whole hub — one file in, one preview, one confirm, and your old URLs keep working automatically. Ghost's importer is a close second and just as approachable. Moving to a fresh self-hosted WordPress install is the most "native" of all four paths, since you're using WordPress's own tools end to end. Building your own is only worth it if you're already committed to a custom product.

- **Good for a fast, low-risk move, and the strongest redirect handling:** OYS — no plugin, no API key, automatic 301s built in.
- **Good if you want to stay in the Ghost ecosystem:** Ghost's official WordPress importer, understanding it's most reliable under roughly 2,500 posts.
- **Good if you're just modernizing, not switching software:** self-hosted WordPress-to-WordPress, using WordPress's own Import/Export tools.
- **Only worth it if you're building something bespoke:** the custom-app path — otherwise it's more manual work for no benefit over the built-in importers.

## Sources
- [WordPress.com: Export WordPress Content](https://wordpress.com/support/export/)
- [WordPress.org: WordPress Importer plugin](https://wordpress.org/plugins/wordpress-importer/)
- [Learn WordPress: Tools — Import and Export](https://learn.wordpress.org/tutorial/tools-import-and-export/)
- [WordPress.com: Import a website](https://wordpress.com/support/import/)
- [Ghost Developer Docs: Migrating from WordPress](https://docs.ghost.org/migration/wordpress)
- [TryGhost/migrate on GitHub](https://github.com/TryGhost/migrate)
- [Kinsta: How to Migrate WordPress.com to WordPress.org](https://kinsta.com/blog/wordpress-com-to-wordpress-org/)
- [SmartWP: How to Migrate from WordPress.com to WordPress.org](https://smartwp.com/how-to-migrate-from-wordpress-com-to-wordpress-org/)
- [WordPress.org: About the GPL license](https://wordpress.org/about/license/)
- [Ghost Developer Docs: License](https://docs.ghost.org/license/)
- [WordPress.com Terms of Service](https://wordpress.com/tos/)
- [WordPress.com: Suspended content and sites](https://wordpress.com/support/suspended-blogs/)
