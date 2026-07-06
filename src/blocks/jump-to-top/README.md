# jump-to-top

Back-to-top button — a plain `<a href="#top">` (the page's `<main id="top">`)
that works with zero JS. The shared island reveals it only past `showAfter` px
(and smooth-scrolls when a TOC opts the page into smooth scrolling); with no JS
it stays visible and functional.

## Fields
| Field | Type | Default | Notes |
|---|---|---|---|
| `align` | `left`\|`right` | `right` | Corner it pins to |
| `showAfter` | int (0–5000) | `400` | Scroll px before it appears |
| `label` | string | `Back to top` | Accessible label / tooltip |
