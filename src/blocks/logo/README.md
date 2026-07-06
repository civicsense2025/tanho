# logo

Site logo — an uploaded/linked **image** (`src`), or a typographic fallback: an
initials-in-ink-square + name (`mark`), name only (`wordmark`), or the square
alone (`icon`). Always links to `/`. An empty `text` falls back to the site name
resolved server-side (`_resolved.siteName`) and is used as the image's alt text,
so a rebrand is a data change, never a tree edit. (It has a resolver but is
deliberately NOT a `bound` def — the `table` pattern — so its fields stay
editable in the inspector.)

| Field | Type | Notes |
| --- | --- | --- |
| `src` | string | Logo image: media-library path (`/api/media/…`), a `/public` path (`/logo.svg`), or an `https://` URL. When set it renders instead of the mark; empty = typographic fallback. Auto-shows the media picker in the inspector. |
| `text` | string | Wordmark text / image alt; empty = site name (≤60 chars) |
| `style` | `mark \| wordmark \| icon` | Square+name, name only, or square only (fallback only) |
| `icon` | string | Glyph/letters for `icon` style; empty = initials (≤30 chars) |
| `big` | boolean | Larger wordmark; also raises the image height cap |
| `invert` | boolean | Paper-on-ink square for dark footer surfaces |

```json
{ "src": "", "text": "", "style": "mark", "icon": "", "big": false, "invert": false }
```

A `/public` path (e.g. `/logo.svg`) serves as a static file — no database, no
function — which is the fast path for crawlers. `/api/media/…` uploads are
disk-backed and immutably cached.

`invert` uses the semantic `--paper-0` / `--ink-0` tokens (not hardcoded hex),
so it theme-tracks on the dark `site-footer` variant.
