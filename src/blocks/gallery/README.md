# gallery

Grid of square image tiles. Empty sources render numbered striped
placeholders; the grid caps at two columns on tablet/mobile.

| Field | Type | Notes |
| --- | --- | --- |
| `cols` | number | Column count, 2–4 |
| `images[].src` | string | Media path or `https://` URL; empty shows a placeholder |
| `images[].alt` | string | Accessible description (≤300 chars) |
| `images[].caption` | string | Mono micro-caption under the tile (≤300 chars) |

```json
{ "cols": 3, "images": [{ "src": "", "alt": "", "caption": "Detail 01" }] }
```
