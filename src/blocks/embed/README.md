# embed

Sandboxed third-party embed. Six providers render as an `<iframe>` that
appears ONLY when the https URL's hostname and path match the provider
allowlist — anything else shows the striped placeholder card:

- `youtube` — `(www.)youtube.com/embed/...`, or `youtu.be/<id>` (rewritten to `youtube.com/embed/<id>`)
- `figma` — `www.figma.com/embed...`
- `maps` — `www.google.com/maps/embed...`
- `vimeo` — `player.vimeo.com/video/...`
- `spotify` — `open.spotify.com/embed/...`
- `soundcloud` — `w.soundcloud.com/...`

The seventh, `twitter`, renders differently — X's embed mechanism has no
plain-iframe form. It renders the documented
`<blockquote class="twitter-tweet">` markup plus a `platform.twitter.com/widgets.js`
script (loaded once per page via `next/script`'s dedup, however many tweets
are embedded), which scans the page and replaces the blockquote with the
rendered tweet client-side.

The iframe always carries `sandbox="allow-scripts allow-same-origin
allow-presentation"`, `loading="lazy"` and
`referrerPolicy="strict-origin-when-cross-origin"`.

**`url` is expected to already be resolved.** Resolution (turning a plain
share link like `vimeo.com/76979871` or `soundcloud.com/artist/track` into
the provider's actual embed/iframe URL) happens ONCE, at write time — see
[`modules/embeds/resolve.ts`](../../modules/embeds/resolve.ts) — not live at
render. SoundCloud in particular can't be pattern-matched from a plain share
URL at all; it requires a real oEmbed API call, which is why that resolution
step exists as its own module rather than living inline here. `youtube`,
`vimeo`, and `spotify` still tolerate an unresolved plain share URL directly
in `url` too, so a hand-authored block continues to work without going
through the resolver.

| Field | Type | Notes |
| --- | --- | --- |
| `provider` | `youtube \| figma \| maps \| vimeo \| spotify \| soundcloud \| twitter` | Which allowlist/render-mode applies |
| `url` | string | `https://` URL (≤2000 chars) or empty — the resolved embed URL, or (for `twitter`) the tweet URL itself |
| `ratio` | `16 / 9 \| 4 / 3 \| 1 / 1 \| 21 / 9` | CSS aspect-ratio of the frame (ignored for `twitter`) |

```json
{ "provider": "youtube", "url": "https://youtu.be/dQw4w9WgXcQ", "ratio": "16 / 9" }
```
