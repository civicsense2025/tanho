# project-list

Published **project** entries as hairline-divided rows. Each row is a link to
`/<project basePath>/<slug>`: the title warms to the accent colour on hover
and a right arrow fades and slides in (CSS only). The optional eyebrow renders
as a mono uppercase label above the list. `resolve()` reads
`listPublishedEntries("project")` and slices to `limit`.

| Field | Type | Notes |
| --- | --- | --- |
| `limit` | number | How many projects to show, 1–24 (default 6) |
| `eyebrow` | string | Optional mono uppercase label (≤60 chars) |

```json
{ "limit": 6, "eyebrow": "Selected work" }
```
