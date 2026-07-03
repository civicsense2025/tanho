# Add a block

1. **Create the folder** `src/blocks/<type>/` with four files — copy
   `src/blocks/heading/` as the template:
   - `fields.ts` — a zod schema (spread `...commonContent`) + `make()`
     returning neutral defaults. Cap every string/array.
   - `Render.tsx` — pure JSX using only semantic CSS variables. No hooks,
     no fetching, no `"use client"`. For author HTML, sanitize through
     `src/lib/sanitize.ts` — never raw.
   - `def.ts` — export the `BlockDef` (type, category, label, icon, blurb,
     schema, make, Render; set `nestable` for layout blocks).
   - `README.md` — fields table + one example JSON.
2. **Register it**: add the import and append the def in
   `src/blocks/registry.ts`. That single edit makes it appear in the
   picker, the editor, and the renderer.
3. **Verify**: `npm run typecheck && npm run lint`, then add the block to a
   page in the admin and confirm it renders on the published page.

Rules of the house: no emoji, no hardcoded brand strings, files under 200
lines, and if the block needs a new color role, add a semantic token — do
not hardcode a hex value.
