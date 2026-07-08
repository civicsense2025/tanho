# Research: Theme & Dark-Mode Audit

## A. Current theme architecture

Brand color → CSS vars pipeline:
1. **Input** (`src/modules/theme/validation.ts`): 4 base colors (accent, accent2, ink, paper) + 8 type/spacing scalars. Stored in singleton `theme` row (`schema.ts` lines 9–28).
2. **Derive** (`src/modules/theme/derive.ts` lines 41–89): `deriveTokens(bases, mode)` → 18 semantic tokens. Accepts `mode: "light" | "dark"`. Dark mode uses hardcoded `DARK_INK = "#f0ede4"`, `DARK_PAPER = "#14130f"` (lines 38–39) and lightens too-dark accents.
3. **CSS vars** (`src/modules/theme/css-vars.ts` lines 19–58): maps semantic tokens to `--bg`, `--text`, `--accent`, etc. + legacy aliases (`--paper-0`, `--ink-0`, `--maroon`, `--olive`).
4. **Type/spacing** (`src/modules/theme/scales.ts`): `typeVars` (lines 99–116, fluid heading sizes), `spaceVars` (lines 154–168, space/radius/shadow).
5. **Serialize** (`css-vars.ts` `declarations` lines 61–66): safe-value filtered.
6. **Inject** (`src/modules/theme/ThemeStyle.tsx`): `buildThemeCss` (lines 13–26) emits `:root{light}` + `[data-theme="dark"]{dark}` + `@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){dark}}`. Rendered as `<style id="site-theme">` in root layout `<body>` (`src/app/layout.tsx` line 73).

Token vocabulary:
- **Colors** (`src/styles/tokens/colors.css`): semantic (`--bg`, `--surface`, `--text`, `--border`, `--accent`…) + primitives (`--paper-0/1/2`, `--ink-0/1/2`, `--olive`, `--maroon`). Static dark-mode fallback already present (lines 73, 103).
- **Typography** (`src/styles/tokens/typography.css`): `--font-sans`, `--font-mono`, sizes, weights, leading, tracking, semantic roles (`--font-display/heading/body/label`).
- **Spacing** (`src/styles/tokens/spacing.css`): `--space-1..12`, `--radius-xs/sm/md`, `--shadow-sm/md/lg`, transitions.

## B. Dark-mode / theme-switching status

**CSS support: complete. Activation: completely missing.**

- `deriveTokens` supports dark; `ThemeStyle` emits dark scopes. ✓
- Three activation methods are *encoded in CSS*: `[data-theme="dark"]`, `@media (prefers-color-scheme: dark)`, `:root:not([data-theme="light"])`.
- **Nothing sets `data-theme` on any element.** grep confirms: `data-theme` appears only as CSS selectors in `ThemeStyle.tsx`/`colors.css`, and as an unrelated per-form styling attr in `FormRenderer.tsx` (studio/ink/sky/forest/clay).
- Therefore: `[data-theme="dark"]` never matches. `:root:not([data-theme="light"])` is always true → the `@media (prefers-color-scheme: dark)` branch IS active for OS-dark visitors. **OS-dark visitors get dark mode accidentally; no explicit control exists.**
- No toggle in admin, editor, or front-end. No appearance setting in `general` settings. No persistence (localStorage/cookie/DB).

Existing light/dark toggles (preview-only, not site-wide):
- `BrandEditor.tsx` line 56 — preview toggle.
- `ThemePreviewModal.tsx` lines 69–73 — preview toggle.
- `site-footer/fields.ts` line 21 — `dark` boolean for inverted footer surface.

## C. Admin panel theming status
- `src/app/admin/(panel)/layout.tsx` uses `var(--bg)`; inherits global `ThemeStyle`. Token-driven, no hardcoded colors.
- `src/components/admin/chrome.module.css` and `AdminTopBar.tsx` use semantic tokens throughout.
- **No dark mode.** Always renders light (no `data-theme` set).

## D. Block editor theming status
- `editor-shell.module.css`, `canvas.module.css`, `layers-panel.module.css` — all token-driven (`var(--bg)`, `var(--surface-card)`, `var(--accent)`, `var(--text-muted)`…).
- **No dark mode.** Editor chrome always light. Canvas preview uses site theme but only the light branch (since nothing sets `data-theme`).

## E. Front-end block theming status
- `BlockRenderer.tsx` renders blocks with scoped classes + per-block `<style>`; uses design system tokens.
- Representative blocks (heading, buttons, section, site-header) — all consume `var(--text-h1)`, `var(--solid)`, `var(--surface)`, `var(--border)`, etc. Token-driven. ✓
- **Dark mode CSS is ready** but never activated by an explicit toggle.

## F. Concrete gap list
1. No front-end dark-mode toggle / visitor control.
2. No admin panel dark-mode toggle.
3. No `appearance`/theme-mode setting in general settings.
4. **No `data-theme` attribute on `<html>`** (`src/app/layout.tsx` lines 68–71) — the linchpin.
5. No user preference persistence (localStorage/cookie).
6. Form `data-theme` enum (studio/ink/sky/forest/clay) has no corresponding CSS rules — set but never styled.
7. Editor chrome has no dark mode (no `data-theme` set anywhere).
8. No `mode` column/concept in theme schema (mode is an activation preference, belongs in settings not theme).
9. No client-side ThemeProvider component to toggle `data-theme`.
10. Static `colors.css` dark fallback (lines 71–119) is correct and can serve as the no-JS fallback.
