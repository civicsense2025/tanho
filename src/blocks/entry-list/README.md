# entry-list

A live card grid of a **content type's** published rows (see
`src/modules/content-schema`). Bound block: `resolve.ts` (server-only) loads the
type by `contentType` (slug or base path), lists its published rows, and maps
each to a card linking to `{basePath}/{slugField}`. Used inside an owner-designed
index template (`block_sets` owner `type-template:index:<slug>`), where
`contentType` is stamped to that type's slug.

| Field | Type | Notes |
| --- | --- | --- |
| `contentType` | string | Content-type slug (e.g. `products`) or base path (`/products`). Empty = the page's own type. |
| `limit` | number | Max rows to show (1–100, default 24). |

```json
{ "contentType": "products", "limit": 24 }
```

The card title is the row's `titleField`; the secondary line is the first
owner-defined field that isn't the title or slug. When the binding names no
published, table-backed type, the block renders nothing (empty list).

Registered in `src/blocks/registry.ts` and `src/blocks/resolvers.ts`. Needs a
`block_registry` seed row (`type: "entry-list"`, `category: "dynamic"`) — seeded
from the compiled def like every other built-in.
