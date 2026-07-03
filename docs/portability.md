# Portability

The platform ships three portable formats so you can move themes, block packs,
and whole sites between installations without breaking either end. Every format
is a small JSON object (or tar.gz archive for whole sites) tagged with a
`format` string and a version. Import is **fail-closed** on the format tag and
**lenient** on content — an import never breaks the destination site.

| Format | Unit | File | Module |
| --- | --- | --- | --- |
| `oys-theme@1` | A theme (the ~12 color/typography scalars) | `.theme.json` | `src/modules/theme/portable.ts` |
| `oys-pack@1` | A block pack or design pack | `.pack.json` | `src/modules/blocks/packs/portable.ts` |
| `oys-site@1` | A whole site (content tables + uploads) | `.tar.gz` | `src/modules/portability/` |

## `oys-theme@1` — theme portable format

A theme is the small set of design scalars (accent color, fonts, radii, etc.)
the renderer reads. The portable form carries only those scalars — no derived
values, no media, no ids — so it's tiny and deployment-agnostic.

```ts
type PortableTheme = {
  format: "oys-theme@1";
  name: string;
  theme: ThemeInput;        // parses against themeInputSchema
  generatedAt?: number;
};
```

**Export:** `exportThemeJson(name, theme, now)` → `PortableTheme`.

**Import:** `importThemeJson(raw)` validates the format tag and parses the
payload against `themeInputSchema`. A malformed or wrong-version file is
rejected outright (never partially applied). On success the theme is stored as
a named preset (`theme_presets`); activate it to make it the live theme.

**Validation rules:**
- `format` must equal `"oys-theme@1"`.
- `theme` must parse against `themeInputSchema` (fail-closed).
- `name` is truncated to 80 chars; defaults to `"Imported theme"`.

## `oys-pack@1` — pack portable format

A pack is the unit you export, share, sell, or import. There are two kinds:

- **`block-pack`** — a single reusable block tree (a hero, a CTA stack, a
  pricing section). Stored as an `entry:block_pack`.
- **`design-pack`** — a theme plus named page block trees (a full template).
  Stored as an `entry:design_pack`.

```ts
type PortablePack = {
  format: "oys-pack@1";
  kind: "block-pack" | "design-pack";
  name: string;
  description?: string;
  author?: string;
  version: number;
  license?: string;
  blocks?: BlockNodeInput[];                       // block-pack only
  pages?: Array<{ name: string; blockTree: BlockNodeInput[] }>; // design-pack only
  theme?: ThemeInput;                              // design-pack only
  requiredBlockTypes: string[];                    // every type referenced
  requiresConfigTypes?: string[];                  // types needing reconfiguration
  excludedTypes?: string[];                        // types stripped by the allowlist
  generatedAt?: number;
};
```

### The "import never breaks the site" guarantee

Pack import uses the **lenient** validator `validatePackTree`
(`src/modules/pages/blocks-io.ts`), not the strict `validateBlockTree` used for
live page saves:

- **Unknown block types** (no compiled def on the destination install) are
  **kept** in the tree and render as a graceful `UnsupportedBlock` placeholder.
  They're recorded in `missingTypes` so the UI can warn.
- **Known types with invalid content** are **dropped** (recorded in `dropped`)
  rather than failing the whole import.
- The universal block-tree **shape** (zod `blockTreeSchema` + size cap) is
  always enforced; a malformed tree rejects the whole pack.

### Export flow

1. `exportBlockPackJson(name, blocks, meta, now)` / `exportDesignPackJson(...)`
   serialize the published tree(s).
2. The tree is run through `filterPortableBlocks()` (see
   [Portability allowlist](#portability-allowlist)) before serialization:
   - **Excluded** types are stripped and listed in `excludedTypes`.
   - **Requires-config** types are kept and listed in `requiresConfigTypes`.
3. `requiredBlockTypes` is recomputed from the filtered tree.

### Import flow

1. `importPackJson(raw)` checks the format tag, validates the universal shape
   (and the theme, for design-packs), and returns the parsed trees plus the
   exporter's `requiresConfigTypes` / `excludedTypes` diagnostics.
2. The server action (`importBlockPack` / `importDesignPack`) runs
   `validatePackTree` on each tree to normalize per-type content and collect
   `missingTypes` / `dropped`.
3. The pack is stored as a new entry. The caller surfaces
   `missingTypes` / `dropped` / `requiresConfigTypes` to the user.

### Activating a design pack

`activateDesignPack(id)` (owner-only) writes the theme to the singleton `theme`
row and creates a page per template. Pages whose route collides with an
existing page are **skipped** (not overwritten). At activation the block trees
are re-validated with the **strict** `validateBlockTree` — unknown-type
placeholders are stripped at this stage so they don't become live page content.

## `oys-site@1` — whole-site portable format

A whole-site bundle is a `tar.gz` archive:

```
manifest.json        — Manifest (format tag, version, row counts)
content.json         — { manifest, tables: { [table]: row[] } }
uploads/<storageKey> — one file per row in the `media` table
```

```ts
type Manifest = {
  format: "oys-site@1";
  version: 1;
  generatedAt: number;
  counts: Record<string, number>;
  includesPeople: boolean;
};
type SiteContent = { manifest: Manifest; tables: Record<string, unknown[]> };
```

### Table allowlist (the security boundary)

Table selection is an **allowlist**, never `SELECT *` — new schema tables are
excluded by default until deliberately opted in.

- **`CORE_TABLES`** — content tables in FK-safe write order: `settings`,
  `theme`, `themePresets`, `pages`, `blockSets`, `entries`, commerce
  (`collections` → `products` → `productVariants` → `productCollections`),
  `menus`, `forms`, `policies`, `redirects`, `profile`, `customTypes`,
  `tags` → `taggings`, `media`, `shippingZones`.
- **`PEOPLE_TABLES`** — `people`, `personActivity`, `memberships`,
  `emailSubscriptions`. Only exported when the caller opts in (`?people=1`),
  since they carry PII. Written last so person FKs resolve.
- **`EXCLUDED_TABLES`** — never exported: `orders`, `orderItems`, `disputes`,
  `stripeEvents` (financial ledger), `sessions`, `loginAttempts` (live auth),
  `auditLog` (forensic trail), `analyticsEvents` (telemetry),
  `integrationConnections` (sealed OAuth/API-key blobs), `mediaUsage`
  (derived), `users` (admin accounts stay deployment-local).

Every exported row has any `stripe*` field stripped (`/^stripe/i`).

### Export / import

- **Export:** `buildSiteExport({ includePeople, now })` reads every allowlisted
  table, strips sensitive fields, and collects the bytes for every `media` row.
  A media row whose bytes are missing from storage is skipped (content.json
  still lists it) — it never fails the export.
- **Import:** `applySiteImport(bundle, files)` upserts each table in FK-safe
  order using each table's **natural key** (`src/modules/portability/natural-keys.ts`),
  so re-running is idempotent (overwrite by key, never duplicate). Validation is
  intentionally minimal: the manifest format tag, and that every row has its
  natural-key columns populated. Files are restored into storage via
  `storage.put(key, bytes, mime)`.

## Portability allowlist

Defined in `src/modules/blocks/portability.ts`. When a pack is exported, its
block tree is run through `filterPortableBlocks()`:

- **Always safe** (`PORTABILITY_ALLOWLIST`) — pure content/layout/media with no
  site-specific dependencies. Exported verbatim, imports without configuration.
- **Requires config** (`PORTABILITY_REQUIRES_CONFIG`) — exportable, but the
  destination must reconfigure before the block works. Kept in the pack and
  flagged in `requiresConfigTypes`.
- **Excluded** (`PORTABILITY_EXCLUDED`) — never exported. Stripped from the
  tree and listed in `excludedTypes`. Currently empty; internal-ID-only blocks
  would land here.
- **Unknown types** — left untouched (the allowlist can't reason about types it
  doesn't know; they render as placeholders on the destination).

### Always safe

| Family | Types |
| --- | --- |
| Content | `heading`, `richtext`, `quote`, `code`, `callout`, `list`, `buttons`, `accordion` |
| Layout | `section`, `container`, `row`, `columns`, `spacer`, `divider` |
| Media | `image`, `gallery`, `video`, `carousel`, `embed` |
| Data (presentational) | `metric`, `table`, `chart`, `timeline`, `progress` |

### Requires configuration on import

| Family | Types | Why |
| --- | --- | --- |
| Dynamic data (bound) | `profile-header`, `project-list`, `experience-list`, `skills-list`, `award-list`, `education-list` | Resolve live CMS records per-install |
| Newsletter / membership | `paywall`, `newsletter`, `account`, `postlist` | Tied to membership tiers / subscriber state |
| Commerce | `product`, `productgrid`, `pricing`, `checkout`, `booking` | Bound to product/form records |
| Interactive | `form` | Bound to a form record |

### Excluded

None currently. The set exists so future internal-ID-only blocks can be opted
out of portable export without touching the export functions.

### API

```ts
isPortable(type): boolean        // allowlist OR requires-config
requiresConfig(type): boolean    // needs reconfiguration on import
isExcluded(type): boolean        // never exported
filterPortableBlocks(blocks): {
  portable: BlockNode[];         // excluded stripped, structure preserved
  requiresConfigTypes: string[]; // deduped
  excludedTypes: string[];       // deduped
}
```

## Admin workflows

### Blocks admin (`/admin/settings/blocks`)
The registry admin screen. The block registry is DB-backed and merges compiled
defs (`src/blocks/registry.ts`); this screen surfaces installed/known block
types and their categories. Blocks register here or they don't exist — the
picker, editor, inspector, and renderer all read from this list.

### Block Packs (`/admin/block-packs`)
- **List** — every `entry:block_pack` with its required types and source
  (imported / library / marketplace).
- **Edit** — open a pack to edit its draft block tree (lenient
  `validatePackTree` validation; unknown types kept as placeholders).
- **Publish** — copies draft → published.
- **Export** — `exportBlockPack(id)` returns a `PortablePack` for download;
  the result carries `requiresConfigTypes` / `excludedTypes` diagnostics.
- **Import** — upload a `.pack.json`; `importBlockPack` creates a new entry and
  surfaces `missingTypes` / `dropped`.

### Design Packs (`/admin/design-packs`)
- **List** — every `entry:design_pack`.
- **Export** — `exportDesignPack(id)` returns a `PortablePack` (kind
  `design-pack`) with theme + page templates and the same diagnostics.
- **Import** — upload a `.pack.json`; `importDesignPack` stores the theme +
  page templates.
- **Activate** — `activateDesignPack(id)` (owner-only) writes the theme to the
  live `theme` row and creates a page per template (route collisions skipped,
  unknown-type placeholders stripped via strict `validateBlockTree`).

### Theme library (`/admin/settings/brand/themes`)
- Save the current scalars as a named preset, activate a preset, duplicate,
  rename, delete (built-ins can't be deleted).
- **Import** a `.theme.json` (or library entry) as a new preset via
  `importTheme`; activate it to make it live.
