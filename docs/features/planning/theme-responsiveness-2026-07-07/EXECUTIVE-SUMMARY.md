# Theme Responsiveness — Executive Summary

**Date:** 2026-07-07 · **Verdict:** Feasible, mostly wiring over an existing engine. ~3–5 days to Tier 1.

## The situation
The platform already has a token-driven theme engine that derives **both light and dark** semantic CSS variables from brand scalars, and `ThemeStyle` already emits `[data-theme="dark"]` + `@media (prefers-color-scheme: dark)` blocks. ~85–90% of content blocks already consume semantic tokens. **The plumbing exists; the switches do not.**

## The three real gaps
1. **No mode switch anywhere.** Nothing sets `data-theme` on `<html>`. OS-dark visitors get dark mode accidentally via the media query, but there's no toggle, no persistence, no admin/editor control, no way to pin a site light/dark.
2. **Custom fonts don't render in previews (definite bug) and are fragile on the front-end (latent bug).** `scope-style.ts` never passes `customStack` to `typeVars`, so every editor/theme preview falls back to Geist. On the front-end, `globals.css` and `ThemeStyle` both set `--font-sans` on `:root` with equal specificity — cascade order isn't guaranteed, so the custom stack can silently lose.
3. **Brand settings are fragmented.** Brand = theme (no separate entity). Logo lives in header/footer block trees, site name in `general` settings, favicon in theme. No single brand surface; `scope-style.ts` already supports per-section scoping but it's unused.

## The plan (Tier 1, ~3–5 days)
- `resolveMode(siteMode, visitorCookie, osPrefers)` + an `appearance` settings namespace (`siteMode: light|dark|system`).
- Root layout sets `<html data-theme={resolved}>` server-side from the cookie — **no FOUC**.
- `ThemeModeToggle` in the editor (modeled on `DeviceToggle`) — flips canvas **and** admin chrome (per user's choice).
- `AdminThemeToggle` in `AdminTopBar` (localStorage-only chrome preference).
- `AppearanceSettings` admin page.
- **Font fix A:** `scope-style.ts` forwards `customStack`; preview callers fetch `getActiveFontRender`.
- **Font fix B:** move `--font-sans`/`--font-mono` out of `typography.css` into `buildThemeCss` so `ThemeStyle` is the single source of truth (eliminates the cascade conflict).
- Brand screen: logo deep-link, site-name read-only line, fix settings-index copy.

## Tier 2 (~2–3 days)
- `section` block `mode` field (auto/light/dark) → scoped subtree via `themeScopeStyle`.
- `VisitorThemeToggle` client component (opt-in per header block).

## Tier 3 (ongoing)
- Add missing tokens (`--space-0-5`, `--size-icon-*`, `--border-width-*`); sweep hardcoded px in blocks.
- Implement or remove the unused form `data-theme` variants (studio/ink/sky/forest/clay).

## Top 3 risks
1. **Cascade regression** when consolidating `--font-sans` into `ThemeStyle` — mitigated by always emitting it (defaults to Geist stack).
2. **FOUC** on first paint — mitigated by SSR cookie read in the root layout.
3. **Per-section scoping** vs portaled elements (tooltips/modals escape the scoped wrapper) — acceptable; they fall back to page mode.

## Day 0 action
Verify the cascade-order hypothesis: with a custom font active, view-source a public page and check whether `--font-sans` in `<style id="site-theme">` is overridden by `globals.css`. This decides whether Font fix B is needed or only Font fix A.

## Decisions locked
- Modes: **Light + Dark + System + per-block/section override**
- Editor switch: **Canvas + admin UI follow** (one toggle)
- Scope: **Site-wide brand + section/block-scoped themes**
- Deliverable: **Full TECH-SPEC** (this folder)

Full spec: `./TECH-SPEC.md`
