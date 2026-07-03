# donation

A static CTA card linking to the site's `/donate` page. Author-typed copy
only — the real donation flow (amount entry via Stripe's customer-adjustable
Price, checkout, webhook reconciliation) lives entirely at `/donate` and in
`src/modules/donations/`.

| Field | Type | Notes |
| --- | --- | --- |
| `heading` | string | Card heading |
| `body` | string | Optional supporting copy |
| `cta` | string | Button label (defaults to "Donate") |

```json
{ "heading": "Support our work", "body": "Every contribution helps.", "cta": "Donate" }
```
