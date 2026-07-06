# container

Centered wrapper that constrains child blocks to a layout width.

| Field | Type | Notes |
| --- | --- | --- |
| `maxWidth` | `content \| prose \| full` | `content` → `--width-content`, `prose` → `--width-prose`, `full` → no cap |
| `layout` | LayoutStyle | Advanced flex/grid/positioning (token-enums, per-breakpoint base/tablet/desktop). See `blocks/common.ts` `layoutStyleContent` |
| `customCss` | string | Raw-CSS escape hatch (≤20k). Sanitised + page-scoped by `lib/css-sanitizer.ts` on save AND render |
| `blocks` | block[] | Child blocks, stacked vertically |

```json
{ "maxWidth": "prose", "blocks": [] }
```
