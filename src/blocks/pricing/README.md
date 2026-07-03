# pricing

A Stripe-style tier comparison table. Author-typed copy only.

| Field | Type | Notes |
| --- | --- | --- |
| `tiers[]` | array | Up to 6 columns |
| `tiers[].name` | string | Tier name |
| `tiers[].price` | string | Display price, e.g. `$19` |
| `tiers[].cadence` | string | e.g. `/mo` |
| `tiers[].features` | string[] | Feature bullets (≤20) |
| `tiers[].cta` | string | Button label |
| `tiers[].href` | url/path | CTA target |
| `tiers[].featured` | boolean | Highlights the column |
| `tiers[].trackEvent` | string | Optional analytics event fired on CTA click (`^[a-z0-9_]+$`) |
| `tiers[].params` | `Record<string,string>` | Small non-PII props sent with the tracked event |

```json
{ "tiers": [ { "name": "Pro", "price": "$19", "cadence": "/mo", "features": ["Priority support"], "cta": "Choose Pro", "href": "#", "featured": true, "trackEvent": "pricing_choose", "params": { "tier": "pro" } } ] }
```

When `trackEvent` is set the tier CTA renders through
`components/analytics/TrackedLink` on the live site and beacons `/api/track`.
