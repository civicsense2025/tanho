import { z } from "zod";

/**
 * Shared, reusable style fragment carried optionally on every block. Values are
 * TOKEN-REFERENCING ENUMS, never raw px/color — so a user (or a white-label instance)
 * can restyle any block without escaping the design system or breaking responsiveness.
 * BlockShell (core/BlockShell.tsx) is the single place these enums map to CSS tokens.
 *
 * Every field is optional; an absent value means "the block's built-in default", which is
 * exactly today's hardcoded behavior — so existing content renders identically until an
 * author opts into a style.
 */
export const styleSchema = z
  .object({
    /** Text alignment of the block's content. */
    align: z.enum(["left", "center", "right"]),
    /** Horizontal sizing: constrained to prose/content width, or edge-to-edge. */
    width: z.enum(["prose", "content", "full-bleed"]),
    /** Column count for multi-item blocks (gallery, metric). Replaces hardcoded grid counts. */
    columns: z.number().int().min(1).max(6),
    /** Vertical padding, mapped to the --space-* scale. */
    padding: z.enum(["none", "sm", "md", "lg"]),
    /** Swap the local accent to the secondary accent for this block's subtree. */
    accent: z.enum(["default", "accent-2"]),
    /** Force a theme locally (e.g. a dark section on a light page). */
    theme: z.enum(["inherit", "light", "dark", "invert"]),
  })
  .partial();

export type StyleProps = z.infer<typeof styleSchema>;

/** Which style controls a given block opts into — drives which fields its editor shows.
 * A text block has no `columns`; a gallery does. */
export type StyleCapabilities = Partial<Record<keyof StyleProps, boolean>>;

/** --space-* index for each padding token. Kept next to the schema so the enum and its
 * token mapping never drift. */
export const PADDING_SPACE: Record<NonNullable<StyleProps["padding"]>, number> = {
  none: 0,
  sm: 3,
  md: 6,
  lg: 10,
};
