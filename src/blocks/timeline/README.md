# timeline

Vertical rail of milestones — hairline left rule with accent dot markers,
mono uppercase dates.

| Field | Type | Notes |
| --- | --- | --- |
| `items[].date` | string | Mono uppercase date line (≤100 chars) |
| `items[].title` | string | Medium-weight milestone title (≤200 chars) |
| `items[].note` | string | Optional muted detail (≤500 chars) |

```json
{ "items": [{ "date": "2024", "title": "Launched", "note": "First public release." }] }
```
