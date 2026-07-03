# experience-list

The profile's **experience** section as rows: a mono span on the left, the
role (medium) and organisation (muted) on the right, and an optional note
below. Bound to the profile singleton; renders nothing when the section is
empty. The editor canvas shows a placeholder.

| Field | Type | Notes |
| --- | --- | --- |
| `source` | `"experience"` | Fixed — the profile section this block reads |
| `eyebrow` | string | Optional mono uppercase label (≤60 chars) |

```json
{ "source": "experience", "eyebrow": "Where I've worked" }
```
