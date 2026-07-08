# Research: Fonts Front-End Pipeline Audit

## A. Font storage schema
`font_families` (`src/modules/fonts/schema.ts` lines 13–24): id, name, source ("custom"|"google"), status ("active"|"disabled").
`font_faces` (lines 26–47): familyId, mediaId (kind="font"), weight, style, displayName, unicodeRange, isVariable.
Active reference: `theme.fontFamilyId` (`theme/schema.ts` line 23). Null → fall back to built-in `theme.font` preset.

## B. Font admin UI and selection flow
- **Fonts manager** (`.../settings/fonts/page.tsx` → `FontsManager.tsx`): tabs installed/upload/google.
- **Google** (`GoogleTab.tsx`): select from curated `GOOGLE_FONTS`, choose weights/styles, `addGoogleFont` action fetches woff2 from Google CDN, stores as media, creates families+faces, `revalidateTag("theme")`.
- **Upload** (`UploadTab.tsx`): drag/drop woff2/woff/ttf/otf or zip, fontkit parses metadata, `createFamilyFromFaces`.
- **Brand editor font select** (`BrandEditor.tsx` lines 159–192): "Your fonts" + "Built-in" optgroups. Custom → sets `fontFamilyId`; built-in → null + `theme.font` preset. Save → `saveTheme` → `revalidateTag("theme")`.

## C. Font CSS var generation (`src/modules/fonts/css.ts`)
- `cssStackFor(name)` (lines 42–45): `"Name", ui-sans-serif, system-ui, -apple-system, sans-serif`. Family name validated by `FAMILY_NAME_RE`.
- `buildFontFaceCss(families, faces, urlFor)` (lines 54–92): one `@font-face` per face; URL must match `/api/media/[id].[ext]`; weight 1–1000; style normal/italic.
- `primaryPreloadUrl` (lines 99–113): first normal/400 woff2 face.

## D. Where font CSS vars / @font-face are injected
- **Root layout** (`src/app/layout.tsx` lines 61–77): `<ThemeStyle />` in `<body>`. ThemeStyle emits `<link rel="preload">` + `<style id="site-theme">` (with `--font-sans` override via `customStack`) + `<style id="site-fonts">` (@font-face).
- **Public layout** (`src/app/(public)/layout.tsx`): does NOT include ThemeStyle — **inherits from root layout** (root wraps all routes). So public pages DO get ThemeStyle.
- **Admin layouts**: also inherit root layout's ThemeStyle.
- **Editor canvas** (`PreviewChrome.tsx`): uses global CSS vars from root layout; no own font injection.
- **Theme/brand previews** (`ThemePreview.tsx`, `ThemePreviewContent.tsx`): use `themeScopeStyle` (inline style object) — **does NOT include @font-face or customStack** (see §E).

## E. Where the pipeline BREAKS — confirmed root causes

### Bug A (definite): `scope-style.ts` omits `customStack`
`src/modules/theme/scope-style.ts` line 23:
```ts
typeVars({ font: theme.font, baseSize, headingScale, leading })  // NO customStack
```
`typeVars` (`scales.ts` line 102) sets `--font-sans: t.customStack ?? FONT_STACKS[t.font]`. Without `customStack`, every scoped preview (editor canvas via the new scoping, theme library modal, brand editor preview, per-section override) resolves `--font-sans` to the built-in stack. **Custom fonts never render in any preview.** This is the concrete bug behind "fonts not translating" on the editor/preview side.

### Bug B (latent): front-end cascade-order fragility
`globals.css` → `typography.css` line 12: `:root{--font-sans: var(--font-geist-sans), system-ui, …}`.
`ThemeStyle` → `buildThemeCss`: `:root{…--font-sans: customStack…}`.
Both target `:root` (equal specificity). Source order decides. Next.js hoists the server-component `<style id="site-theme">` into `<head>`; its position relative to the bundled `globals.css` is not guaranteed. If `globals.css` lands later, the custom stack silently loses. **Fix: make `ThemeStyle`/`buildThemeCss` the single source of truth for `--font-sans`** (remove it from `typography.css`'s `:root`, always emit in `buildThemeCss` defaulting to the Geist stack).

### Bug C (minor): `@font-face`/preload in `<body>`
`<link rel="preload">` in `<body>` is valid HTML5 but discovered later than `<head>` preloads. Tier 2 cleanup.

## F. Blocks consuming --font-* vs hardcoding
- Block-level font selection via `src/blocks/common.ts` `FONT_VAR` map (lines 297–302): body/heading/display/label/mono → CSS vars. Applied in `src/blocks/renderer/style.ts` line 143.
- Many CSS modules set `font-family: var(--font-label)` / `var(--font-mono)` (tabs, flip-card, before-after, site-header, newsletter, nav-menu, toc, social-links, related-content, footer-column, cta-button, account, postlist, profile-section, project-list). **All use vars, not literal family names.** ✓
- No blocks hardcode actual font family names (e.g. "Inter"). ✓

## G. Concrete fix list
1. **`scope-style.ts`**: accept `customStack?: string | null`, forward to `typeVars`. (Tier 1)
2. **Preview callers** (`ThemePreview`, `PreviewChrome`, per-section render): fetch `getActiveFontRender(theme.fontFamilyId)` and pass `font.cssStack`. (Tier 1)
3. **`typography.css`**: remove `--font-sans`/`--font-mono` from `:root`; move into `buildThemeCss` (always emit, default to Geist stack). (Tier 1)
4. **`ThemeStyle.tsx`**: ensure `buildThemeCss` always emits `--font-sans` + `--font-mono` even when `customStack` is null. (Tier 1)
5. **Optional**: move font `<link>`/`<style>` to `<head>`. (Tier 2)
6. **Brand editor**: add a warning if `fontFamilyId` is set but family is not active / has no faces (defensive). (Tier 2)

**Most likely user-visible root cause of "fonts not translating to front-end":** Bug B (cascade order) for the public site + Bug A (scope-style) for the editor/preview. The architecture is correct; the two fixes above close the gap.
