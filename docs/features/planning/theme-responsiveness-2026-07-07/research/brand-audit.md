# Research: Brand Settings & Theme Token Pipeline

## A. Brand settings schema and storage
**There is NO separate "brand" entity.** "Brand" is a UI label for the theme editor.
- No `brand_settings` table. No `brand` namespace in `settingsSchemas`.
- Brand elements location:
  - **Colors**: `theme` table (accent, accent2, ink, paper).
  - **Fonts**: `theme` table (font, fontFamilyId) + `font_families`/`font_faces` tables.
  - **Spacing**: `theme` table (density, radius, shadow).
  - **Logo**: NOT in settings — lives in `chrome:header`/`chrome:footer` block trees (`src/blocks/logo/fields.ts`).
  - **Favicon**: `theme.faviconMediaId` (`schema.ts` line 24).
  - **Site name**: `settings` table, namespace `general` (`validation.ts` lines 24–32).

## B. Theme schema and storage
`theme` table (`schema.ts` lines 9–28): singleton (id="theme"), 12 scalars + `fontFamilyId` + `faviconMediaId` + `updatedAt`.
`theme_presets` table (`schema.ts` lines 37–48): saved themes as JSON, `source` enum (local/imported/library), `builtin` flag.

## C. Brand → theme derivation
**The pipeline is complete because brand IS theme.** Flow: `BrandEditor` → `saveTheme` action → `theme` row → `getTheme` query → `deriveTokens`/`typeVars`/`spaceVars` → `css-vars` → `ThemeStyle` → root layout. No separate brand-to-theme derivation step exists or is needed.

## D. Admin UI for brand/theme today
- **Brand editor** (`src/app/admin/(settings)/settings/brand/page.tsx` → `BrandEditor.tsx`): edits 12 scalars. Color pickers, palette presets (6), font preset/custom dropdown, base size/heading scale/leading sliders, density/radius/shadow selectors, favicon media picker, WCAG contrast panel, theme save/export/import.
- **Themes library** (`.../brand/themes/page.tsx`): grid of saved themes, library browser, preview modal, activate/duplicate/delete.
- **Fonts manager** (`.../fonts/page.tsx`): Google fonts + custom upload.

## E. System vs site settings
**Single-site platform.** No `site_id` anywhere. `theme` is singleton. `settings` is namespace-keyed JSON, global to the instance. No multi-tenant, no per-site theming. "System settings" as a platform-wide-vs-site distinction is moot today.

## F. Concrete gap list
1. **Logo disconnected from Brand screen** — settings index (`page.tsx` line 9) says "Colors, type, spacing, logo" but logo isn't editable there; it's in header/footer block trees.
2. **No separate brand entity** — cannot evolve brand independent of visual theme (brand voice, logo variations, guidelines).
3. **Favicon in theme, logo in blocks** — inconsistent brand-asset placement.
4. **No per-site theming** — singleton theme (acceptable: single-site platform).
5. **No per-page theme overrides** — `ThemeStyle` is global in root layout; `scope-style.ts` exists but only used for previews.
6. **Settings index description mismatch** — says "logo", logo not there.
7. **Site name in `general`, not brand** — brand identity split across two screens.
8. **No brand color palette separate from theme** — 4 base colors derive one-way; no reusable brand palette concept.
9. **Chrome (header/footer) not schema-linked to theme** — blocks use CSS vars but no structural link.
10. **No brand validation rules** — contrast checking is UI-only (`ContrastPanel.tsx`), not enforced at save.

**Conclusion:** The brand→theme connection is NOT broken — brand = theme. Gaps are conceptual/UI fragmentation, not pipeline bugs. Fixes are deep-links and copy, not new storage.
