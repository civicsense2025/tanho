# award-list

The profile's **awards** section: each row is a 5px tone dot, the title
(medium) and the org/year (muted, right-aligned). The dot colour follows the
award's `tone` (`accent` or `accent2`). Bound to the profile singleton;
renders nothing when empty. The editor canvas shows a placeholder.

| Field | Type | Notes |
| --- | --- | --- |
| `source` | `"awards"` | Fixed — the profile section this block reads |
| `eyebrow` | string | Optional mono uppercase label (≤60 chars) |

```json
{ "source": "awards", "eyebrow": "Recognition" }
```
