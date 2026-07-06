# reading-progress

A scroll-driven progress bar for long pages. CSS-first: filled by
`animation-timeline: scroll()` where supported (zero JS); the shared island
(`blocks/client/enhancements.tsx`) provides a `requestAnimationFrame` fallback
via `--reading-progress` elsewhere. Decorative (`aria-hidden`).

## Fields
| Field | Type | Default | Notes |
|---|---|---|---|
| `position` | `top`\|`under-header`\|`bottom` | `top` | Fixed edge (`under-header` offsets by `--header-height`) |
| `thickness` | `thin`\|`medium`\|`thick` | `thin` | Bar height |
| `color` | `accent`\|`accent-2`\|`ink` | `accent` | Fill colour (token) |
