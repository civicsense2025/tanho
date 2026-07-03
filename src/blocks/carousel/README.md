# carousel

Horizontal CSS scroll-snap strip — each slide is 80% wide and snaps to the
start edge. No JavaScript.

| Field | Type | Notes |
| --- | --- | --- |
| `slides[].src` | string | Media path or `https://` URL; empty shows a placeholder |
| `slides[].caption` | string | Mono micro-caption under the slide (≤300 chars) |

```json
{ "slides": [{ "src": "", "caption": "Slide 1" }, { "src": "", "caption": "Slide 2" }] }
```
