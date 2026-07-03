# video

Native `<video controls>` when a source is set; otherwise the striped
placeholder with a centered play chip.

| Field | Type | Notes |
| --- | --- | --- |
| `src` | string | Media path or `https://` URL; empty shows the placeholder |
| `poster` | string | Optional poster image, same URL rules |
| `caption` | string | Muted mono caption under the figure (≤300 chars) |

```json
{ "src": "/media/walkthrough.mp4", "poster": "/media/walkthrough.jpg", "caption": "Product walkthrough" }
```
