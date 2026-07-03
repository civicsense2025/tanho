# Blocks

Every page is a tree of blocks. One registry drives everything: the picker,
the editor form, the inspector, and the renderer all read the same
`BlockDef` — a block registers once in `src/blocks/registry.ts` or it
doesn't exist.

## Anatomy of a block

```
src/blocks/<type>/
  fields.ts    zod schema + make() defaults — the content contract
  Render.tsx   pure presentation (no fetching, no hooks, CSS vars only)
  resolve.ts   (bound blocks only) server-side data resolution
  def.ts       assembles the BlockDef
  README.md    fields table + example JSON
```

The **purity rule** is what lets the admin canvas and the public site share
one renderer: `Render` receives fully resolved content and just draws it.
Server work (database reads for dynamic blocks) lives in `resolve.ts`,
which only ever runs on the server.

## Validation — fail closed, twice

1. **On save** (`modules/pages/blocks-io.ts`): the whole tree is validated —
   shape, then every node's content against its registry schema, recursively.
   Unknown types and invalid content are rejected with a message.
2. **On render** (`blocks/renderer/BlockRenderer.tsx`): each node is parsed
   again; an invalid or unknown block renders *nothing* rather than
   something wrong.

## Nesting

Layout blocks (`section`, `container`, `row`, `columns`) hold children in
`content.blocks`. `src/blocks/tree.ts` has the pure tree operations
(find/locate/insert/remove/move/clone) shared by the editor UI and server
actions, plus the nesting rules (sections can't contain sections; rows and
columns can't contain sections or each other).

## Two-save separation

Structured page fields (title, route, SEO…) live on the `pages` row; the
block tree lives in `block_sets` keyed `(ownerType, ownerId, variant)`.
The editor autosaves the `draft` variant; **Publish** validates and copies
draft → `published`, recomputes `hasPaywall`, and invalidates cache tags.
Visitors only ever read the published variant.

## FAQ

**Why does my new block render nothing?** Its content probably fails the
zod schema — check the server console in dev (invalid blocks log a warning)
and remember defaults come from `make()`.

**Can a block fetch its own data?** No — that breaks editor/public parity.
Put server reads in `resolve.ts` and keep `Render` pure.

See [../recipes/add-a-block.md](../recipes/add-a-block.md) for the
step-by-step.
