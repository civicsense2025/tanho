# site-footer

The site's `<footer>` landmark — a nestable **container** that holds the chrome
sub-blocks (`logo`, `footer-column`, `social-links`, `cta-button`, `nav-menu`).
Replaces the config-driven footer + `ChromeFooter`. Rendered by the public
layout from the published `chrome:footer` block set.

The bottom bar shows the copyright: the `copyright` override, or the derived
`© {year} {site name}` (resolved server-side — the `table` pattern, so the
footer's own fields stay editable).

| Field | Type | Notes |
| --- | --- | --- |
| `layout` | `columns \| centered \| split` | Child-cell arrangement |
| `dark` | boolean | Inverted paper-on-ink surface (semantic tokens) |
| `copyright` | string | Override; empty = derived `© {year} {site name}` |
| `blocks` | block[] | Child chrome blocks |

The `dark` variant uses the semantic `--ink-0` / `--paper-0` tokens (not the old
hardcoded hex), so it theme-tracks. Sub-blocks use `color: inherit`, so their
links read correctly on the dark surface.
