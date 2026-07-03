# progress

Labelled progress bars — a 6px pill track on the surface tint with an accent
fill sized by percentage.

| Field | Type | Notes |
| --- | --- | --- |
| `items[].label` | string | Row label (≤200 chars) |
| `items[].pct` | number | Fill percentage, clamped 0–100 |

```json
{ "items": [{ "label": "Design", "pct": 80 }, { "label": "Build", "pct": 45 }] }
```
