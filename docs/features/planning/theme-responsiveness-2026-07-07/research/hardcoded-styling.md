# Research: Hardcoded Styling Audit (Blocks + Editor + Admin)

## A. Token vocabulary available
**Colors** (`src/styles/tokens/colors.css`): `--bg`, `--surface`, `--surface-hover`, `--surface-card`, `--text`, `--text-muted`, `--text-faint`, `--text-on-accent`, `--border`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-tint`, `--accent-2`, `--accent-2-hover`, `--accent-2-tint`, `--solid`, `--solid-hover`, `--focus-ring`, `--selection-bg/f g`, `--success`, `--danger` + primitives `--paper-0/1/2`, `--ink-0/1/2`, `--line-0/1`, `--olive-*`, `--maroon-*`, `--white`, `--black`.
**Typography** (`typography.css`): `--font-sans`, `--font-mono`, `--font-display/heading/body/label`, `--weight-regular/medium`, `--text-display/h1/h2/lg/body/sm/xs/2xs`, `--leading-*`, `--tracking-*`.
**Spacing** (`spacing.css`): `--space-1..12`, `--width-prose/content/form`, `--gutter`, `--radius-xs/sm/md`, `--border-width`, `--hairline`, `--shadow-none/sm/md/lg/focus`, `--ease*`, `--dur*`, `--transition`.
**Dynamic** (`css-vars.ts`): theme system generates all color tokens from brand settings.

## B. Token-driven blocks (good citizens — ~40 blocks)
heading, buttons, cta-button, section, site-header, site-footer, nav-menu, callout, accordion, testimonial, quote, pricing, product, productgrid, carousel, profile-header, statement, form, field, newsletter, image, gallery, embed, richtext, columns, row, container, divider, icon, logo, metric, counter, progress, timeline, faq, tabs, table, footer-column, social-links, video. All consume `var(--*)` for colors/spacing/type/radii.

## C. Blocks with hardcoded styling
| Block | File | Hardcoded | Lines |
|---|---|---|---|
| spacer | Render.tsx | `height: \`${size}px\`` | 6 |
| badge | Render.tsx | `#157f52`, `#b45309`, `gap:4px` | 12-13, 26-27 |
| alert | Render.tsx | `#157f52`, `#b45309`, `#b0342f`, `gap:2px` | 13-15, 31-32 |
| testimonial | Render.tsx | `letterSpacing:2px`, `36x36` | 8, 36 |
| carousel/gallery | Render.tsx | `marginTop:6px` | 38-42 |
| buttons | Render.tsx | `padding:9px 18px` | 19 |
| nav-menu | Render.tsx | `paddingLeft: 10 + depth*16` | 94 |
| nav-menu | nav.module.css | many px (gap:5px, padding:8px 9px, font-size:8px, width:200px…) | 28,38,49,127,142,150,189,224,273,281,292 |
| toggle/stepper/countdown/lottie/flip-card | Render.tsx | px dims | various |
| video | Render.tsx | `52x52`, `fontSize:18px` | 20,30 |
| tooltip | tooltip.module.css | `max-width:240px`, transforms | 17-66 |
| tabs | tabs.module.css | `border-radius:0` (underline variant) | 49 |
| marquee | marquee.module.css | `#000` in mask-image (intentional) | 8-9 |
| before-after | .module.css | `2px`, `34x34`, transforms | 47-100 |
| rating | Render.tsx | `letterSpacing:1px` | 45 |

**Intentionally fixed (do NOT tokenize):** status colors in alert/badge (`#157f52`/`#b45309`/`#b0342f` — semantic meaning must not shift with brand); marquee mask `#000` (only alpha matters); `border-radius:0` in underline/tab variants (design choice).

## D. Editor chrome hardcoded values
`canvas.module.css`, `editor-shell.module.css`, `editor.module.css`, `preview-chrome.module.css` — many hardcoded px for UI dims (button 22x22, panel 336px, gap 6px, etc.). **Acceptable:** editor chrome is a fixed admin interface; these are component dimensions, not theme-responsive values. They DO use tokens for colors/borders/shadows where it matters.

## E. Admin components hardcoded values
`EntityList.module.css`, `chrome.module.css` — similar hardcoded UI dims. Acceptable for same reason.

## F. Patterns making tokenization hard
1. **Inline `style={{}}` in TSX** — many blocks use inline styles vs CSS modules (heading, buttons, callout, alert, testimonial, quote, pricing, product, carousel, profile-header, statement, field, metric, counter, progress, timeline, faq, table, spacer, badge, icon, logo, video, toggle, stepper, countdown, lottie, flip-card). Tokens must be string `"var(--token)"`; no calc/color-mix.
2. **Dynamic colors in props** — alert/badge map tone to fixed semantic colors (intentional); callout maps tone to accent tokens (good pattern).
3. **Computed spacing** — nav-menu `10 + depth*16`; spacer user-configurable px.
4. **Component-specific dims** — icon/button sizes (26/28/34/52px), button paddings, border widths (1/2/3px), small gaps (2/4/6px). Marginal benefit to tokenize.
5. **CSS mask gradients** — marquee `#000` (technical requirement).
6. **Transform offsets** — tooltip/before-after (geometric, not visual).

## G. Recommended tokenization approach
**Phase 1 (quick wins):** add `--space-0-5:2px`, `--space-1-5:6px`, `--size-icon-sm/md/lg/xl`, `--border-width-thin/medium/thick` to `spacing.css`; replace hardcoded values via grep-based sweep.
**Phase 2:** convert spacer from px to space-step enum; tokenize button paddings (`--padding-button-sm/md`); nav depth offset (`--nav-depth-offset`).
**Phase 3 (structural):** incrementally migrate inline `style={{}}` to CSS modules per block during other work.
**Don't change:** status colors, mask gradients, admin/editor chrome dims, geometric transforms.

## Summary
Codebase is **~85–90% token-driven** for theme-responsive properties (colors, semantic spacing, typography, radii, shadows). Remaining hardcoded values are mostly intentional (status colors, masks) or component-specific dims with marginal theme benefit. The tokenization sweep (Tier 3) improves consistency but is NOT a blocker for theme responsiveness — dark mode works today for any block using `var(--*)`.
