# section

Full-width band that holds child blocks — the outermost layout unit.
Sections cannot nest inside sections (see `tree.ts` nesting rules).

| Field | Type | Notes |
| --- | --- | --- |
| `width` | `contained \| full` | `full` bleeds through the page gutter |
| `background` | `none \| surface \| tint \| tint2 \| ink` | Semantic token backgrounds only |
| `py` | `none \| sm \| md \| lg \| xl` | Vertical padding scale |
| `blocks` | Block[] | Child blocks |

```json
{ "width": "full", "background": "surface", "py": "lg", "blocks": [] }
```
