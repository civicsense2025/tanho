# container

Centered wrapper that constrains child blocks to a layout width.

| Field | Type | Notes |
| --- | --- | --- |
| `maxWidth` | `content \| prose \| full` | `content` → `--width-content`, `prose` → `--width-prose`, `full` → no cap |
| `blocks` | block[] | Child blocks, stacked vertically |

```json
{ "maxWidth": "prose", "blocks": [] }
```
