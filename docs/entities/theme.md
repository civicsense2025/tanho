# Theme

The site's visual system. A theme is ~12 scalars (four base colors + type &
spacing knobs); from them the platform **derives** a full light + dark semantic
token set that every block and screen reads. Change the scalars and the whole
site — public and admin — re-skins at once. There is one **active** theme plus
any number of **saved** themes you can activate, export, import, or pull from a
library.

## Data model

The active theme is a singleton row (`theme`, id always `"theme"`):

| Field | Notes |
| --- | --- |
| `accent`, `accent2`, `ink`, `paper` | The four base hex colors — everything derives from these |
| `font` | `geist \| system \| serif \| grotesk \| humanist` |
| `baseSize` | 14–20 px |
| `headingScale` | 0.85–1.5× |
| `leading` | 1.3–2 line height |
| `density` | 0.8–1.3× spacing multiplier |
| `radius` | `square \| soft \| round` |
| `shadow` | `flat \| subtle \| elevated` |
| `logoMediaId`, `faviconMediaId` | Optional media ids (see the logo caveat below) |

Saved themes live in `theme_presets` — each holds a full scalar payload as JSON
plus `source` (`local \| imported \| library`) and a `builtin` flag. **Activating**
a preset copies its payload into the singleton `theme` row, which stays the one
source of truth the renderer reads (`getTheme()` → `ThemeStyle`).

## Derivation

`deriveTokens(bases, mode)` (`src/modules/theme/derive.ts`, pure + unit-tested
for WCAG AA) turns the four base colors into ~18 semantic tokens per mode;
`css-vars.ts` + `scales.ts` serialize them to CSS variables injected at the root
layout by `ThemeStyle.tsx` as `:root` (light) and `[data-theme="dark"]` (dark).
Blocks never hardcode color — they read the tokens — which is what makes the
whole platform re-brandable from ~12 stored values. See
[../architecture/theming.md](../architecture/theming.md).

## Admin

- **Settings → Brand** — the editor: base-color pickers, type/spacing controls,
  six palette presets, a live preview, and a WCAG contrast panel over 7 fg/bg
  pairs. Save writes the active theme.
- **Settings → Brand → Themes** — saved themes (Activate / Duplicate / Delete),
  plus Import/Export `.theme.json` and the Theme library.

## Portable format (`oys-theme@1`)

Export produces `{ format: "oys-theme@1", name, theme: <scalars>, generatedAt }`
— only the scalars, so a theme is a few hundred bytes and deployment-agnostic.
Import validates the format tag and the payload fail-closed
(`src/modules/theme/portable.ts`); a malformed or wrong-version file is rejected,
never partially applied.

## Fit it to your cause

- **Ship your own theme library** — replace `public/theme-library/index.json`
  with your curated `oys-theme@1` entries. It's fetched same-origin, so there's
  no external host and the CSP stays clean.
- **Add a font** — append a stack to `FONT_STACKS` in `scales.ts` (a fixed
  table; no schema change).
- **Add a color role** — extend the `SemanticTokens` set in `derive.ts` +
  `colorVars` in `css-vars.ts`; never add a hardcoded hex to a block.
- **Change the shipped default** — edit `THEME_DEFAULTS`
  (`src/modules/theme/validation.ts`), seeded by `seed/modules/theme.ts`.

## FAQ

**Can I have multiple themes and switch?** Yes — save as many as you like and
Activate one. Only the active theme renders; the rest wait in Themes.

**Will a theme change break contrast/accessibility?** The Brand editor shows a
live WCAG panel; the derivation targets AA. Watch the panel before you Save.

**Logo caveat.** `logoMediaId`/`faviconMediaId` are stored but the header/footer
wordmark is currently driven by **Nav → Header/Footer** logo settings. Set your
wordmark there; rendering an image logo from the theme media id is a known
follow-up.
