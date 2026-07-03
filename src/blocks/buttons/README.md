# buttons

Row of CTA links styled like the core Button component. Outline buttons get the
mono uppercase label treatment and a trailing ↗. Links opening in a new tab
always carry `rel="noopener noreferrer"`.

| Field | Type | Notes |
| --- | --- | --- |
| `align` | `left \| center \| right` | Row justification |
| `items[].label` | string | Button text (≤100 chars) |
| `items[].href` | string | Must match `https?://`, `/path`, `#anchor` or `mailto:` |
| `items[].variant` | `solid \| outline` | Solid ink fill or hairline outline |
| `items[].target` | `_self \| _blank` | `_blank` adds `rel="noopener noreferrer"` |
| `items[].trackEvent` | string | Optional analytics event fired on click (`^[a-z0-9_]+$`) |
| `items[].params` | `Record<string,string>` | Small non-PII props sent with the tracked event |

```json
{
  "align": "left",
  "items": [
    { "label": "Get started", "href": "/signup", "variant": "solid", "target": "_self", "trackEvent": "cta_signup", "params": { "placement": "hero" } },
    { "label": "Learn more", "href": "https://example.com", "variant": "outline", "target": "_blank" }
  ]
}
```

When `trackEvent` is set the CTA renders through
`components/analytics/TrackedLink` on the live site (the editor canvas stays
plain), firing a fire-and-forget beacon to `/api/track` before navigation.
