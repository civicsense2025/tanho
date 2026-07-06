# footer-column

A titled column of footer links, resolved from a saved menu (see
`modules/menus`). The resolver flattens the menu's items (each item plus its
children) into `_resolved.items` (the `table` pattern — a resolver without a
`bound` def, so `title`/`menuId` stay editable). Replaces one entry of the
footer config's `columns[]`.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Column heading (≤40 chars); empty = no heading |
| `menuId` | string | Menu whose items become the links (≤64 chars) |

```json
{ "title": "Explore", "menuId": "" }
```

`color: inherit`, so it reads correctly on the dark `site-footer`. Renders
nothing when it has neither a title nor any resolved links.
