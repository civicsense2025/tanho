# Migrate from Ghost

Ghost is a clean migration: content comes in through the built-in **Ghost**
importer, which reads Ghost's native JSON export and **auto-creates 301s** from
the old URLs. In most cases that's the whole job — you only reach for the bulk
mapper to mop up anything the export didn't cover.

**Easy:** posts, pages, and their original URLs (via the importer).
**Manual:** almost nothing — occasional tag/author archive URLs or a changed
base path.

## Steps

### 1. Export from Ghost

In Ghost admin, go to **Settings → Migration → Export** and download the
`.json` file. (Members and images are separate exports in Ghost; this recipe
covers posts and pages.)

### 2. Import the content

Go to **Admin → Content → Import** (`/admin/content/import`) and choose
**Ghost**. Upload the `.json`. Review the **preview** — nothing is written until
you confirm. On commit, the importer creates the posts/pages and **a 301 from
each old URL** to its new page.

### 3. Mop up remaining URLs

The importer covers your posts and pages. For anything left — old RSS
subscribers, tag/author archives, or a base path you changed — open **Admin →
Growth → SEO → Bulk redirects** and either:

- paste your old Ghost `sitemap.xml` URL (Ghost publishes one) and let the
  platform propose mappings for every old URL, or
- add a **wildcard** rule for a whole namespace, e.g.:

```
# Ghost tag archives  ->  your blog
/tag/*   ->  /blog

# author pages  ->  an about page
/author/*   ->  /about
```

Captures substitute as `$1`, `$2`, … in the destination. See
[migrate-urls-and-redirects.md](migrate-urls-and-redirects.md) for the full
match-type and capture reference.

### 4. Verify the sitemap

Your new `/sitemap.xml` is generated automatically as a sitemap index — one
child sitemap per content type. Confirm it and submit it in Google Search
Console.

## FAQ

**Does the Ghost importer bring images and members?** It brings post and page
content and creates the per-URL 301s. Images and members are separate exports
in Ghost and are handled outside this importer — re-host media and import
members through your membership setup if needed.

**My Ghost blog was at the site root, not `/blog`.** If you keep posts at the
root, the importer's per-post 301s are identity-preserving and no extra rule is
needed. If you move them under `/blog`, add `/` -level wildcards in Bulk
redirects to remap the old root URLs.

**Can I preview before committing?** Yes — the importer previews and writes
nothing until you confirm; Bulk redirects shows proposals and writes nothing
until you commit the batch (which is rollback-able).
