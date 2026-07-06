# Migrate URLs and redirects

Moving a site to this platform has two halves: the **content** (posts, pages,
products) and the **URLs** that already rank and are already linked. Losing the
URLs loses your traffic. This platform is built to preserve them — every old
address can be pointed at its new home with a real server-side redirect, in
bulk, with a review step and a one-click rollback.

This is the anchor doc for migration. It covers the redirect system, the three
bulk-mapping inputs, the review/commit/rollback flow, the safety checks, how
nested URLs work, and the automatic sitemap. Per-platform recipes link back
here for the URL half:

- [WordPress](migrate-from-wordpress.md) · [Ghost](migrate-from-ghost.md) ·
  [Squarespace](migrate-from-squarespace.md) · [Shopify](migrate-from-shopify.md) ·
  [Webflow](migrate-from-webflow.md) · [Wix](migrate-from-wix.md)

## The redirect system

Redirects live in the SEO hub: **Admin → Growth → SEO**
(`/admin/growth/seo`). They resolve **at the edge, in the proxy, before the
page renders** — a crawler or visitor hitting an old URL gets a real HTTP
redirect, not a client-side bounce.

Each rule has a **match type** and a **kind**:

- **Match types**: `exact` (one literal path), `prefix` (everything under a
  path), `wildcard` (`/blog/*` → `/articles/$1`), and `regex`. Wildcard and
  regex rules run on a linear-time, ReDoS-safe engine (re2) — a pathological
  pattern can never hang the site.
- **Kinds**: `redirect` (status `301`, `302`, `307`, or `308`) and `gone`
  (status `410`) for URLs that are retired with no replacement.

In wildcard and regex destinations, captured segments substitute as `$1`,
`$2`, … (`:splat` also works for the first capture). So `/blog/*` →
`/articles/$1` turns `/blog/2019/hello` into `/articles/2019/hello`.

## Bulk mapping (the migration workflow)

Most migrations don't need hand-authored rules — you have a list of old URLs
and want them mapped fast. The **Bulk redirects** tab
(`/admin/growth/seo?tab=redirects-bulk`) takes any of three inputs:

1. **Pasted list** — one mapping per line, `from,to` (also `from → to`,
   `from -> to`, or tab-separated). A line with **just a `from`** and no target
   becomes a `410` (Gone) candidate. Blank lines and `#` comments are ignored.
2. **2-column CSV** — a `from,to` file. A header row (`from`, `source`,
   `old url`, …) is detected and dropped; quoted fields are handled.
3. **Your old site's `sitemap.xml` URL** — paste the URL and the platform
   fetches it, reads every `<loc>`, strips each to a site-relative path, and
   proposes a mapping for each. Works whether the file is a `<urlset>` or a
   `<sitemapindex>`.

### Review, commit, roll back

Nothing is written on input. The platform turns your rows into **proposals**,
each with a confidence and a reason:

- **exact-existing** (confidence 1.0) — the old path matches a page you already
  have, or you supplied a valid target.
- **similar** — the closest existing route above an 80% similarity threshold;
  the match percentage is shown so you can accept or correct it.
- **none-gone** — no home found; this one will `410` unless you edit it.

Proposals are sorted **least-confident first**, so you review the uncertain
rows before anything else. Edit any target inline, then commit the whole set as
**one batch**. Because the batch is tracked, you can **roll the entire
migration back** in one action if something looks wrong after go-live.

### Author-safety checks

Before a batch commits, it is validated. Some issues **block** the commit,
others are **warnings** you can proceed past:

- **Self-loop** (a source that points at itself) — blocked. Identity mappings
  (old == new after normalization) are skipped automatically, not stored.
- **Duplicate source** (the same old URL mapped twice in the batch) — blocked.
- **Redirect chain** — a chain of 2–3 hops warns; **more than 3 hops is
  blocked** (point the source straight at the final URL instead).
- **Shadowed route** (a source that matches a live page, so redirecting it
  would hide that page) — warning.
- **Dead target** (a destination that isn't a known page and isn't another
  redirect's source) — warning; it may 404.

## Nested URLs and permalink patterns

Custom content types live at a **top-level base path** (e.g. `/products`) with
an index page and detail pages. Each type has a **permalink pattern**:

- `{base}/{slug}` — flat, e.g. `/products/widget` (the default).
- `{base}/{parent_path}/{slug}` — nested, and the nesting is **unbounded**:
  `/docs/guide/getting-started/install` is fine.

Set the pattern when you create or edit the type (see
[add-a-content-type.md](add-a-content-type.md)). If you later **rename a slug
or move a page** under a different parent, the platform **auto-creates a 301**
from the old URL to the new one — you don't have to add that redirect by hand.

## The sitemap is automatic

You never hand-maintain a sitemap. `/sitemap.xml` is a **sitemap index**; each
content type gets its own **child sitemap** that updates as you add or remove
content. Large types are **chunked at 50,000 URLs per file** automatically.
`robots.txt` advertises the index, so crawlers discover everything. After a
migration, submit `/sitemap.xml` in Google Search Console and let the child
sitemaps do the rest.

## Content import

For the content half, the platform ships importers for **WordPress (WXR),
Ghost, Squarespace, Substack, Medium, RSS, and a Markdown ZIP** — reachable at
**Admin → Content → Import** (`/admin/content/import`). Each previews before
writing anything, and **auto-creates 301s from the old URLs** to the imported
pages, so for those platforms the URL half is largely done for you. For very
large sites, a resumable import pipeline handles high volumes. Platforms with
no native importer (Shopify, Webflow, Wix) still preserve URLs perfectly via
the bulk mapper and the old-sitemap fetch — see their recipes above.

## FAQ

**Do redirects work before the page exists?** The redirect resolves in the
proxy regardless of whether a page is behind it, so you can stage redirects
ahead of content. A redirect that lands nowhere real is flagged as a
dead-target warning at commit time.

**301 or 302?** Use `301` (permanent) for a real move — it passes ranking
signal and is cached by browsers. Use `302`/`307` only for temporary
redirects. The manual redirect form defaults to `301`; bulk-imported rules are
permanent by design.

**Can I roll back just part of a batch?** Rollback is per-batch — the whole
import undoes together. Commit related mappings as separate batches if you want
independent rollbacks.

**What about query strings?** Pattern rules preserve the request query string
by default. Normalization strips the query when comparing paths, so
`/x?utm=1` and `/x` are treated as the same source.
