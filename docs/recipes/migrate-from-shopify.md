# Migrate from Shopify

Shopify has **no native content importer** here, so this migration is about one
thing done well: **preserving your URLs**. Shopify's `/products/*` and
`/collections/*` addresses are indexed and linked all over the web — the bulk
mapper plus a couple of wildcard rules keep every one of them alive on the new
site.

**Easy:** URL preservation for products, collections, and pages (via Bulk
redirects + the Shopify sitemap).
**Manual / out of scope here:** importing product **data** (titles, prices,
variants, inventory). Bring those in through the store's own product tools or a
CSV into your commerce setup — that's separate from this recipe.

## Steps

### 1. Rebuild the storefront and content types

Recreate your products, collections, and pages using the platform's commerce
and content-type tools (see [add-a-content-type.md](add-a-content-type.md)).
Decide the new URL shape now — e.g. products under `/products`, collections
under `/collections` or `/shop`.

### 2. Preserve product and collection URLs

Shopify uses stable, predictable paths. In **Admin → Growth → SEO → Bulk
redirects**, add **wildcard** rules that map the whole namespace at once:

```
# keep the same product paths
/products/*      ->  /products/$1

# fold Shopify collections into your new shop path
/collections/*   ->  /shop/$1

# Shopify's nested collection+product URLs
/collections/*/products/*   ->  /products/$2
```

Each `*` captures a segment; captures substitute as `$1`, `$2`, … in the
destination. If your new product slugs match Shopify's, the first rule is an
identity-preserving pass-through and non-matching leftovers can `410`. See
[migrate-urls-and-redirects.md](migrate-urls-and-redirects.md) for the full
capture reference.

### 3. Fetch the Shopify sitemap for exact coverage

Shopify always publishes `sitemap.xml` (a sitemap index at
`https://your-store.myshopify.com/sitemap.xml`, or on your custom domain).
Paste that URL into **Bulk redirects** — the platform fetches every child
sitemap, lists every product/collection/page/blog URL, and proposes a mapping
for each: exact match to a page you rebuilt, closest match by similarity, or
`410` for anything discontinued. Review lowest-confidence first and commit as a
rollback-able batch.

### 4. Map blog and page URLs

Shopify blogs live at `/blogs/<blog>/<post>` and pages at `/pages/<slug>`. Map
them with wildcards:

```
/blogs/*/*   ->  /blog/$2
/pages/*     ->  /$1
```

### 5. Verify the sitemap

Your new `/sitemap.xml` is generated automatically. Confirm the sitemap index
lists your product/collection/page types, then submit it in Google Search
Console.

## FAQ

**Can I import my Shopify products automatically?** Not through this recipe —
there's no native Shopify content importer. Product data comes in via your
commerce setup (manual or CSV). The strength here is that **not a single URL
has to break** while you rebuild the catalog.

**What about discontinued products?** Map them to the closest live product or a
relevant collection with a redirect, or let them `410` (Gone) — a clean 410
tells search engines the page is intentionally removed, which is better than a
soft 404.

**Do I keep `/products/` or change it?** Either. Keep it to make URL
preservation a pass-through (`/products/*` → `/products/$1`); change it and the
wildcard rewrites every old link to the new base.

**My Shopify store is on a subdomain.** The sitemap fetch works with any
absolute URL; it strips each `<loc>` to a site-relative path before proposing,
so the origin in the old sitemap doesn't matter.
