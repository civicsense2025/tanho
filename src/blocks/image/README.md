# image

Single image as `<figure>` + `<figcaption>`. An empty `src` renders the
design's striped placeholder with the alt/caption label centered in mono.

| Field | Type | Notes |
| --- | --- | --- |
| `src` | string | Media path (`/...`) or `https://` URL; empty shows the placeholder |
| `alt` | string | Accessible description (≤300 chars) |
| `caption` | string | Muted mono caption under the figure (≤300 chars) |

```json
{ "src": "/media/studio.jpg", "alt": "The studio desk", "caption": "Where the work happens" }
```
