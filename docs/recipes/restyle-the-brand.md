# Restyle the brand

Make the site yours — name, colors, type, logo. None of it is in code.

## Name & tagline

**Admin → Settings → General** — set the site name and tagline. They flow
into browser titles, the header/footer wordmark (unless you set a logo),
SEO templates, and email.

## Colors, type, spacing

**Admin → Settings → Brand.** You set four base colors (accent, secondary
accent, ink, paper) plus type and spacing scales; the platform derives a
full light + dark token set from them, with WCAG contrast checks. Every
block reads those tokens, so the whole site — public and admin — re-skins at
once. A **live preview** and a **WCAG contrast panel** update as you edit; six
one-click palette presets give you a starting point. Hit **Save** and the change
is live everywhere on the next request.

Prefer editing here over touching CSS. If you must change a default that
ships with a fresh install, it lives in
`src/modules/theme/validation.ts` (`THEME_DEFAULTS`), seeded by
`seed/modules/theme.ts`. See [../architecture/theming.md](../architecture/theming.md).

## Saved themes, import/export & the library

A theme is just the ~12 scalars — tiny and portable.

- **Save as theme** (in Brand) snapshots the current look as a named theme.
- **Admin → Settings → Brand → Themes** lists your saved themes; **Activate**
  makes one live, or **Duplicate**/**Delete** your own.
- **Export** downloads a `.theme.json`; **Import** loads one back (validated
  fail-closed). Share themes between deployments this way.
- The **Theme library** on that screen offers curated starter themes you can
  import in one click. It reads a same-origin catalog at
  `public/theme-library/index.json` — swap that file to ship your own library
  (each entry is an `oys-theme@1` payload; no external host needed).

## Logo & favicon

The Brand screen stores a logo/favicon media id. Today the header/footer
wordmark is driven by **Nav → Header/Footer** (logo text/style), so set your
wordmark there; image-logo rendering from the theme media ids is a known
follow-up. Fall back to the site name as a wordmark otherwise.

## Fonts

Five font stacks ship (Geist, system, serif, grotesk, humanist), chosen in
Brand. To add another, append one line to `FONT_STACKS` in
`src/modules/theme/scales.ts` — it's a fixed table, no validation change
needed.

## What you never touch

Component files, block renderers, and screens read only semantic CSS
variables — you shouldn't need to edit any of them to rebrand. If a block
needs a new color role, add it to the token set (not a hardcoded hex).
