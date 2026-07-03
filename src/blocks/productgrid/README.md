# productgrid

A static grid of promo items for a marketing page. Author-typed copy only —
illustrative, **not** live products. The real storefront is `/shop`.

| Field | Type | Notes |
| --- | --- | --- |
| `cols` | 2–4 | Columns |
| `items[]` | array | `{ name, price, image }` (≤48) |
| `items[].name` | string | Item name |
| `items[].price` | string | Display price, e.g. `$29` |
| `items[].image` | string | Image URL (blank → striped placeholder) |

```json
{ "cols": 3, "items": [ { "name": "Tote", "price": "$28", "image": "" }, { "name": "Cap", "price": "$22", "image": "" } ] }
```
