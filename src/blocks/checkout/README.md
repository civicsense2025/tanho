# checkout

A static cart-summary CTA card for marketing or preview. Author-typed copy
only — it does **not** read live cart state. The real cart is the storefront
client island on the `/shop` routes.

| Field | Type | Notes |
| --- | --- | --- |
| `items[]` | array | `{ name, qty, price }` (≤50) |
| `items[].name` | string | Line label |
| `items[].qty` | number | 1–999 |
| `items[].price` | string | Display price, e.g. `$29` |
| `total` | string | Display total |
| `cta` | string | Button label |
| `href` | url/path | CTA target (defaults to `/shop`) |

```json
{ "items": [ { "name": "Tote", "qty": 1, "price": "$28" } ], "total": "$28", "cta": "Checkout", "href": "/shop" }
```
