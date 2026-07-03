# Entities

Beyond free-form pages, the platform has **structured content types** —
projects, guides, resources, and the guide taxonomy (hubs, platforms,
migration pairings). They share one storage table and one schema registry,
so adding a type is a schema, not a subsystem.

## The registry

`src/entities/registry.ts` holds an `EntitySchema` per type:

```
{ entity, label, plural, basePath, dataSchema (zod), listColumns, titleKey }
```

Built-ins live in `src/entities/schemas/*.ts`. Every entity's structured
fields validate against its `dataSchema` on write; unknown/invalid data is
rejected before it reaches the database.

## Storage

All structured rows live in one `entries` table: `(type, slug)` unique,
plus a JSON `data` column shaped by the entity schema. Each entry can also
have **page content** — a block tree stored in the shared `block_sets`
table under `ownerType = "entry:<type>"`, edited in the same page editor
and following the same draft/publish model as pages.

## Public routing

`src/modules/entries/router.ts` exports `resolveEntityRoute(route)`, which
the public catch-all calls after trying pages:

| Route | Renders |
| --- | --- |
| `/work/:slug` | Project detail |
| `/guides` | Hub directory |
| `/guides/:hub` | Guides in a hub |
| `/guides/:hub/:slug` | Guide detail |
| `/resources` | Public resource index |

Visibility is enforced **in the query**, never the UI: only `published`
entries resolve, resources require `is_public`, and a resource's
`internal_notes` never enters a public payload.

## Bound blocks

Blocks like `profile-header`, `project-list`, and the résumé lists are
`bound: true` — they carry no content of their own, they *resolve* CMS data
server-side. The block walker awaits `def.resolve()` and passes the result
to the pure `Render`. On the editor canvas they show a "Live" placeholder
(no client fetch). See [blocks.md](blocks.md).

## Custom types

Owners can define their own content types (`custom_types` table): a field
list of 16 kinds (text, number, reference, repeater, …) that
`buildZodForFields` turns into a live validation schema. Field keys reject
prototype-pollution names, and repeaters are depth-capped.

## Fit it to your cause

- **Rename a type** (Guides → Recipes): the label/plural/basePath live in
  its schema file; the slug taxonomy is data. See
  [../recipes/rename-an-entity.md](../recipes/rename-an-entity.md).
- **Add a type**: register an `EntitySchema`, or build one in the admin with
  the custom-type builder. See [entities/](../entities/) per-type guides.

## FAQ

**Where does an entry's prose live — in `data` or in blocks?** Short
structured fields (tagline, year, difficulty) are `data`; long-form body
content is a block tree in `block_sets`. That's why a guide has both a
metadata form and a page editor.

**Why didn't my direct DB edit show up?** Public entity queries are cached
by tag; the admin actions call `updateTag`. Editing the DB directly bypasses
that — save through the admin or restart the dev server.
