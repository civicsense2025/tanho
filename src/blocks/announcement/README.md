# announcement

A thin promo strip, designed to sit at the top of the `site-header` (above the
bar). Pure & no-JS: the first message renders as static HTML (crawlable); the
`marquee` style scrolls all messages with pure CSS. Sits at `z-index: 50`, above
the sticky header.

Replaces the config-driven `announcement` namespace. The old JS-only rotation
and localStorage dismissal are intentionally dropped — a pure block Render can't
hold client state, and an always-visible bar is the honest no-JS baseline.

| Field | Type | Notes |
| --- | --- | --- |
| `style` | `solid \| gradient \| outline \| marquee` | Surface treatment |
| `tone` | `ink \| accent \| accent2 \| paper` | Colour (solid style only) |
| `messages[].text` | string | Message text (≤160 chars) |
| `messages[].ctaLabel` | string | Optional CTA label (≤40 chars) |
| `messages[].ctaHref` | string | CTA link (`https?://`, `/path`, `#`, `mailto:`) |

```json
{
  "style": "solid",
  "tone": "ink",
  "messages": [{ "text": "Free shipping this week", "ctaLabel": "Shop", "ctaHref": "/shop" }]
}
```

Renders nothing when no message has text. `marquee` respects
`prefers-reduced-motion` (animation off).
