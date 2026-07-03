# postlist

Published posts (`pages.kind = "post"`) rendered as an archive — newest first,
each row linking to the post route. A lock glyph (`▸`) marks posts whose page
carries a paywall (`pages.hasPaywall`), read from the page row only — no gated
block content is touched here.

| Field | Type | Notes |
| --- | --- | --- |
| `limit` | number | Max rows (1–50, default 10) |
| `source` | `"posts"` | Fixed for now; reserved for future sources |

```json
{ "limit": 10, "source": "posts" }
```

Bound block: data comes from `resolve.ts` (server-only); `Render` is pure and
receives the rows via `content._resolved`.
