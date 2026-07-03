# Theming

The whole site — public pages, admin, every block — reads **only semantic
CSS variables** (`--bg`, `--text`, `--accent`, `--space-*`, `--radius-*`, …).
Those variables are derived at render time from ~12 scalars stored in the
`theme` table. Rebranding a deployment is a data change, never a code change.

## The pipeline

```
theme row (DB)            src/modules/theme/
  4 base colors   ──►  derive.ts     → light + dark semantic token sets
  font/size/scale ──►  scales.ts     → --text-*, --space-*, --radius-*, --shadow-*
                        css-vars.ts  → CSS declarations (safe-value filtered)
                        ThemeStyle.tsx → <style id="site-theme"> in the root layout
```

- `derive.ts` ports the design system's Brand-screen algorithm: mixes,
  lightens/darkens, WCAG luminance — `text-on-accent` flips automatically to
  stay readable; dark mode lightens accents that would vanish on dark paper.
- Static defaults live in `src/styles/tokens/*.css` (ported from the design
  system); the injected style overrides them. Light values go on `:root`,
  dark values on `[data-theme="dark"]` and a `prefers-color-scheme` media
  scope, so OS auto dark works with no JS.
- The theme query is cached (`cacheTag("theme")`); saving the Brand screen
  calls `revalidateTag("theme")` and the whole site re-skins.

## Safety

Theme scalars are zod-validated at write (strict hex regex, enum allowlists,
clamped numbers) and re-validated on read (`queries.ts`); the serializer in
`css-vars.ts` additionally drops any value that fails a safe-pattern check.
Nothing user-typed is interpolated into the `<style>` tag raw.

## Fit it to your cause

- Change colors/typography/density in **Admin → Settings → Brand** (Phase 2+),
  or edit the `theme` row directly.
- Default palette for fresh installs lives in
  `src/modules/theme/validation.ts` (`THEME_DEFAULTS`) and is seeded by
  `seed/modules/theme.ts`.
- Add a font option: extend `FONT_STACKS` in `scales.ts` (one line) — it's a
  fixed table, so no validation changes needed.

## FAQ

**Why derive instead of storing all tokens?** Twelve scalars can't drift
into an inconsistent or inaccessible palette; the derivation keeps hover,
tint, and on-accent variants coherent and WCAG-checked (unit tests enforce
AA for the default palette).

**Can a block use its own colors?** Blocks may only reference semantic
variables. If a block needs a new role, add it to `SemanticTokens` +
`colorVars` so every theme supplies it.
