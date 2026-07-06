# nav-menu

Site navigation rendered from a saved menu (see `modules/menus`). The resolver
loads the menu's items server-side into `_resolved.items` (the `table` pattern —
a resolver without a `bound` def, so `menuId`/`variant` stay editable). Replaces
the config-driven header `menuId` plus the `NavInline` / `MobileNav` pair.
Renders a `<nav aria-label>` landmark.

- **Desktop** — an inline bar with dropdowns. Dropdowns open on CSS
  `:hover` / `:focus-within` (no JS), in the item's `dropdownStyle`
  (`simple` / `mega` / `cards` / `icons`).
- **Mobile (≤720px)** — a native `<details>` disclosure (no JS, crawlable,
  keyboard-accessible). The burger is the single `<summary>`; opening it shows
  a drawer / fullscreen / dropdown panel per `mobileStyle`, and the burger
  becomes a fixed ✕ to close.

| Field | Type | Notes |
| --- | --- | --- |
| `menuId` | string | Menu to render; empty = first menu (≤64 chars) |
| `variant` | `plain \| underline \| tabs \| pill \| vertical` | Desktop inline style |
| `mobileStyle` | `drawer-right \| drawer-left \| fullscreen \| dropdown` | Mobile panel |
| `ariaLabel` | string | `<nav>` landmark label (default "Primary") |
| `slice` | `all \| first-half \| second-half` | Which top-level items the DESKTOP nav shows (split evenly, `Math.ceil(count/2)` in the first half; nested children stay with their parent item). The mobile burger always shows the complete menu regardless — see below |

```json
{ "menuId": "", "variant": "plain", "mobileStyle": "drawer-right", "ariaLabel": "Primary", "slice": "all" }
```

`slice` exists so two `nav-menu` blocks can share one menu split around a
centered logo — the header `layout: "split"` arrangement (`[nav-menu
slice:"first-half", logo, nav-menu slice:"second-half"]`). A single nav-menu
almost always wants `all`. Desktop and mobile intentionally show different
content here: the mobile burger is one control per block, so if it obeyed
`slice` too, a split header's mobile view would show two half-menu burgers
instead of one complete one — always showing the full menu on mobile keeps
that single-control experience regardless of how many nav-menu blocks the
desktop layout splits across.

No-JS behaviour: with JavaScript disabled the desktop dropdowns still open on
hover/focus and the mobile drawer still opens/closes via the native `<details>`.
Renders nothing when the resolved menu is empty. If `slice` leaves the
desktop half empty (e.g. `second-half` of a 1-item menu), the desktop `<nav>`
is omitted entirely rather than rendering an empty landmark — the mobile
burger (showing the full menu) still renders.
