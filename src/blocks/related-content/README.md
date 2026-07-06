# related-content

Bound block: cards linking to published entries of a chosen content type,
resolved server-side (`resolve.ts`, cached via `listPublishedEntries` and
tagged `entries:<type>`). Crawlable real `<a>` links; semantic labelled
`<section>` + `<ul role="list">`. Built-in entity types (project/guide/resource)
— path from the entity `basePath`. Tags live in each entry's JSON `data`
(not indexed), so tag matching is an O(n) scan bounded by `limit`.

## Fields
| Field | Type | Default | Notes |
|---|---|---|---|
| `title` | string | `Related` | Section heading (empty = none) |
| `headingLevel` | `h2`\|`h3`\|`h4` | `h2` | Title's heading level — match the surrounding outline |
| `type` | string | `project` | Entity type key to pull from |
| `by` | `recent`\|`tag` | `recent` | Selection strategy |
| `tag` | string | `""` | Tag to match when `by=tag` |
| `limit` | int (1–24) | `3` | Max items |
| `cols` | int (1–4) | `3` | Grid columns (stacks on mobile) |
