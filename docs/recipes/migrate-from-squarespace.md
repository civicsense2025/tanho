# Migrate from Squarespace

Squarespace content comes in through the built-in **Squarespace** importer,
which reads Squarespace's WordPress-format export and **auto-creates 301s** from
the old URLs. The main thing to reconcile is Squarespace's dated blog
permalinks, which map cleanly to a new path with one wildcard rule.

**Easy:** blog posts and pages, plus their original URLs (via the importer).
**Manual:** Squarespace's `/blog/YYYY/MM/DD/slug` permalink shape if your new
blog is flat.

## Steps

### 1. Export from Squarespace

In Squarespace, go to **Settings → Import & Export → Export** and export your
site. Squarespace produces a **WordPress-format `.xml`** file (it exports blog
pages and standard pages; some block types don't export — see FAQ).

### 2. Import the content

Go to **Admin → Content → Import** (`/admin/content/import`) and choose
**Squarespace**. Upload the `.xml`. Review the **preview**, then commit — the
importer creates the pages and **a 301 from each old URL** to its new page.

### 3. Map Squarespace's dated blog URLs

Squarespace blog posts commonly live at `/blog/YYYY/MM/DD/slug`. If your new
posts are flat under `/blog/slug`, add one **wildcard** rule in **Admin →
Growth → SEO → Bulk redirects**:

```
# /blog/2023/07/04/my-post  ->  /blog/my-post   (regex match type)
^/blog/\d{4}/\d{2}/\d{2}/([^/]+)/?$   ->   /blog/$1
```

The `([^/]+)` capture (the slug) is substituted as `$1` in the destination.
If instead you want to keep the full dated path, no rule is needed — the
importer's per-post 301s already cover it. See
[migrate-urls-and-redirects.md](migrate-urls-and-redirects.md) for the match
types and capture syntax.

### 4. Bring the rest via the old sitemap or a CSV

Squarespace publishes a `sitemap.xml`. Paste its URL into **Bulk redirects** and
the platform proposes a mapping for every old URL (exact / similar / `410`).
Alternatively, Squarespace lets you build a redirect list — export or
copy it as a `from,to` CSV and paste that instead. Review and commit as a
batch.

### 5. Verify the sitemap

Your new `/sitemap.xml` is an auto-generated sitemap index. Confirm it and
submit it in Google Search Console.

## FAQ

**Does everything export from Squarespace?** Squarespace's export covers blog
posts and standard pages but omits some content (product pages, album/gallery
blocks, some index pages). Recreate those as pages or content types, then
preserve their URLs with **Bulk redirects** + the old-sitemap fetch even though
the content itself is rebuilt.

**Squarespace uses trailing slashes.** Path comparison normalizes trailing
slashes, so `/blog/my-post/` and `/blog/my-post` are treated as the same source
— your rules match either form.

**Can I preview before committing?** Yes. The importer shows a preview and
writes nothing until you confirm; Bulk redirects shows proposals and writes
nothing until you commit the batch.
