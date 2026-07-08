# Theme Responsiveness Across Admin, Editor & Front-End

**Status:** Planning · **Date:** 2026-07-07 · **Owner:** Tan · **Branch target:** `feat/block-style-layer`

## 1. Executive summary

The platform already has a well-architected, token-driven theme engine: brand scalars (4 colors + 8 type/spacing values) derive into 18 semantic CSS custom properties for **both** light and dark modes, and `ThemeStyle` already emits `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` blocks. ~85–90% of content blocks already consume semantic tokens. **The plumbing exists; the switches do not.**

Three concrete gaps block "theme responsiveness everywhere":

1. **No mode switch exists anywhere.** Nothing sets `data-theme` on `<html>`. OS-dark visitors get dark mode accidentally via the media query, but there is no toggle, no persistence, no admin/editor control, and no way to pin a site to light or dark. The CSS is ready; the activation layer is missing.
2. **Custom/Google fonts do not render in previews or reliably on the front-end.** `scope-style.ts` (used by every editor/theme preview) never passes `customStack` to `typeVars`, so previews always fall back to the built-in stack. On the front-end, `ThemeStyle` and `globals.css` both set `--font-sans` on `:root` with equal specificity — cascade order is not guaranteed after Next.js hoists the `<style>` tag, so the custom stack can silently lose to the Geist fallback.
3. **Brand settings are fragmented.** "Brand" is just a UI label for the theme editor. Logo lives in header/footer block trees, site name in `general` settings, favicon in theme. There is no single brand surface and no per-section theme scoping despite `scope-style.ts` already supporting it.

**Recommended next step:** Ship Tier 1 — a three-way `ThemeModeToggle` (light/dark/system) wired to a `data-theme` attribute on `<html>`, an `appearance` settings namespace, the two font-pipeline fixes, and a `mode` field on the `section` block for per-section overrides. This is mostly wiring over existing derivation; no new abstractions required.

**Top 3 risks:** (a) CSS cascade-order regression when both `:root` blocks set `--font-sans`; (b) FOUC / hydration flash on first paint before the persisted mode is applied; (c) per-section `mode` override interacting badly with the editor's own canvas scoping.

---

## 2. Background & scope

### What the user asked for
- Theme responsiveness across **admin panel**, **front-end**, and **block editor** (flip a switch to see designs in either mode).
- **System settings** for appearance.
- Built naturally into the **entire platform** including all content blocks, custom or otherwise.
- Connected to **brand settings**.
- Fix the **custom/Google fonts** integration not translating to the front-end.
- Token-based and reusable; eliminate hardcoded design values.

### Decisions locked with user (Phase 1)
| Decision | Choice |
|---|---|
| Theme modes | **Light + Dark + System** + per-block/section override |
| Editor switch | **Canvas switch + admin UI follows** (one toggle flips both canvas preview and editor chrome) |
| Theme/brand scope | **Site-wide brand + section/block-scoped themes** |
| Deliverable | **Full TECH-SPEC** in `docs/features/planning/` |

### Out of scope
- Multi-tenant / per-site theming (platform is single-site; no `site_id` anywhere).
- A separate "brand" database entity (brand = theme; see §6).
- Migrating inline `style={{}}` block styles to CSS modules en masse (incremental, deferred).
- Tokenizing intentionally-fixed values (status colors in alert/badge, marquee mask `#000`, geometric transforms).

---

## 3. Architecture

### 3.1 Current theme pipeline (as-built)

```
theme row (singleton, id="theme")
  └─ 12 scalars: accent, accent2, ink, paper, font, baseSize,
                  headingScale, leading, density, radius, shadow, fontFamilyId
        │
        ▼
deriveTokens(bases, mode)  ──► 18 semantic tokens (bg, surface, text, border, accent…)
        │                      for BOTH "light" and "dark"
        ▼
colorVars() + typeVars() + spaceVars()  ──►  CSS custom property map
        │
        ▼
declarations()  ──►  CSS string (safe-value filtered)
        │
        ▼
buildThemeCss()  ──►  :root{light}  +  [data-theme="dark"]{dark}
                          +  @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){dark}}
        │
        ▼
ThemeStyle (server component, root layout <body>)  ──►  <style id="site-theme">
        + <style id="site-fonts"> (@font-face)  +  <link rel="preload">
```

Key files: `src/modules/theme/{derive,css-vars,scales,ThemeStyle}.ts(x)`, `src/styles/tokens/{colors,typography,spacing,base}.css`, `src/app/layout.tsx`.

**What already works:** light/dark derivation, semantic token vocabulary, `@font-face` generation, `revalidateTag("theme")` cache invalidation, scoped preview styles (`scope-style.ts`).

**What is missing:** the activation layer (setting `data-theme`), the persistence layer, the editor/admin toggle, per-section scoping, and the font stack reliability fix.

### 3.2 Target architecture

```
                          ┌─────────────────────────────────────────┐
                          │  appearance settings (new namespace)     │
                          │  siteMode: "light" | "dark" | "system"   │
                          │  (per-visitor override via cookie)       │
                          └───────────────┬─────────────────────────┘
                                          │ SSR reads
                                          ▼
                          <html data-theme="light|dark">   ← set server-side, no FOUC
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        ▼                                 ▼                                 ▼
   Admin panel                      Block editor                       Public site
   (inherits <html> attr)           (canvas toggle sets a scoped       (inherits <html> attr;
   + per-user editor-mode            data-theme on the canvas frame     visitor toggle writes
   preference persisted in           AND mirrors to <html> so the       cookie + localStorage)
   localStorage)                     admin chrome follows)
                                          │
                          ┌───────────────┴─────────────────────────┐
                          ▼                                           ▼
                   section block with mode="dark"           all blocks consume
                   → wraps children in scoped              var(--bg), var(--text),
                   themeScopeStyle(theme, "dark")          var(--font-sans), …
                   (existing scope-style.ts)               (already ~90% do)
```

### 3.3 Mode resolution algorithm (canonical)

```
resolveMode(siteMode, visitorCookie, osPrefers):
  1. effective = visitorCookie ?? siteMode ?? "system"
  2. if effective == "system":
       resolved = osPrefers == "dark" ? "dark" : "light"
     else:
       resolved = effective
  3. emit <html data-theme={resolved}>
     (the [data-theme="dark"] selector in ThemeStyle then applies;
      the @media branch is redundant once data-theme is always set,
      but kept as a progressive-enhancement fallback)
```

The visitor cookie is read in the root layout (SSR) so the very first paint has the right `data-theme` — no FOUC. A small inline script is **not** needed because the layout is a server component and `cookies()` is available at request time.

---

## 4. Schema changes

See `migrations/202607071200_theme_appearance_schema.sql`.

### 4.1 `appearance` settings namespace (no new table)

The platform uses a single `settings` table keyed by `namespace` with a JSON `data` column validated per-namespace (`src/modules/settings/validation.ts`). Add a new namespace rather than a new table:

```ts
// src/modules/settings/validation.ts — add to settingsSchemas
appearance: z.object({
  siteMode: z.enum(["light", "dark", "system"]).default("system"),
  // Future: defaultRadius, defaultShadow overrides, etc. — not in Tier 1.
}),
```

No SQL DDL needed for the namespace itself (it's a JSON row). The migration only seeds the default `appearance` row.

### 4.2 `section` block gains a `mode` field (schema-only, no DB column)

Block schemas live in `src/blocks/section/fields.ts` as Zod, persisted inside page `block_trees` JSON. Add:

```ts
mode: z.enum(["auto", "light", "dark"]).default("auto")
```

`"auto"` = inherit from page/site. `"light"`/`"dark"` = force this section's subtree into that mode via scoped CSS vars. No migration needed — existing trees default to `"auto"` through Zod's `.default()`.

### 4.3 Theme table — no changes

`theme.fontFamilyId` already exists. The `mode` lives in `appearance` settings, not the theme row, because mode is an *activation preference*, not a *design token*. Theme stays purely descriptive (colors/type/spacing); appearance is the switch that selects which derived set to apply.

---

## 5. API contracts

No new REST endpoints. All changes flow through existing server actions and queries:

| Surface | Change |
|---|---|
| `getAppearanceSettings()` (new query) | Reads `settings` row namespace `"appearance"`, returns `{ siteMode }`. Cached with `cacheTag("settings:appearance")`. |
| `saveAppearanceSettings(input)` (new action) | Validates + upserts the `appearance` row, calls `revalidateTag("settings:appearance")` and `revalidateTag("theme")`. |
| `setVisitorMode(mode)` | **Client-only.** Writes `document.cookie = "visitor-mode=light|dark; max-age=31536000; path=/"` and `localStorage["visitor-mode"]`. No server round-trip; the next navigation's SSR reads the cookie. |
| Root layout | Reads `appearance.siteMode` + `cookies().get("visitor-mode")`, computes `resolved`, sets `<html data-theme={resolved}>`. |

---

## 6. Per-platform implementation

This is a single Next.js app (no native targets), so "per-platform" here means the three rendering surfaces: **public front-end**, **admin panel**, **block editor**.

### 6.1 Public front-end

**Files:**
- `src/app/layout.tsx` — add `data-theme` to `<html>` from resolved mode.
- `src/modules/settings/queries.ts` — add `getAppearanceSettings()`.
- `src/modules/settings/validation.ts` — add `appearance` namespace.
- New `src/modules/theme/resolve-mode.ts` — `resolveMode(siteMode, cookie, osPrefers)` pure function + `resolveModeFromRequest()` helper that reads `cookies()`.
- New `src/components/public/VisitorThemeToggle.tsx` — client component, optional, rendered in site-header/footer if the author enables it. Writes the visitor cookie + localStorage, then `document.documentElement.dataset.theme = mode`. Hidden by default; surfaced via a header block field `showThemeToggle: boolean`.

**FOUC strategy:** The root layout is a server component. `cookies()` is available at request time, so `data-theme` is set on `<html>` **before** any HTML is sent. No inline boot script, no flash. The existing `@media (prefers-color-scheme: dark)` branch in `ThemeStyle` is kept as a fallback for the no-cookie first-visit case where `siteMode == "system"`.

### 6.2 Admin panel

**Files:**
- `src/app/admin/(panel)/layout.tsx` — inherits `<html data-theme>` from root layout; no change needed for the *site* mode.
- New `src/modules/settings/admin/AppearanceSettings.tsx` — the "Appearance" settings card: site mode radio (light/dark/system), save button calling `saveAppearanceSettings`.
- `src/app/admin/(settings)/settings/appearance/page.tsx` — new route, linked from the settings index.
- `src/app/admin/(settings)/settings/page.tsx` — add "Appearance" to the settings list.
- New `src/components/admin/AdminThemeToggle.tsx` — a per-user editor/admin chrome preference, persisted in `localStorage["admin-editor-mode"]`, that overrides the site mode **for the admin's own authoring environment only** (does not affect what visitors see). Mounted in `AdminTopBar`.

**Why a separate admin toggle?** The user chose "canvas switch + admin UI follows" — the editor toggle flips both canvas and chrome. But admins also browse non-editor admin pages (settings, content lists) where a canvas doesn't exist. The admin toggle gives them a consistent chrome preference across the whole admin shell. It writes only to `localStorage`; it never touches the DB or the visitor-facing `data-theme`.

### 6.3 Block editor

**Files:**
- New `src/editor/ThemeModeToggle.tsx` — modeled on `DeviceToggle.tsx`. Three segments: `☀ Light · ☾ Dark · ⚙ System`. Controls a `canvasMode` state in `PageEditor`.
- `src/editor/PageEditor.tsx` — lift `canvasMode` state; pass to `PreviewChrome` as `canvasMode` and to a new `setEditorChromeMode` effect that mirrors the resolved mode to `document.documentElement.dataset.theme` (so editor chrome follows, per the user's choice).
- `src/editor/PreviewChrome.tsx` — accept `canvasMode`; when not `"system"`, set `data-theme={canvasMode}` on the canvas frame div **and** apply `themeScopeStyle(theme, resolvedMode)` so the canvas subtree gets the correct derived tokens even if the page-level `data-theme` differs.
- `src/editor/BlockCanvasEditor.tsx` — consume `canvasMode` so newly added blocks render in the selected mode immediately.

**Editor chrome following the canvas:** When the author picks "Dark" in the editor toggle, two things happen: (1) the canvas frame gets `data-theme="dark"` + scoped dark tokens; (2) `document.documentElement.dataset.theme` is set to `"dark"` so the surrounding editor shell (which uses the same semantic tokens) also goes dark. On unmount/route-leave, restore the prior `data-theme`. The admin's `localStorage["admin-editor-mode"]` is updated so the preference persists across editor sessions.

### 6.4 Per-section theme override

**Files:**
- `src/blocks/section/fields.ts` — add `mode: z.enum(["auto","light","dark"]).default("auto")`.
- `src/blocks/section/Render.tsx` — when `mode !== "auto"`, wrap children in a `<div data-theme={mode} style={themeScopeStyle(theme, mode)}>` so the subtree gets the scoped derived tokens. `themeScopeStyle` already exists and produces the same vars `ThemeStyle` produces globally.
- `src/editor/StyleFields.tsx` — expose the `mode` field as a segmented control in the section's inspector.
- **Custom fonts in scoped sections:** `scope-style.ts` must be fixed to pass `customStack` (see §7) so a dark-scoped section also gets the right font stack.

### 6.5 Brand settings connection

The user wants theme "connected to brand settings." Findings: brand **is** theme in this codebase — there is no separate brand entity. The real gaps are fragmentation, not a missing connection:

1. **Logo is not editable from the Brand screen.** It lives in `chrome:header`/`chrome:footer` block trees. **Fix:** Add a "Logo" card to `BrandEditor` that deep-links to `/admin/nav/header` (where the logo block lives) with a one-line explanation. Do not duplicate logo storage into theme — keep the single source of truth in the header block tree.
2. **Site name is in `general` settings, not brand.** **Fix:** Add a read-only "Site name" line in `BrandEditor` that links to General settings. Do not move it (too many callers depend on `general.name`).
3. **Settings index description is wrong.** `src/app/admin/(settings)/settings/page.tsx` says Brand = "Colors, type, spacing, logo" but logo isn't there. **Fix:** Update copy to "Colors, type, spacing, favicon" and add the logo deep-link card above.

No schema change for brand — these are UI/copy fixes that surface the existing connections.

---

## 7. Font pipeline fix (the user's reported bug)

### 7.1 Root cause A — previews never load custom fonts (definite bug)

`src/modules/theme/scope-style.ts` line 23 calls:
```ts
typeVars({ font: theme.font, baseSize, headingScale, leading })
```
It omits `customStack`. So every preview (editor canvas, theme library modal, brand editor preview) resolves `--font-sans` to the built-in stack, ignoring the selected Google/custom font.

**Fix:** `scope-style.ts` must accept the active font's `cssStack` and forward it:
```ts
export function themeScopeStyle(theme: ThemeInput, mode, customStack?: string | null): CSSProperties {
  // …
  ...typeVars({ font: theme.font, baseSize, headingScale, leading, customStack }),
}
```
Callers (`ThemePreview`, `PreviewChrome` via the new scoping, per-section override) must fetch `getActiveFontRender(theme.fontFamilyId)` and pass `font.cssStack`.

### 7.2 Root cause B — front-end cascade-order fragility (latent bug)

`globals.css` → `typography.css` sets `:root{--font-sans: var(--font-geist-sans), …}`. `ThemeStyle` also sets `:root{--font-sans: customStack}`. Equal specificity; source order decides. Next.js hoists the server-component `<style id="site-theme">` into `<head>`, but its position relative to the bundled `globals.css` is not guaranteed. When `globals.css` lands later, the custom font stack silently loses.

**Fix (minimal, no behavior change for the no-custom-font case):** Remove the `--font-sans` and `--font-mono` declarations from `typography.css`'s `:root` block, and instead set them in `ThemeStyle`'s `buildThemeCss` **unconditionally** (always emit `--font-sans`, defaulting to the Geist stack when no custom font). This makes `ThemeStyle` the single source of truth for `--font-sans` and eliminates the conflict. `--font-geist-sans` / `--font-geist-mono` (the `next/font` variables on `<html>`) remain as primitives that `buildThemeCss` references.

Keep the rest of `typography.css` (sizes, weights, leading, tracking, semantic role aliases) — those are not duplicated by `ThemeStyle`'s `typeVars` except for the heading sizes it intentionally overrides.

**Verification:** After the fix, `view-source` on a public page with a custom font active must show `--font-sans:"Inter",…` inside `<style id="site-theme">` and **not** be overridden by any later `:root` rule.

### 7.3 Root cause C — `@font-face` / preload in `<body>` (minor)

`ThemeStyle` emits `<link rel="preload">` and `<style id="site-fonts">` inside `<body>`. Preload hints in `<body>` are valid HTML5 but discovered later. **Fix (optional, Tier 2):** Move the font `<link>`/`<style>` emission into the `<head>` via Next.js `next/font`'s or a manual `<head>` injection. Lower priority than A and B.

---

## 8. Phased rollout

### Tier 1 — Activation layer + font fixes (ship first, ~3–5 days)
1. `resolve-mode.ts` + `getAppearanceSettings()` + `appearance` namespace + validation.
2. Root layout sets `<html data-theme={resolved}>` from `appearance.siteMode` + visitor cookie.
3. `ThemeModeToggle` in the editor (canvas + chrome follow).
4. `AdminThemeToggle` in `AdminTopBar` (localStorage-only chrome preference).
5. `AppearanceSettings` admin page + settings index link.
6. **Font fix A:** `scope-style.ts` forwards `customStack`; preview callers fetch `getActiveFontRender`.
7. **Font fix B:** move `--font-sans`/`--font-mono` out of `typography.css` into `buildThemeCss` (single source of truth).
8. Brand screen: logo deep-link card, site-name read-only line, fix settings-index copy.

**Demo-able milestone:** Flip the editor toggle → canvas + admin chrome go dark; open a public page with a custom Google font → it renders in the selected font; pin site to dark → visitors see dark.

### Tier 2 — Per-section overrides + visitor toggle (~2–3 days)
1. `section` block `mode` field + scoped render + inspector control.
2. `VisitorThemeToggle` client component; header block `showThemeToggle` field.
3. Optional: move font `<link>`/`<style>` to `<head>` (§7.3).

### Tier 3 — Tokenization cleanup (~ongoing)
1. Add missing tokens: `--space-0-5`, `--space-1-5`, `--size-icon-sm/md/lg`, `--border-width-thin/medium/thick` to `spacing.css`.
2. Sweep hardcoded px gaps/icon sizes/border widths in blocks (see research/hardcoded-styling.md §G for the ranked list).
3. Form `data-theme` variants (studio/ink/sky/forest/clay) — currently set as an attr but no CSS rules exist. Either implement the CSS or remove the field.

---

## 9. Effort assessment

| Item | Complexity | Time | Risk | Dependency |
|---|---|---|---|---|
| `resolve-mode` + appearance settings | XS | 0.5d | Low | — |
| Root layout `data-theme` (no FOUC) | S | 0.5d | Low (FOUC if cookie read misplaced) | resolve-mode |
| Editor `ThemeModeToggle` + chrome follow | S | 1d | Low | — |
| Admin `AdminThemeToggle` | XS | 0.5d | Low | — |
| Appearance admin page | XS | 0.5d | Low | appearance settings |
| Font fix A (scope-style customStack) | XS | 0.5d | Low | — |
| Font fix B (typography.css → buildThemeCss) | S | 1d | Medium (cascade regression) | — |
| Brand screen deep-links + copy | XS | 0.5d | Low | — |
| Section `mode` override | S | 1d | Medium (scoping interaction) | font fix A |
| Visitor theme toggle | XS | 0.5d | Low | root layout data-theme |
| Tokenization sweep (Tier 3) | M | 2–3d | Low | — |

**Tier 1 total:** ~3–5 engineer-days. **Tier 2:** ~2–3 days. **Tier 3:** ongoing.

---

## 10. Action plan

### Day 0 (tomorrow)
- Confirm the cascade-order hypothesis: with a custom font active, `view-source` a public page and check whether `--font-sans` in `<style id="site-theme">` is overridden by `globals.css`. This determines whether Font fix B is needed or only Font fix A.
- Decide whether the visitor theme toggle ships in Tier 1 or Tier 2 (default: Tier 2).

### Week 1
- Land Tier 1 items 1–8 as a single PR on `feat/block-style-layer`.
- Add a Vitest unit test for `resolveMode` (all 3×3 combinations of siteMode × cookie × osPrefers).
- Add a Vitest test that `buildThemeCss` always emits `--font-sans` (with and without `customStack`).
- Add a test that `themeScopeStyle` with a `customStack` produces a `--font-sans` containing the family name.

### Phase 1 ship target
Editor toggle flips canvas + chrome; public page renders custom font; site pinnable to dark. Screenshot demo for sign-off.

### Open questions
1. Should the visitor theme toggle be on by default, or opt-in per header block? (Default recommendation: opt-in.)
2. Does the admin chrome preference need to sync across devices (DB-backed) or is `localStorage` enough? (Default: localStorage.)
3. Should `appearance.siteMode` also drive the editor canvas default, or does the editor always start in "system"? (Default: editor starts in the admin's last-used `localStorage` mode.)

---

## 11. Verification plan

- **Unit:** `resolveMode` combinations; `buildThemeCss` font emission; `themeScopeStyle` font forwarding.
- **Integration:** Playwright e2e — toggle editor to dark → assert `data-theme="dark"` on canvas frame and `<html>`; load public page with custom font → assert computed `font-family` on `body` contains the family name.
- **Manual:** Brand editor → pick Google font → save → open editor canvas → font visible; flip theme toggle → canvas + chrome go dark; pin site dark in Appearance → incognito visit → dark with no FOUC.
- **Regression:** Run existing `derive.test.ts`, `scales.test.ts`, `portable.test.ts`, `css.test.ts`, `validation.test.ts`.

---

## 12. Risks / considerations

- **Cascade regression (Font fix B):** Removing `--font-sans` from `typography.css` means `ThemeStyle` must always render. If `getTheme()` ever fails and returns `THEME_DEFAULTS`, `buildThemeCss` still emits a valid stack — safe. But any code path that renders a page without `ThemeStyle` would lose `--font-sans` entirely. Audit: `ThemeStyle` is in the root layout which wraps all routes; no route bypasses it.
- **FOUC:** Mitigated by SSR cookie read in the root layout. The only flash risk is the very first visit with no cookie and `siteMode="system"` — handled by the existing `@media (prefers-color-scheme: dark)` fallback.
- **Per-section scoping:** A dark section inside a light page works because `themeScopeStyle` sets all 18 tokens on the subtree. But blocks that read tokens via `var(--bg)` inherit the scoped value correctly only if they are descendants of the scoped wrapper. Blocks that escape the wrapper (e.g. portaled tooltips, modals) will NOT get the scoped mode — acceptable; they fall back to the page mode.
- **Editor canvas vs page mode:** When the author pins the canvas to dark but the site is light, the canvas shows dark (correct — that's the point of the preview). The published page uses the site/visitor mode. No conflict.
- **Custom block authors:** Custom blocks that hardcode colors will not respond to theme mode. The tokenization sweep (Tier 3) and documentation should make "use `var(--*)`" a documented contract for custom blocks.

---

## 13. References

- `src/modules/theme/ThemeStyle.tsx` — current CSS injection (lines 13–26, 35–53)
- `src/modules/theme/derive.ts` — light/dark token derivation (lines 38–89)
- `src/modules/theme/scales.ts` — `typeVars`/`spaceVars`, `customStack` param (line 96, 102)
- `src/modules/theme/scope-style.ts` — scoped preview styles, **missing `customStack`** (line 23)
- `src/modules/theme/css-vars.ts` — semantic → CSS var mapping (lines 19–58)
- `src/styles/tokens/typography.css` — static `--font-sans` fallback (line 12) — **conflicts with ThemeStyle**
- `src/styles/tokens/colors.css` — static dark-mode fallback already present (lines 73, 103)
- `src/app/layout.tsx` — root layout, `ThemeStyle` mount (line 73), **no `data-theme` on `<html>`**
- `src/app/(public)/layout.tsx` — public shell, inherits root layout
- `src/editor/DeviceToggle.tsx` — model for the new `ThemeModeToggle`
- `src/editor/PreviewChrome.tsx` — canvas frame to receive `data-theme`
- `src/modules/fonts/queries.ts` — `getActiveFontRender` (lines 35–57)
- `src/modules/settings/validation.ts` — `settingsSchemas` registry (add `appearance` namespace)
- Research dossiers in `./research/`

---

*Generated with the thought-ideation skill. Primary deliverable: this file. See `EXECUTIVE-SUMMARY.md` for the short version and `research/` for the supporting audits.*
