# Migrate from WordPress

WordPress is the smoothest migration: content comes in through the built-in
**WXR** importer, which reads WordPress's native export file and **auto-creates
301s** from the old URLs. The only manual part is reconciling permalink
structures that don't line up one-to-one — handled with a single wildcard
redirect.

**Easy:** posts, pages, and their original URLs (via the importer).
**Manual:** date-based or category-based permalinks that map to a different
shape on the new site.

## Steps

### 1. Export from WordPress

In WordPress admin, go to **Tools → Export → All content** and download the
`.xml` file (this is the WXR format).

### 2. Import the content

Go to **Admin → Content → Import** (`/admin/content/import`) and choose
**WordPress**. Upload the `.xml` file. You get a **preview** of what will be
created — nothing is written until you confirm. On commit, the importer brings
in the posts/pages and **auto-creates a 301 from each old URL** to its new
page.

### 3. Handle permalink-structure differences

WordPress often uses a dated permalink like `/2019/03/my-post/`. If your new
posts live under a flat path like `/blog/my-post`, the per-post 301s from the
importer already cover the imported set — but for anything the importer didn't
catch (old feeds, category archives, hand-built links), add one rule in
**Admin → Growth → SEO → Bulk redirects**. For a whole folder that moved, a
**wildcard** (`*` captures the rest of the path as `$1`) is enough:

```
# everything under the old /articles/ folder → /blog/
/articles/*  ->  /blog/$1   (wildcard match type)
```

Dated WordPress permalinks like `/2019/03/my-post/` need a **regex** to pull
just the slug out from between the date segments:

```
# /2019/03/my-post/  ->  /blog/my-post   (regex match type)
^/\d{4}/\d{2}/([^/]+)/?$   ->   /blog/$1
```

The capture (`$1`) is substituted into the destination. (Wildcards understand
`*` and `:name`; anything more precise — like matching only 4-digit years — is a
regex.) See
[migrate-urls-and-redirects.md](migrate-urls-and-redirects.md) for the full
match-type and capture reference.

### 4. Catch the long tail with the old sitemap

To be sure nothing is missed, open **Bulk redirects** again and paste your old
site's `sitemap.xml` URL (WordPress exposes one, often at `/sitemap.xml` or via
Yoast/RankMath). The platform fetches it and proposes a mapping for every old
URL — exact matches to your imported pages, close matches by similarity, and
`410` for anything with no home. Review lowest-confidence first, then commit as
a batch (rollback-able).

### 5. Verify the sitemap

Your new `/sitemap.xml` is generated automatically as a sitemap index. Confirm
it lists a child sitemap per content type, then submit it in Google Search
Console.

## FAQ

**Do I need a WordPress plugin to migrate?** No. The built-in WXR importer
reads the standard **Tools → Export** file. No plugin, no API keys.

**Will my redirects from Yoast/RankMath carry over?** Not directly, but you
don't need them — the importer's per-post 301s plus the old-sitemap bulk fetch
reconstruct the same coverage. If you have an exported redirect list, paste it
as a `from,to` CSV in Bulk redirects.

**What about `/category/*` and `/tag/*` archives?** If you don't recreate those
archives, map them with a wildcard (e.g. `/category/*` → `/blog`) or let them
`410`. Both are one line in Bulk redirects.

**My images are hotlinked to the old domain.** The importer brings post content
in; re-hosting media is separate. Point old media URLs at their new location
with a `prefix` redirect if you keep the same paths.
