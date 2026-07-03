# embed

Sandboxed third-party iframe. The iframe renders ONLY when the https URL's
hostname and path match the provider allowlist — anything else shows the
striped placeholder card:

- `youtube` — `(www.)youtube.com/embed/...`, or `youtu.be/<id>` (rewritten to `youtube.com/embed/<id>`)
- `figma` — `www.figma.com/embed...`
- `maps` — `www.google.com/maps/embed...`

The iframe always carries `sandbox="allow-scripts allow-same-origin
allow-presentation"`, `loading="lazy"` and
`referrerPolicy="strict-origin-when-cross-origin"`.

| Field | Type | Notes |
| --- | --- | --- |
| `provider` | `youtube \| figma \| maps` | Which allowlist applies |
| `url` | string | `https://` URL (≤2000 chars) or empty |
| `ratio` | `16 / 9 \| 4 / 3 \| 1 / 1 \| 21 / 9` | CSS aspect-ratio of the frame |

```json
{ "provider": "youtube", "url": "https://youtu.be/dQw4w9WgXcQ", "ratio": "16 / 9" }
```
