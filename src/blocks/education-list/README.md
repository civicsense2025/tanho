# education-list

The profile's **education** section as rows: a mono span on the left, the
school (medium) and degree (muted) on the right. Bound to the profile
singleton; renders nothing when empty. The editor canvas shows a placeholder.

| Field | Type | Notes |
| --- | --- | --- |
| `source` | `"education"` | Fixed — the profile section this block reads |
| `eyebrow` | string | Optional mono uppercase label (≤60 chars) |

```json
{ "source": "education", "eyebrow": "Studied at" }
```
