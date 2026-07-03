# Paywall & content gating

Membership-gated content is enforced **on the server, in the renderer** —
never with CSS or a client check. Gated blocks are never serialized into the
HTML or the RSC payload for a reader who can't access them, so there is
nothing to reveal by disabling JavaScript or reading the network response.

## How it works

The `paywall` block is a **cut line**. In the block walker
(`src/blocks/renderer/BlockRenderer.tsx`), `RenderBlocks` iterates a sibling
list; when it reaches a paywall the current viewer can't pass, it renders the
paywall banner and **returns immediately** — every block after it in that
list is never rendered.

```
[ teaser ] [ paywall ] [ gated 1 ] [ gated 2 ]
                       └──────────── withheld for non-members ──┘
```

- A member who passes: the banner is dropped, the rest renders normally.
- Anyone else: they see the teaser + the banner, and the gated blocks never
  exist in the response.

## The viewer

`src/modules/people/viewer.ts` builds a `Viewer` from the `person_session`
cookie once per request: `{ personId, memberActive, tier }`. The gate policy
lives in one place — `viewerPassesPaywall()` in `src/blocks/paywall/gate.ts`:

- anonymous → never passes
- an untiered wall (`tier: ""`) → any active member passes
- a tiered wall → only that exact active tier passes

Only pages with `hasPaywall` (computed at publish) read the cookie, so
un-gated pages stay statically cacheable. Gated pages are dynamic by
necessity — they depend on who's asking.

## Why it's trustworthy

The load-bearing test is `src/blocks/renderer/gating.test.tsx`: it asserts
that the walker's emitted block set excludes gated blocks for anonymous and
non-member viewers, and includes them (dropping the banner) for members. Plus
`gate.test.ts` covers the tier policy. If someone refactors the walker and
breaks gating, these fail.

The end-to-end proof is a curl test in CI/verification: fetch a gated page
anonymously and assert the gated text is absent from the raw HTML.

## Fit it to your cause

- **Free preview length**: place the paywall wherever the cut should fall —
  it gates everything after it at that tree level.
- **Tiers**: name a tier on the wall to require exactly that tier; leave it
  blank for "any paying member". Tier names come from your membership
  settings.
- **Different gate rules**: `gate.ts` is the single policy function — change
  it once and every wall follows.

## FAQ

**Can I gate just the middle of a page?** The wall gates its following
siblings. To gate a bounded region, put the region in a `section` and place
the wall before it, or split the content.

**Does the editor hide gated content from me?** No — in `mode: "editor"` the
walker renders everything so authors can see and edit gated blocks. Gating
only applies to public rendering.
