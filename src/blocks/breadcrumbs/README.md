# breadcrumbs

Ancestor trail from the current page's `parentId` chain. Not a bound block — it
reads `RenderCtx.page` (resolved by the public page route via
`getPageAncestors`, only when a breadcrumbs block is present). Renders a
semantic `<nav aria-label="Breadcrumb"><ol>` with `aria-current="page"` on the
leaf, and emits schema.org **BreadcrumbList** JSON-LD through the existing
`breadcrumb()` builder + `<JsonLd>`. Only published ancestors are linked.

## Fields
| Field | Type | Default | Notes |
|---|---|---|---|
| `showHome` | boolean | `true` | Prepend a link to `/` |
| `homeLabel` | string | `Home` | Label for the home crumb |
| `separator` | `slash`\|`chevron`\|`dot`\|`arrow` | `chevron` | Visual separator |
| `showCurrent` | boolean | `true` | Show the current page (non-link leaf) |
