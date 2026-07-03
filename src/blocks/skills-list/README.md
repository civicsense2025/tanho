# skills-list

The profile's **skills** section: each group renders a mono uppercase label
above a wrapping row of pill tags. Bound to the profile singleton; renders
nothing when empty. The editor canvas shows a placeholder.

| Field | Type | Notes |
| --- | --- | --- |
| `source` | `"skills"` | Fixed — the profile section this block reads |
| `eyebrow` | string | Optional mono uppercase label (≤60 chars) |

```json
{ "source": "skills", "eyebrow": "What I work with" }
```
