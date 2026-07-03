# product

A static promo card for a marketing page. Author-typed copy only — it does
**not** read live products. The real storefront is the `/shop` routes.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Product name (≤160) |
| `priceLabel` | string | Display price, e.g. `$49` |
| `was` | string | Struck-through "compare at" price |
| `badge` | string | Small pill, e.g. `New` |
| `note` | string | One-line pitch (≤240) |
| `cta` | string | Button label |
| `href` | url/path | CTA target (web URL, `/path`, `#anchor`, `mailto:`) |

```json
{ "name": "Field Notebook", "priceLabel": "$18", "was": "$24", "badge": "Sale", "note": "Lay-flat binding, 120 gsm.", "cta": "Shop now", "href": "/shop" }
```
