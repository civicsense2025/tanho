# Rendering & caching

## Routing

There are no hardcoded public routes. `src/app/(public)/[[...slug]]/page.tsx`
resolves every request against the database:

1. (later) `redirects` table
2. `pages.route` — posts are pages with `kind: "post"`, so `/p/:slug`
   resolves here too
3. entity base paths — `/work/:slug`, `/guides[/:hub[/:slug]]`, `/resources`
   via `resolveEntityRoute` (see [entities.md](entities.md))
4. `notFound()`

> **Known refinement (Phase 10):** a miss renders the not-found UI with
> `<meta name="robots" content="noindex">`, but returns HTTP 200 under Cache
> Components rather than 404. SEO is safe (noindex); a true 404 status for
> monitoring/crawlers is a hardening item.

`generateMetadata` builds titles/descriptions from the page row + site
settings; robots honors both the page's `noIndex` and the site-wide
indexing toggle.

## Caching model (Next 16 Cache Components)

`cacheComponents: true` — everything is dynamic unless a query opts into
`"use cache"`. Cached queries tag themselves:

| Tag | Invalidated by |
| --- | --- |
| `theme` | Brand save |
| `settings:<ns>` | That settings screen's save |
| `pages` | Any page create/publish/delete |
| `page:<id>` | That page's publish/delete |

Admin server actions call `updateTag(...)` (immediate expiry —
read-your-own-writes) after every mutation, so the admin always sees its
change and visitors get fresh content on the next request.

Pages with a paywall set `hasPaywall` at publish and render dynamically —
gated content is never captured in a shared cache entry.

## Draft vs published

The editor autosaves the draft `block_sets` variant. Publish copies
draft → published. The public route reads *only* the published variant, so
work-in-progress never leaks; the admin preview renders the draft with the
same block walker.

## FAQ

**Why is my page still stale after editing content directly in the DB?**
Cache tags only invalidate through the actions. Either save through the
admin or restart the dev server.

**What makes a page dynamic?** A paywall (`hasPaywall`), or reading
cookies/session anywhere in its tree — everything else stays cached until
its tag is invalidated.
