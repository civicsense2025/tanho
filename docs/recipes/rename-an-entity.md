# Rename an entity

Say you want "Guides" to be "Recipes", or "Projects" to be "Case studies".
The content type stays the same; only its labels and routes change.

## What's a label vs. what's structural

- **Labels** (what visitors and admins read) live in the entity's schema
  file under `src/entities/schemas/<entity>.ts` — `label`, `plural`, and the
  `basePath` that sets its public URL.
- **Slugs and content** are data in the `entries` table — unaffected by a
  rename.

## Steps

1. Open `src/entities/schemas/guide.ts` (for example) and change `label`,
   `plural`, and `basePath` (e.g. `/guides` → `/recipes`).
2. If you changed `basePath`, add a redirect (**Admin → Content →
   Redirects**) from the old path to the new one so existing links survive.
3. Update the public template copy if it hardcodes the word (most templates
   read the label; a few section headings may not).
4. `npm run typecheck` and click through the admin + public routes.

For a heavier change — different fields, not just a name — you're really
adding a content type; see [add-a-content-type.md](add-a-content-type.md).

## FAQ

**Will existing entries break?** No. They're keyed by `(type, slug)`; the
rename only affects display labels and (optionally) the URL prefix.

**Can non-developers do this?** The label/route change is a code edit today.
For fully no-code content types, use the custom-type builder in **Admin →
Content → Content types** instead.
