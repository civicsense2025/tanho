# Data-Backed Content Types — Technical Specification

**Date:** 2026-07-07
**Status:** Phase 1 implemented; Phase 2 (guides migration) deferred

## Overview

Unify content type storage onto data-backed `ct_*` tables (one table per type,
one typed column per field) and add an "Import from DB" tool that lets the
owner register an existing database table as a content type without writing
SQL.

## Background

The platform had three storage patterns:

1. **JSON-backed** (`entries` table) — projects, guides, resources, hubs,
   platforms, matrix_pairs, block_packs, design_packs stored as opaque JSON
   in a `data` column. No DB-level constraints, no field indexing.
2. **Typed-column dedicated tables** — `pages`, `products`, `collections`
   with real typed columns + separate `block_sets` for block content.
3. **Runtime-generated `ct_*` tables** — custom types created via the admin
   UI get their own table with spine columns + one typed column per field.

The goal: eliminate pattern 1 for content types (projects, guides, resources)
by moving them to pattern 3. Pattern 2 stays for specialized types (pages,
products, collections) that need Stripe integration, custom code, SEO, etc.
The `entries` table stays for taxonomy/marketplace types (hubs, platforms,
matrix_pairs, block_packs, design_packs).

## What Was Implemented

### Phase 1: Projects and Resources → ct_* tables

**Files created:**
- `src/modules/content-schema/builtin-types.ts` — Field definitions for
  projects and resources as `FieldDef[]` arrays, plus a `BUILTIN_CT_TYPES`
  constant describing the two types (slug, name, basePath, fields).
- `seed/modules/content-types.ts` — Seed module that creates `ct_projects`
  and `ct_resources` tables at seed time via `createTableStatements()` +
  writes `custom_types` metadata rows. Idempotent.

**Files modified:**
- `src/modules/entries/router.ts` — Removed `/work/:slug` (project-detail)
  and `/resources` (resources-index) routes. Only guides routes remain
  (`/guides`, `/guides/:hub`, `/guides/:hub/:slug`). `ROUTE_TYPE` reduced
  to `{ guides: "guide" }`.
- `src/modules/entries/public/EntityRouteView.tsx` — Removed
  `project-detail` and `resources-index` cases. Only guides templates
  remain (HubsDirectory, HubList, GuideDetail).
- `src/app/(public)/[[...slug]]/page.tsx` — Updated metadata generation:
  removed `project` from the `kind` check (only `guide` → article now).
- `src/modules/custom-types/admin/TypesScreen.tsx` — Merged "Custom" and
  "Data-backed" sections into a single "Data-backed" section. Legacy
  JSON-backed types (if any) shown in a muted "Legacy" section at the
  bottom. Added "Import from DB" button next to "New data-backed type".
- `src/modules/custom-types/admin/type-catalog.ts` — Removed
  `STRUCTURED_TYPES` (projects, guides, resources). They're now data-backed
  types loaded from `custom_types` at runtime, not hardcoded in the catalog.
- `src/app/admin/(panel)/content/types/page.tsx` — Removed
  `listEntries("project"/"guide"/"resource")` queries. Counts for
  projects/resources come from the ct_* type cards, not from entries.
- `seed/neutral.ts` — Added `seedContentTypes(db)` call after
  `seedEntries(db)`.

### Phase 2: Table introspection

**Files modified:**
- `src/modules/content-schema/introspect.ts` — Added:
  - `listTables()` — Lists all tables in the platform DB, excluding
    platform system tables (pages, products, block_sets, custom_types,
    entries, settings, etc.).
  - `tableColumnInfo(tableName)` — Returns column name + type + nullability
    for a table (dialect-aware: PRAGMA on SQLite, information_schema on
    Postgres).
  - `ColumnInfo` type and `SPINE_COLUMNS` re-export.
  - `PLATFORM_TABLES` denylist constant.

### Phase 3: Import-from-DB tool

**Files created:**
- `src/modules/custom-types/admin/ImportTablePicker.tsx` — Client component
  with two-step flow: (1) list importable tables with filter, (2) review
  auto-detected field mapping with recommendations, edit labels/kinds, set
  metadata, register.

**Files modified:**
- `src/modules/content-schema/actions.ts` — Added:
  - `inferFieldKind(column)` — Maps DB column types to FieldKind (text,
    number, currency, boolean, date, url, email, color, tags, json).
    Heuristics: `is_`/`has_` prefixes → boolean, `price`/`cost`/`amount` →
    currency, `url`/`link`/`href` → url, `email` → email.
  - `listImportableTables()` — Owner-only server action that returns
    `TableCandidate[]` (table name + columns + inferred field kinds),
    excluding already-registered tables.
  - `registerExistingTable(input)` — Owner-only server action that
    registers an existing table as a content type. ALTERs in missing spine
    columns, adds field columns if missing, creates slug index, applies
    RLS on Postgres, writes `custom_types` metadata row.
  - `TableCandidate` type.
- `src/modules/custom-types/admin/types.module.css` — Added styles for
  `.tableList`, `.tableRow`, `.recommendations`, `.spineInfo`,
  `.kindSelect`.

## What Was Deferred

### Guides migration (Phase 1 extension)

Guides were NOT moved to ct_* tables because their routing is
category-field-based (`/guides/:hub/:slug`), and the ct_* path system uses
parent_id adjacency + materialized paths, not field interpolation. Moving
guides requires either:

1. **Field-based path segments** — Extend `computeRowPath()` to support
   `{field:category}` in permalink patterns, so a guide's path becomes
   `/guides/{category}/{slug}`.
2. **Custom index view** — Keep the entity router for `/guides` (hubs
   directory) and `/guides/:hub` (hub list), but read guides from
   `ct_guides` instead of entries. Let the ct_* router handle
   `/guides/:hub/:slug` detail pages.

Option 2 is simpler but creates a split-brain routing pattern. Option 1 is
cleaner but requires path system changes. Both are deferred to a follow-up.

### Entries table removal

The `entries` table stays. It's still needed for:
- `hub` — Guide categories (taxonomy)
- `platform` — Source/target platforms (taxonomy)
- `matrix_pair` — Migration roadmap pairs (taxonomy)
- `block_pack` — Marketplace block packs
- `design_pack` — Marketplace design packs

These types have specialized behaviour (marketplace federation, taxonomy
relationships) that doesn't map cleanly to the ct_* pattern. They can be
migrated individually in future phases.

### Block_sets ownership migration

Projects previously used `block_sets` with `ownerType: "entry:project"`.
Now that projects are in `ct_projects`, their blocks (if any) would use
`ownerType: "ct:projects"`. For fresh installs this is automatic (no
existing blocks to migrate). For existing installs, a migration would be
needed to update `block_sets.ownerType` from `entry:project` to
`ct:projects`. Deferred since this is a fresh-start templated install.

### Demo seed updates

The demo seed scripts (`seed/demo/demo-projects.ts`,
`seed/demo/demo-guides.ts`) still insert into the `entries` table. They
need updating to use `createRow()` from `content-schema/row-actions.ts`
for projects. Guides demo seed stays as-is (guides are still on entries).
Deferred to avoid breaking demo content during this phase.

## Architecture

### Storage

```
Before:                              After:
┌─────────────┐                     ┌─────────────┐
│   entries   │                     │   entries   │ ← hubs, platforms,
│─────────────│                     │─────────────│   matrix_pairs,
│ project     │ → JSON blob         │ hub         │   block_packs,
│ guide       │ → JSON blob         │ platform    │   design_packs
│ resource    │ → JSON blob         │ matrix_pair  │
│ hub         │                     │ block_pack  │
│ platform    │                     │ design_pack  │
│ matrix_pair │                     └─────────────┘
│ block_pack  │                     ┌─────────────┐
│ design_pack │                     │ ct_projects │ ← typed columns,
└─────────────┘                     │ ct_resources │   one per field
                                    └─────────────┘
                                    ┌─────────────┐
                                    │   pages     │ ← unchanged
                                    │  products   │
                                    │ collections │
                                    └─────────────┘
```

### Routing

```
Public route resolution order:
1. CMS page (getPublishedPage)
2. Code page (resolveCodePage)
3. Entity route (resolveEntityRoute)     ← guides only now
   /guides           → HubsDirectory
   /guides/:hub      → HubList
   /guides/:hub/:slug → GuideDetail
4. Content-type route (resolveContentTypeRoute)  ← projects + resources
   /work             → ct_projects index
   /work/:slug       → ct_projects detail
   /resources        → ct_resources index
5. Shop route (resolveShopRoute)
6. 404
```

### Import-from-DB flow

```
Owner clicks "Import from DB"
  → listImportableTables() action
    → listTables() (introspect.ts, excludes platform tables)
    → tableColumnInfo() per table
    → inferFieldKind() per column
    → Returns TableCandidate[]
  → Owner picks a table
  → Auto-detected field mapping shown with recommendations
  → Owner edits labels, kinds, metadata (name, base path, title/slug field)
  → Owner clicks "Register content type"
    → registerExistingTable() action
      → Validates fields, checks basePath collision
      → ALTERs in missing spine columns (id, slug, title, status, etc.)
      → ALTERs in missing field columns
      → Creates slug index
      → Applies RLS on Postgres
      → Writes custom_types metadata row
    → Content type appears on Content Types page
```

## Verification

- `npm run typecheck` — passes
- `npm run check:white-label` — passes
- `npx eslint` on changed files — passes
- Test failures (32) are pre-existing (confirmed by stashing changes and
  running tests with same results)

## Follow-Up Work

1. **Guides migration** — Extend ct_* path system to support field-based
   path segments, or implement custom index views for the guides directory.
2. **Demo seed updates** — Update `demo-projects.ts` to use `createRow()`.
3. **Block_sets ownership** — Migrate `entry:project` → `ct:projects` for
   existing installs (not needed for fresh installs).
4. **Per-row block editor for ct_* types** — Currently ct_* types use
   shared templates only. Adding per-row blocks would require wiring
   `block_sets` into `row-actions.ts`.
5. **Rename detection** — The ct_* schema diff can't distinguish a rename
   from a drop+add. Adding explicit oldKey→newKey mapping would prevent
   data loss on renames.
6. **Foreign key support** — Reference fields are text slugs, not real FKs.
   Adding FK constraints would improve data integrity.
