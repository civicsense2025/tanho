# metric

Big-number stat grid — display-size values over mono uppercase micro-labels,
hairline gutters between cells. Caps at two columns below desktop.

| Field | Type | Notes |
| --- | --- | --- |
| `cols` | number | Column count, 2–4 |
| `items[].value` | string | The stat, e.g. `"99.9%"` (≤100 chars) |
| `items[].label` | string | Mono uppercase label under the value (≤100 chars) |

```json
{ "cols": 3, "items": [{ "value": "12", "label": "Projects" }, { "value": "99.9%", "label": "Uptime" }] }
```
