# site-header

The site's `<header>` landmark — a nestable **container** that holds the chrome
sub-blocks (`logo`, `nav-menu`, `cta-button`, `announcement`). Replaces the
config-driven header + `ChromeHeader`. Rendered by the public layout from the
published `chrome:header` block set.

Publishes **`--header-height`** on the element (a no-JS constant matching the
bar's min-height + border), so Phase-1 heading/section `scroll-margin-top` and
the `under-header` reading-progress bar clear the sticky bar. An overlay
(transparent) header publishes `0px` (it takes no layout height).

| Field | Type | Notes |
| --- | --- | --- |
| `sticky` | boolean | Pin to top on scroll (translucent + blur) |
| `layout` | `spread \| center \| split \| stack \| sidebar` | Child arrangement across the bar; `sidebar` turns the whole header into a full-height left column (the public shell detects this and switches to a side-by-side page layout) |
| `transparentOnHero` | boolean | Transparent overlay bar (publishes `--header-height: 0`). No effect with `layout: "sidebar"` |
| `twoTier` | boolean | Adds a thin utility strip above the main bar (ported from the old "two-tier" recipes). Never combines with `layout: "sidebar"` |
| `utilityText` | string | Text for the utility strip; empty = the site's general tagline (resolved server-side). Only shown when `twoTier` is true |
| `blocks` | block[] | Child chrome blocks |

Layouts: `spread` pushes the first child (logo) left and the rest right;
`center` centres everything; `split` puts the first child left, last right,
middle centred; `stack` drops all children below the logo on a centred row;
`sidebar` stacks them vertically the full column height (nav expected to be a
`nav-menu` with `variant: "vertical"`).

On mobile (≤720px) the bar collapses to logo + the `nav-menu`'s burger (the
`sidebar` layout also collapses to a normal top bar — no room for a
full-height column on a narrow viewport).
