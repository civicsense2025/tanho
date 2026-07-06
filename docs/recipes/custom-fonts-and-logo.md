# Custom fonts, logo & favicon

Give a site real brand typography and imagery: pick a Google font or upload
your own font files, and set an image logo + favicon (raster or SVG).

## Using it (admin)

- **Fonts** — Settings → Brand → *Manage fonts* (or Settings → Fonts):
  - *Google Fonts*: pick a family, choose weights/styles, **Add & self-host**.
    The files are fetched once and served from your own site — no runtime
    dependency on Google.
  - *Upload files*: drag `.woff2`/`.woff`/`.ttf`/`.otf` files, a folder, or a
    `.zip`. Detected family/weight/style pre-fill a table you can adjust, then
    create each family. `woff2` is recommended; the page-speed panel flags
    heavy payloads, too many families/faces, and non-woff2 files.
  - Back on **Brand → Typography → Font**, pick your family (it appears under
    "Your fonts"). Leaving a built-in preset selected keeps the old behavior.
- **Logo image** — Settings → Nav → Header → Logo → Style **Image**, then
  choose an image. (SVG is accepted; it is sanitized on upload.)
- **Favicon** — Settings → Brand → Favicon → choose an image.

## How it works (developer)

- **Storage**: fonts and logo/favicon reuse the media pipeline
  (`src/modules/media/`). Font formats + `image/svg+xml` are in the upload
  allowlist; fonts get `kind: "font"`. Three maps stay in lockstep —
  `MIME_TO_EXT` (`media/validation.ts`), `EXT_TO_MIME`
  (`adapters/storage/local.ts`), and `matchesSignature` (`media/signature.ts`).
  Shared byte-storage: `media/store.ts` (`storeMediaBytes`).
- **SVG safety**: `media/svg-sanitize.ts` (DOMPurify SVG profile) strips
  scripts/handlers/`<foreignObject>`/external refs **before** storage; SVGs are
  served with a `sandbox` CSP and rendered via `<img>` only. See `SECURITY.md`.
- **Fonts domain**: `src/modules/fonts/` — `schema.ts` (`font_families`,
  `font_faces`), `css.ts` (safe `@font-face` + `--font-sans` builder; every
  value re-validated), `fontkit-meta.ts` (metadata parse), `google.ts` (curated
  allowlist + self-host fetch), `actions.ts` (upload/zip/google/create/delete).
- **Render**: `theme/ThemeStyle.tsx` emits the active family's `@font-face` +
  a `preload` for the primary face and overrides `--font-sans`;
  `theme.fontFamilyId` selects the family (null → the `font` preset). Logo
  renders in `chrome/public/LogoMark.tsx` (`style: "image"` → `<img>`); favicon
  is set from `theme.faviconMediaId` in `app/layout.tsx` metadata.

## Adding more Google fonts

Append to `GOOGLE_FONTS` in `src/modules/fonts/google.ts` (family + weights +
italic + category). Each must exist on Google Fonts; the self-host fetch pulls
its woff2 files at add-time.

## Verify

`npm run typecheck && npm run lint && npm run test`, then `npm run dev`: upload
a woff2 (and a `.zip`), select it in Brand, and confirm the public site renders
in it (view-source shows `@font-face` + `preload`). Upload an SVG logo with a
`<script>`/`onload` and confirm the served file is stripped and the logo shows
via `<img>`.
