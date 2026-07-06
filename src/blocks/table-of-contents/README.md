# table-of-contents

Auto-generated, in-page navigation built from the page's heading blocks. Not a
bound block — it reads the page's precomputed heading outline from
`RenderCtx.outline` (a bound resolver only sees its own content, never the
sibling tree). The outline is built once per request by the public page route
(`buildOutline`, `src/modules/pages/outline.ts`) and its anchor ids match the
`id`s `heading` blocks emit, so links always resolve.

CSS-first and fully crawlable: the server HTML is a working `<nav><ol>` of
`#slug` anchor links that needs no JavaScript. The optional active-section
highlight is layered on by the shared client island
(`src/blocks/client/enhancements.tsx`) via the `data-toc-link` hooks; with JS
off, the `:target` CSS fallback still highlights the anchored heading.

## Fields

| Field             | Type                                   | Default          | Notes |
| ----------------- | -------------------------------------- | ---------------- | ----- |
| `title`           | string (≤80)                           | `"On this page"` | Heading above the list; empty = none |
| `minLevel`        | `h1` \| `h2` \| `h3` \| `h4`           | `h2`             | Shallowest heading included |
| `maxLevel`        | `h1` \| `h2` \| `h3` \| `h4`           | `h3`             | Deepest heading included (order-tolerant vs minLevel) |
| `marker`          | `numbered` \| `bulleted` \| `plain`    | `plain`          | List marker style |
| `collapsible`     | boolean                                | `false`          | Wrap in a native `<details>` (no JS) |
| `sticky`          | boolean                                | `false`          | Pin below the header (`--header-height`) while scrolling |
| `highlightActive` | boolean                                | `true`           | Scroll-spy active state (island; degrades gracefully) |
| `smoothScroll`    | boolean                                | `true`           | Smooth anchor scrolling (island sets it on `<html>`, respecting reduced-motion) |

Plus the universal `style` (opt-in style layer) and `hideOn` fields.

## Example JSON

```json
{
  "id": "toc1",
  "type": "table-of-contents",
  "content": { "title": "Contents", "minLevel": "h2", "maxLevel": "h3", "sticky": true }
}
```
