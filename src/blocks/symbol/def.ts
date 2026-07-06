import type { BlockDef } from "../types";
import { makeSymbol, symbolSchema } from "./fields";
import { RenderSymbol } from "./Render";

/**
 * A saved reusable content block (global symbol). An instance references a
 * definition tree stored in the `symbols` DB table by `content.symbolId`; the
 * render walker expands it in place (edit-once-update-all).
 *
 * Registered so instances pass strict `validateBlockTree` (unregistered types are
 * dropped on page save). NOT `nestable`: the expansion is virtual (comes from the
 * definition, not stored inline), so tree ops treat an instance as one opaque leaf
 * — which is exactly what makes it a "locked unit" in the editor. NOT `bound`:
 * expansion needs the whole tree + call-stack cycle state, so it lives inline in the
 * walker rather than in the scalar-returning resolver registry.
 */
export const symbolDef: BlockDef<typeof symbolSchema> = {
  type: "symbol",
  category: "content",
  label: "Saved block",
  icon: "component",
  blurb: "A reusable saved block — edit once, updates everywhere",
  schema: symbolSchema,
  make: makeSymbol,
  Render: RenderSymbol,
};
