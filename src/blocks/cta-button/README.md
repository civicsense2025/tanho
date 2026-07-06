# cta-button

A single call-to-action anchor styled like the core Button — for the site
header or footer. Replaces the config-driven header `cta` object; the block's
existence is the old `cta.enabled`.

| Field | Type | Notes |
| --- | --- | --- |
| `label` | string | Button text (≤40 chars); empty renders nothing |
| `href` | string | `https?://`, `/path`, `#anchor`, `mailto:`, or empty |
| `variant` | `solid \| accent \| outline` | Ink fill, accent fill, or hairline outline |

```json
{ "label": "Get started", "href": "/join", "variant": "solid" }
```

Internal (`/…`) links route through `next/link`; external links get
`rel="noopener noreferrer"`. Outline variant appends a trailing ↗.
