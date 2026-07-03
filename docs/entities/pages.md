# Pages & posts

Pages are the backbone: every public URL that isn't an entity or shop route
is a page. A **post** is a page with `kind: "post"` — same editor, same
blocks, grouped separately in admin and eligible for the newsletter/postlist
surfaces.

## Structure

Each page has two halves (the "two-save separation"):

- **Structured fields** on the `pages` row: title, slug, route, status, SEO
  fields, layout knobs, `hasPaywall` (computed at publish), parent.
- **Block tree** in `block_sets`, keyed `(page, id, draft|published)`. The
  editor autosaves the draft; **Publish** copies draft → published.

Visitors only ever read the published variant. See
[../architecture/blocks.md](../architecture/blocks.md) and
[../architecture/rendering-caching.md](../architecture/rendering-caching.md).

## Routing

The catch-all resolves a request as: redirects → page route → entity route →
shop route → 404. A page's `route` is its address; posts commonly live under
a prefix like `/p/:slug` by setting that route.

## Layout knobs

Per-page gutter, vertical padding, block spacing, and max width — named
scales, not free pixels, so pages stay on the design system's rhythm. Set
them in the editor's page settings.

## Fit it to your cause

- **A one-page site**: publish a single home page; delete the rest.
- **A blog/newsletter**: make posts (`kind: "post"`), drop a `postlist`
  block on a hub page, gate premium posts with a `paywall`.
- **Landing pages**: compose from marketing blocks (hero heading, metric,
  pricing, testimonial, CTA) — no code.

## FAQ

**Draft vs published — which does the public see?** Only published. The
editor preview and `/admin/preview` show the draft.

**How do I gate a post to members?** Add a `paywall` block where the free
preview should end — see [../architecture/paywall.md](../architecture/paywall.md).
