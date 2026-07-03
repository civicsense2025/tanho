# list

Simple list in body type. `check` style swaps markers for a leading ✓ glyph
in the secondary accent.

| Field | Type | Notes |
| --- | --- | --- |
| `style` | `bullet \| number \| check` | Marker style |
| `items` | string[] | One entry per line (≤50 items, ≤500 chars each) |

```json
{ "style": "check", "items": ["Domain connected", "Pages published", "Newsletter live"] }
```
