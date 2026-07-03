# chart

Server-rendered SVG chart — no client JS. `bar` scales fill opacity with the
value, `line` draws a 1.5px accent polyline, `donut` cycles
accent/accent-2/border-strong segments. The optional title renders in the
mono uppercase section-head style.

| Field | Type | Notes |
| --- | --- | --- |
| `kind` | `bar \| line \| donut` | Chart shape |
| `title` | string | Optional section-head label (≤200 chars) |
| `series[].label` | string | Category label (≤100 chars) |
| `series[].value` | number | Non-negative value |

```json
{
  "kind": "bar",
  "title": "Visits per month",
  "series": [{ "label": "Jan", "value": 12 }, { "label": "Feb", "value": 18 }]
}
```
