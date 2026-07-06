import { z } from "zod";
import { commonContent, styleContent } from "../common";

/**
 * A per-instance override: patch one child block of the symbol's DEFINITION tree,
 * targeted by that child's stable `id`. `patch` is a shallow content merge applied
 * at expand time and re-validated against the TARGET block's own schema (fail-closed),
 * so a bad patch blanks only that child. A `targetId` that no longer exists in the
 * definition (the author deleted/replaced that block) is silently ignored — overrides
 * are drift-safe by construction.
 */
export const symbolOverrideSchema = z
  .object({
    targetId: z.string().min(1).max(64),
    patch: z.record(z.string(), z.unknown()),
  })
  .array()
  .max(50);

export type SymbolOverride = z.infer<typeof symbolOverrideSchema>[number];

/**
 * A symbol INSTANCE. Carries only a reference to the saved definition (+ optional
 * overrides); the tree itself lives in the `symbols` DB table and is expanded by the
 * render walker. `_label` is a cosmetic cache for editor labelling — never trusted
 * for rendering (the DB row is source of truth).
 *
 * `...styleContent` lets the whole instance take the universal style layer (spacing/
 * colour/border on the expanded unit); `...commonContent` gives it `hideOn`.
 */
export const symbolSchema = z.object({
  ...commonContent,
  ...styleContent,
  symbolId: z.string().min(1).max(64),
  overrides: symbolOverrideSchema.optional(),
  _label: z.string().max(120).optional(),
});

export type SymbolContent = z.infer<typeof symbolSchema>;

export const makeSymbol = (): SymbolContent =>
  symbolSchema.parse({ symbolId: "", overrides: [] });
