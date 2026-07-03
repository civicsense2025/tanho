# paywall

A **server-enforced** cut line. Every sibling block after this one (same
tree level) is withheld from readers who don't pass — the walker stops
emitting them, so gated content never enters the HTML or RSC payload for an
unauthorized viewer.

| Field | Type | Notes |
| --- | --- | --- |
| `tier` | string | Empty = any active member; a name = that tier only |
| `title` | string | Banner heading |
| `body` | string | Explanation |
| `cta` | string | Button label |
| `ctaHref` | string | URL / path / #anchor (default `/membership`) |
| `note` | string | Small line under the CTA (e.g. "Already a member? Sign in") |

```json
{ "tier": "", "title": "The rest is for members", "cta": "Join", "ctaHref": "/membership" }
```

Gating policy lives in `gate.ts` (`viewerPassesPaywall`); the walker applies
it in `blocks/renderer/BlockRenderer.tsx`. A member who passes sees the
blocks after the wall and no banner.
