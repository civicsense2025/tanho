# row

CSS grid of equal columns holding child blocks. Collapses to one column on
mobile.

| Field | Type | Notes |
| --- | --- | --- |
| `cols` | number | Column count, 2–4 |
| `gap` | `sm \| md \| lg` | Column/row gap |
| `align` | `start \| center \| stretch` | Vertical alignment of items |
| `layout` | LayoutStyle | Advanced flex/grid/positioning (token-enums, per-breakpoint base/tablet/desktop). See `blocks/common.ts` `layoutStyleContent` |
| `customCss` | string | Raw-CSS escape hatch (≤20k). Sanitised + page-scoped by `lib/css-sanitizer.ts` on save AND render |
| `blocks` | block[] | Child blocks, one per cell |

```json
{ "cols": 3, "gap": "md", "align": "stretch", "blocks": [] }
```
