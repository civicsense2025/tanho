import { z } from "zod";
import { commonContent } from "../common";
import { mediaSrcSchema } from "../image/fields";

/**
 * Site logo — an uploaded/linked image (src), or a typographic fallback:
 * initials-in-ink-square + name (mark), name only (wordmark), or square only
 * (icon). White-label rule: an empty `text` falls back to the site name at
 * render time (resolved server-side into `_resolved.siteName`), so a brand
 * default is never stored in the tree.
 */
export const logoSchema = z.object({
  ...commonContent,
  /**
   * A logo image (media-library path or https URL). When set it renders instead
   * of the typographic mark/wordmark/icon. The `src` name auto-wires the
   * MediaPicker + URL input in the inspector (see editor/ValueField MEDIA_FIELDS).
   */
  src: mediaSrcSchema,
  /** Empty = use the site name (general settings) at render time. */
  text: z.string().max(60).default(""),
  style: z.enum(["mark", "wordmark", "icon"]).default("mark"),
  /** Short glyph/letters for the icon style; empty = initials of the name. */
  icon: z.string().max(30).default(""),
  /** Bigger wordmark for statement/editorial headers. Also caps image height. */
  big: z.boolean().default(false),
  /** Flip the mark for dark footer surfaces (paper square on ink). */
  invert: z.boolean().default(false),
});

export type LogoContent = z.infer<typeof logoSchema>;

export const makeLogo = (): LogoContent =>
  logoSchema.parse({ text: "", style: "mark", icon: "" });
