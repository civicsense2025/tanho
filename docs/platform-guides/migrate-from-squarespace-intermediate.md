---
title: "Migrate off Squarespace (Intermediate guide)"
tagline: "Tools, verified processes, and gaps for moving to Ghost, WordPress, OYS, or a custom stack"
category: own-your-stack
source_platform: squarespace
difficulty: intermediate
cost_range_usd: "0-45/mo"
tags: ["migration", "website-builder", "squarespace"]
level: intermediate
status: PUBLISHED
last_verified: 2026-07-07
skills_required:
  - "Comfortable following multi-step technical workflows across platforms"
  - "Can install and configure a WordPress plugin (e.g. Auto Upload Images)"
  - "Able to check Google Search Console or site analytics for top pages"
  - "Comfortable evaluating managed-hosting vs. self-hosting tradeoffs"
  - "Can verify redirect coverage against real traffic data before cutover"
requirements:
  - "Confirmed Squarespace version (7.0 XML export or a 7.1 crawl/rebuild plan)"
  - "Access to Google Search Console or Squarespace analytics for top-traffic pages"
  - "Admin access to your chosen destination (Ghost, WordPress, or OYS) plus a hosting decision"
  - "A few hours to a weekend or two, depending on site size, for manual rebuild work"
  - "A list of your highest-traffic URLs to check against your new redirect map"
effort_hours_min: 6
effort_hours_max: 30
---

# Migrate off Squarespace (Intermediate guide)

This is the mechanics guide — the one that assumes you've already read my Squarespace evaluation piece (or know the gist: the export is an incomplete WordPress-format XML that skips images, CSS, and store pages) and just want the actual, verified steps for getting off the platform. I'm covering four destinations: Ghost, WordPress, my own platform (OYS), and a fully custom app.

The one fact that governs everything below: Squarespace's export is a WXR-style (WordPress-compatible) XML file containing blog posts and standard pages only. No destination-side tool gets around what isn't in that file. Every option here inherits the same blind spots — you're choosing how smoothly the *covered* content moves, not escaping the gaps.

## Blocking check: 7.0 vs. 7.1

Do this before evaluating any destination:

- **7.0 sites** can generate the XML export (Settings → Import & Export → Export).
- **7.1 sites — the current default — cannot export XML at all.** There's no setting, no workaround inside Squarespace's dashboard; the feature simply isn't present on 7.1.
- On 7.1, every "upload the XML" workflow below is unavailable. Your paths are: a live-site crawl/scrape (a tool or script that visits every page and saves what's rendered), manual copy-paste reconstruction, or a paid migration service that handles the scraping for you.
- Confirm your version under Settings before doing anything else — it changes the entire shape of the migration, more than which destination you pick.

## Destination 1: Ghost

Ghost ships a purpose-built Squarespace migrator, not a generic importer repurposed for the job.

- **Where it lives**: Ghost Admin → Settings → Advanced → Import/Export.
- **Flow**: enter your Squarespace site URL, Ghost routes you to Squarespace's own export screen, you download the XML, then upload it back into the Ghost migrator. Ghost previews post/page counts before you commit.
- **Category → tag mapping**: Squarespace categories convert to Ghost tags automatically; a post's first category becomes its Ghost primary tag.
- **What it actually imports**: post/page body content, titles, publish dates, authors.
- **What it doesn't**: images consistently come across broken or not at all — multiple migration write-ups and Ghost's own forum confirm posts frequently retain `<img>` tags pointing back at Squarespace's CDN rather than downloading and re-hosting the files. Budget a manual image pass. Design/CSS obviously isn't touched (you're picking a Ghost theme separately). Gallery, portfolio, and store pages are outside the XML's scope, same as every other destination here.
- **Redirects**: Ghost's docs point to a documented set of common Squarespace redirect rules (their tutorial on implementing redirects has a dedicated Squarespace section) rather than auto-generating them the way OYS's importer does — plan to set these up separately.
- **Beyond the built-in tool**: Ghost publishes `@tryghost/migrate`, an open-source CLI toolkit (includes an `@tryghost/mg-squarespace-xml` package specifically) for larger or non-standard migrations. If you're self-hosting Ghost or need more control than the Admin UI migrator offers, this is the path — usage is `migrate squarespace <path-to-xml>` with source-specific flags documented via `--help`. Ghost(Pro) customers can also get white-glove migration support from Ghost's own team for complex cases.

## Destination 2: WordPress

Worth stating plainly: this is probably the least friction of the three CMS-style destinations, because Squarespace's export file is already built in WordPress's WXR format. You're not converting formats — you're importing a file into the system whose format it already mimics.

- **Export**: same Squarespace XML (Settings → Import & Export → Export).
- **Import**: WordPress admin → Tools → Import → WordPress. If the WordPress Importer plugin isn't already installed, WordPress prompts you to install and activate it inline. Upload the XML, run the import — posts, pages, authors, and dates map over cleanly since the schema already matches.
- **Images**: not included in the XML (same gap as everywhere), but because WordPress has the largest plugin ecosystem of any destination here, there's a direct fix: plugins like Auto Upload Images scan imported post content for external image URLs (the ones still pointing at Squarespace), fetch them, and re-host them in your WordPress media library automatically, rewriting the URLs in the post body as it goes. This is meaningfully less manual work than the equivalent step on Ghost or OYS today.
- **What's still excluded**: gallery blocks, product/store pages, form submissions, member-area content, scheduling/booking data — none of this rides in the XML regardless of destination.
- **SEO metadata**: structured data (schema.org markup) and page-level meta descriptions don't survive the export either; plan a manual re-entry pass using whatever SEO plugin you choose (Yoast, Rank Math, etc.).

## Destination 3: Own Your Site (OYS)

OYS has a dedicated Squarespace importer registered in the platform's own importer system, purpose-built for this migration rather than a generic XML uploader.

- **Mechanism**: reads the same WordPress-format XML export, same as Ghost and WordPress above.
- **The differentiator**: it auto-creates 301 redirects from every old Squarespace URL to its corresponding new page as part of the import — you don't set these up as a separate step for anything the importer actually processed.
- **Scope**: posts and pages only. Does not touch images, CSS/design, gallery/portfolio pages, store pages, or digital products — this matches Squarespace's own export gaps exactly, since it's reading the same limited file.
- **7.1 sites**: not supported by the importer at all, for the same root reason as every other destination — no XML to read. OYS's separate "Bulk redirects" tool (Admin → Growth → SEO → Bulk redirects) can fetch your old `sitemap.xml` and propose URL mappings, which is useful both as a catch-all for anything the importer missed on 7.0 and as your primary redirect-building tool if you're on 7.1 and rebuilding by hand.
- **Squarespace's dated blog URLs**: if your old blog posts live at `/blog/YYYY/MM/DD/slug` and your new site uses flat `/blog/slug` paths, a single wildcard rule in Bulk redirects handles the whole pattern at once rather than mapping every post individually.

## Destination 4: A custom app stack

For a fully custom build, there's no "importer" — you write (or your developer writes) a script that parses the Squarespace XML programmatically and maps it into whatever schema your app uses. At the intermediate level, the shape of that work is:

- Parse the XML with a standard XML/RSS library (it's WXR format, so any WordPress-XML-aware parser works as a starting point even outside WordPress itself).
- Extract post/page body, title, slug, publish date, and author from each `<item>` node.
- Separately handle image URLs referenced inside post bodies — same re-hosting problem as WordPress/Ghost, just without a plugin to do it for you.
- Store/product data isn't in this file at all — that's a separate export or manual rebuild regardless of stack.

For where to actually host the resulting app, see my Vercel + Supabase deploy guides — that's the hosting and database side; this guide only covers getting content out of Squarespace and into a shape your app can use.

## Site-size considerations across all four destinations

- **Small site (a few dozen pages, no commerce)**: the gaps above are annoyances, not blockers. Expect a few hours of manual image re-upload and page rebuilding regardless of which destination you pick.
- **Medium site (blog + some commerce, moderate traffic)**: now the store-page gap actually costs you something — none of the four importers touch commerce data, so your product catalog needs a separate migration path no matter where you land. Redirect coverage also starts to matter more; verify the importer (or Bulk redirects, on OYS) actually caught your highest-traffic pages, don't just assume full coverage.
- **Large site (active store, real order history, high search-traffic dependency)**: treat commerce migration as an entirely separate project from content migration — order history and product catalogs need dedicated ecommerce migration tooling or a custom export, since literally none of the four content paths above move that data. Redirect thoroughness stops being a nice-to-have here: incomplete 301 coverage on a high-traffic site risks a real, measurable drop in search rankings while Google re-indexes broken paths. Audit your redirect coverage against your actual top-traffic-page list (from Squarespace or Google Search Console) before cutting over, not after.
- **Regardless of size**: confirm 7.0 vs. 7.1 status first. A large 7.1 store has a fundamentally harder migration than a small 7.0 site, independent of commerce complexity.

## Data governance by destination

Worth separating clearly, since "own your content" and "control your infrastructure" are two different guarantees, and not every destination gives you both.

| Destination | Server/database control | Third-party vendor risk | Export/backup process | Code auditability |
|---|---|---|---|---|
| **OYS** | Full — it's licensed, self-hosted software; you deploy it to infrastructure you choose (a VPS, your own server), not a service OYS operates for you | None from OYS itself, since there's no OYS-run hosting layer in the loop; your actual exposure is whatever host you pick for the VPS | Direct database access (Postgres/Turso depending on your deploy path) — dump it whenever you want, no export request or rate limit | You hold the deployed code and can read it directly; it's not yet released under an open-source license the way Ghost and WordPress are, so "audit" here means your own review, not a public community's |
| **Self-hosted Ghost** | Full — same self-hosted model | None — no Ghost-run service involved for the self-hosted path | Built-in JSON export (Settings → Advanced → Import/Export) plus direct DB access | Yes — MIT-licensed, source public on GitHub, widely reviewed |
| **Self-hosted WordPress** | Full — same self-hosted model | None — no Automattic/WordPress.com account involved | Built-in WXR export (Tools → Export) anytime, plus direct DB access; broadest plugin ecosystem for automating this further | Yes — GPLv2, arguably the most-audited CMS codebase that exists given its market share |
| **Custom app stack** | Depends on your hosting choice, not the app code itself — pairing with a managed platform (Vercel + Supabase, per my deploy guides) means that vendor controls the infrastructure layer even though you wrote and own the application code | Real, if you're on a managed platform — that vendor's terms and pricing can change; your code is portable, but re-platforming still takes engineering time | Depends on your database choice, but direct SQL access either way — no export request process to wait on | Yes for your own code; the honest caveat is that "custom" doesn't mean "reviewed" — you're relying on your own or your developer's diligence, not a large open-source community |

The pattern across all four: none of these lock your *data* behind a vendor. What changes is whether a vendor also controls the *infrastructure layer* your data sits on, and whether that vendor's decisions — pricing changes, policy changes, shutting down a product tier — become your problem later.

## Managed cloud vs. renting your own server: the real tradeoff

Whichever destination you land on, if it's self-hosted (OYS, Ghost, WordPress) or fully custom, you'll face this same decision at the infrastructure layer: pay a managed platform to abstract the server away, or rent a server and run it yourself.

| | Managed/cloud (Vercel, Netlify, Railway) | Self-managed VPS (Hetzner, a DigitalOcean Droplet) |
|---|---|---|
| **Security patching** | Handled by the platform at the OS/runtime layer — you patch your own dependencies, they patch everything underneath | Entirely on you — OS packages, runtime versions, and any exposed service need your own patch cadence |
| **On-call when it goes down** | The platform's team responds to infrastructure-level outages; app-level issues (a bad deploy, a runaway query) are still yours to catch | You, exclusively, unless you've set up your own alerting and have someone available to respond |
| **Cost predictability** | Usage-based — cheap at low traffic, but bandwidth, function-invocation, and seat costs can scale unpredictably as you grow | Flat monthly fee for the box regardless of traffic, which is more predictable, but doesn't include the value of your own maintenance time |
| **Data portability** | Generally good at the app layer since most of these are standard Node/static hosts; your database is frequently a separate managed service with its own export path | Highest of the two — a full disk snapshot or DB dump moves cleanly to any other VPS provider, no vendor-specific export format |
| **Technical skill required** | Low to moderate — git push and the platform handles routing, TLS, and scaling | Moderate to high — comfortable with SSH, a Linux package manager, firewall rules, and reading server logs when something breaks at 2 a.m. |

See my deploy-on-vercel-and-supabase guides for the managed path in full detail, and my deploy-on-hetzner-self-hosted-postgres guides for the self-managed path — including why I mark that one "advanced" territory regardless of how comfortable you are with the CMS side of a migration.

## Who this migration isn't for

Being direct about the honest limits here, because "verified steps" doesn't mean "easy for everyone":

- **7.1 sites past a trivial page count.** No export means no scripted or tool-assisted path — you're crawling the live site or rebuilding by hand. If you don't already have a plan for that (a scraping tool you trust, or hours to spend), the destination-by-destination steps in this guide don't apply to you yet.
- **Active stores with real order history**, regardless of which destination you're aiming for. All four paths here share the identical commerce gap. Migrating orders, inventory, and customer purchase history is a distinct project with its own tooling — treat it that way rather than assuming your CMS migration and your commerce migration happen at the same time.
- **Anyone not planning to verify redirects against real traffic data.** A "successful" import that leaves your top 20 search-referred pages 404ing isn't actually a successful migration — it's a slow-motion SEO loss. If you're not going to check Search Console or Squarespace analytics against your new redirect map before cutover, you're not ready to cut over yet, independent of how good your technical skills are otherwise.

Technical skill, honestly assessed per destination:

| Destination | Skill actually required | Who should attempt this without help |
|---|---|---|
| Ghost | Comfortable with admin settings UIs; light familiarity with themes if you want anything beyond a default look | Anyone who can follow a settings-menu tutorial |
| WordPress | Same as Ghost, plus comfort installing and activating plugins | Anyone who's installed a browser extension or app before |
| OYS | Comfortable with an admin panel; redirect tooling is UI-driven | Anyone who can read a settings screen carefully |
| Custom app | Requires a developer — parsing XML, rewriting image URLs, and building redirect logic is a coding task, not a settings task | Don't attempt without either being a developer yourself or hiring one |

If none of the rows above describe you and you still want a specific destination, that's a signal to hire the work out for that step rather than push through — the failure mode on a bad DIY migration (broken images live on your new site, 404s where your best content used to rank) is worse than paying for help up front.

## Where I land

If you're choosing on friction alone: WordPress's native import is the smoothest of the three CMS paths today, purely because the file formats already agree with each other. Ghost's built-in migrator is close behind and arguably nicer for a writing-focused site, but expect to hand-fix images. OYS gets you the redirect automation without extra tooling, at the cost of being a newer platform than the other two. None of that matters if you're running an active store — in that case, budget the commerce migration as its own project before you even think about which blogging platform to land on.

## Sources
- [Squarespace: Exporting your site](https://support.squarespace.com/hc/en-us/articles/206566687-Exporting-your-site)
- [Ghost Developer Docs: Migrating from Squarespace](https://docs.ghost.org/migration/squarespace)
- [Ghost: open-source migration tools (TryGhost/migrate)](https://github.com/TryGhost/migrate)
- [@tryghost/mg-squarespace-xml package](https://www.npmjs.com/package/@tryghost/mg-squarespace-xml)
- [Ghost Forum: Importing images from Squarespace Blog](https://forum.ghost.org/t/importing-images-from-squarespace-blog/55719)
- [Ghost tutorial: implementing redirects (Squarespace section)](https://ghost.org/tutorials/implementing-redirects/)
- [WordPress.com Support: Import from Squarespace](https://wordpress.com/support/import/import-from-squarespace/)
- [WPBeginner: How to Properly Move from Squarespace to WordPress](https://www.wpbeginner.com/wp-tutorials/how-to-properly-move-from-squarespace-to-wordpress/)
- [Ghost Developer Docs: Hosting Ghost](https://docs.ghost.org/hosting)
- [Ghost (blogging platform) — Wikipedia](https://en.wikipedia.org/wiki/Ghost_(blogging_platform))
- [WordPress.org: License](https://wordpress.org/about/license/)
