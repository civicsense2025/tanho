import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * A single content-type field, rendered from the current row. Used inside a
 * content type's DETAIL template (src/modules/content-pages) — the render path
 * attaches the row's value as `content._resolved` (parallel to how postlist/
 * table blocks receive their `_resolved` data), and this block draws it.
 *
 * `field` is the column key (e.g. "price"); `display` picks the presentation
 * (a heading, plain text, or a labelled row). One reusable block covers every
 * field of every content type.
 */
export const fieldSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** The content-type column this renders (e.g. "price", "description"). */
  field: z.string().max(80).default(""),
  /** Presentation. `auto` = plain text; `label-value` shows the field label + value. */
  display: z.enum(["auto", "heading", "text", "label-value"]).default("auto"),
  /** Heading level when `display: "heading"`. */
  level: z.enum(["h1", "h2", "h3", "h4"]).default("h2"),
  /** Optional label override for `label-value` (defaults to the field's own label). */
  label: z.string().max(120).default(""),
  /** Optional text shown before the value (e.g. "$"). */
  prefix: z.string().max(20).default(""),
  /** Optional text shown after the value (e.g. "/mo"). */
  suffix: z.string().max(20).default(""),
});

export type FieldBlockContent = z.infer<typeof fieldSchema>;

/** The row value + label the detail-render path resolves for a field block. */
export type FieldResolved = { value: string; label: string } | null;

export const makeFieldBlock = (): FieldBlockContent =>
  fieldSchema.parse({ field: "", display: "auto", level: "h2" });
