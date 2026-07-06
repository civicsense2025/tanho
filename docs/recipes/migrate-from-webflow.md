# Migrate from Webflow

Webflow has **no native content importer** here. The migration is a two-part
job: **recreate the content** (exporting CMS collections as CSV where you can),
and **preserve every URL** with the bulk mapper and Webflow's sitemap. The URL
side is where this platform shines — nothing indexed has to break.

**Easy:** URL preservation for every page and CMS item (via Bulk redirects +
the Webflow sitemap).
**Manual:** recreating content — CMS collections come out as CSV; static pages
are rebuilt with blocks.

## Steps

### 1. Export what Webflow lets you

- **CMS collections**: in Webflow, open a collection and use **Export** to get a
  **CSV** of its items. Keep the column that holds each item's slug/URL.
- **Static pages**: Webflow's HTML export gives you markup for reference, but
  you'll rebuild these as pages with the block editor.

### 2. Recreate content types and pages

For each CMS collection, create a matching **content type**
(see [add-a-content-type.md](add-a-content-type.md)) and import its rows, or
recreate the entries. Rebuild static pages with blocks. Choose your new URL
shape as you go — a collection typically becomes a base path like `/blog` or
`/projects`.

### 3. Preserve URLs with the old sitemap

Webflow publishes `sitemap.xml` on your site. Paste its URL into **Admin →
Growth → SEO → Bulk redirects**. The platform fetches it, reads every `<loc>`,
and proposes a mapping for each old URL — exact match to a page you rebuilt,
closest match by similarity, or `410` for anything dropped. Review
lowest-confidence first, then commit as a rollback-able batch.

### 4. Map collection-path patterns

Webflow CMS URLs follow `/<collection-slug>/<item-slug>`. If your new base path
differs, one **wildcard** rule remaps the whole collection in **Bulk
redirects**:

```
# Webflow collection  ->  new base path
/posts/*      ->  /blog/$1
/projects/*   ->  /work/$1
```

The `*` capture substitutes as `$1` in the destination. See
[migrate-urls-and-redirects.md](migrate-urls-and-redirects.md) for the full
match-type and capture reference.

### 5. Verify the sitemap

Your new `/sitemap.xml` is generated automatically as a sitemap index — one
child sitemap per content type, updating as you add items. Confirm it and
submit it in Google Search Console.

## FAQ

**Is there a Webflow importer?** No native one. Content is brought in via CSV
export (CMS) and rebuilding (static pages); **URLs** are preserved with the bulk
mapper and the sitemap fetch — so search rankings and inbound links survive even
though the content is recreated.

**Webflow put my blog under a collection slug I don't want.** Change the base
path on the new content type and add a `/<old-slug>/*` → `/<new-base>/$1`
wildcard. Every old CMS URL then redirects to the new structure.

**Can I keep unbounded nested paths?** Yes — set the content type's permalink
pattern to `{base}/{parent_path}/{slug}` for arbitrary depth. See
[migrate-urls-and-redirects.md](migrate-urls-and-redirects.md#nested-urls-and-permalink-patterns).

**What about my Webflow redirects?** If you have them listed, paste them as a
`from,to` CSV into Bulk redirects; otherwise the old-sitemap fetch reconstructs
the coverage.
