# Migrate from Wix

Wix has **no native content importer** here, and Wix's content export is
limited — so, as with Webflow and Shopify, the migration centers on **URL
preservation**. Wix's `/post/*` blog URLs and other indexed paths all carry
over to the new site through the bulk mapper and Wix's sitemap.

**Easy:** URL preservation for blog posts and pages (via Bulk redirects + the
Wix sitemap).
**Manual:** getting the content out — Wix exports little cleanly, so most pages
are rebuilt with blocks; blog text can be copied or pulled via RSS.

## Steps

### 1. Get what content you can out of Wix

- **Blog**: Wix exposes an RSS feed (commonly `/blog-feed.xml` or
  `/feed.xml`). You can bring recent posts in through the built-in **RSS**
  importer at **Admin → Content → Import** (`/admin/content/import`) — note RSS
  feeds usually carry only the latest N posts, not the full archive.
- **Pages**: rebuild with the block editor. Wix's site export is not a portable
  content format, so plan to recreate static pages.

### 2. Recreate content and choose URLs

Rebuild pages and set up any content types you need
(see [add-a-content-type.md](add-a-content-type.md)). Decide the new URL shape —
e.g. blog posts under `/blog`.

### 3. Preserve URLs with the old sitemap

Wix publishes `sitemap.xml`. Paste its URL into **Admin → Growth → SEO → Bulk
redirects**. The platform fetches every `<loc>` and proposes a mapping per old
URL — exact match to a rebuilt page, closest match by similarity, or `410` for
anything dropped. Review lowest-confidence first, then commit as a rollback-able
batch.

### 4. Map Wix's URL patterns

Wix blog posts live at `/post/<slug>`. If your new posts are under `/blog`, one
**wildcard** rule remaps them all in **Bulk redirects**:

```
# Wix blog  ->  new blog path
/post/*   ->  /blog/$1
```

Wix also uses `/<slug>` for pages; map any that changed with an `exact` or
`prefix` rule. The `*` capture substitutes as `$1`. See
[migrate-urls-and-redirects.md](migrate-urls-and-redirects.md) for the full
match-type and capture reference.

### 5. Verify the sitemap

Your new `/sitemap.xml` is generated automatically as a sitemap index. Confirm
it and submit it in Google Search Console.

## FAQ

**Is there a Wix importer?** No native one. The **RSS** importer can pull recent
blog posts (and auto-creates 301s for those); everything else is rebuilt, with
**URLs** preserved via the bulk mapper and the sitemap fetch.

**RSS only gave me the last 10 posts.** That's a feed limit, not a platform
limit. For the older archive, copy the content into pages/entries and map their
old `/post/*` URLs with the wildcard above so no link 404s.

**Wix URLs sometimes have query parameters.** Path comparison strips the query
before matching, so `/post/x?referrer=…` maps as `/post/x`. Pattern rules also
preserve the query on the target by default.

**Can I roll back if a batch looks wrong?** Yes — each Bulk-redirects commit is
one batch and can be rolled back in a single action.
