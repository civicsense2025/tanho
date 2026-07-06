# section

Full-width band that holds child blocks — the outermost layout unit.
Sections cannot nest inside sections (see `tree.ts` nesting rules).

| Field | Type | Notes |
| --- | --- | --- |
| `width` | `contained \| full` | `full` bleeds through the page gutter |
| `background` | `none \| surface \| tint \| tint2 \| ink` | Semantic token backgrounds only |
| `py` | `none \| sm \| md \| lg \| xl` | Vertical padding scale |
| `layout` | LayoutStyle | Advanced flex/grid/positioning (token-enums, per-breakpoint base/tablet/desktop). See `blocks/common.ts` `layoutStyleContent` |
| `customCss` | string | Raw-CSS escape hatch (≤20k). Sanitised + page-scoped by `lib/css-sanitizer.ts` on save AND render |
| `blocks` | Block[] | Child blocks |

```json
{ "width": "full", "background": "surface", "py": "lg", "blocks": [] }
```
