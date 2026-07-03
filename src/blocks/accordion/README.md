# accordion

Expandable rows on native `<details>`/`<summary>` — no JavaScript. Hairline
dividers between items; answers are plain text.

| Field | Type | Notes |
| --- | --- | --- |
| `items[].q` | string | Summary line, medium weight (≤300 chars) |
| `items[].a` | string | Plain-text answer (≤2000 chars) |

```json
{ "items": [{ "q": "How does billing work?", "a": "Monthly, cancel anytime." }] }
```
