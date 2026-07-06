# social-links

A compact row of social/label links, resolved from a saved menu (see
`modules/menus`). The resolver loads the menu's items into `_resolved.items`
(the `table` pattern — a resolver without a `bound` def, so `menuId`/`align`
stay editable). Replaces the footer config's `socialMenuId`.

| Field | Type | Notes |
| --- | --- | --- |
| `menuId` | string | Menu whose items become the row; empty = nothing (≤64 chars) |
| `align` | `left \| center \| right` | Row justification |

```json
{ "menuId": "", "align": "left" }
```

Uses `color: inherit`, so it renders correctly on the dark `site-footer`
surface. Renders nothing when the menu is empty.
