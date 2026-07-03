# account

The reader's own membership panel. Anonymous viewers see a "Sign in to manage
your membership" prompt; signed-in members see their plan, status, since, and
next-bill date.

This block has no fields. It is **bound**: `resolve.ts` reads the CURRENT
viewer (`getViewer`) and their active membership server-side — it never takes a
person id from block content, so it can only ever render the requesting
reader's data. `Render` is pure and receives the resolved state via
`content._resolved`.

```json
{}
```
