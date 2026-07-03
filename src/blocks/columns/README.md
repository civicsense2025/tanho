# columns

Column grid like `row`, with a configurable stack breakpoint. Children are
typically `container` blocks — one per column.

| Field | Type | Notes |
| --- | --- | --- |
| `cols` | number | Column count, 2–4 |
| `stackAt` | `mobile \| tablet` | Device size at which columns stack to one |
| `blocks` | block[] | Child blocks, one per column |

```json
{ "cols": 2, "stackAt": "tablet", "blocks": [] }
```
