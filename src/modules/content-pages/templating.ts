import type { BlockNode } from "@/blocks/types";
import type { ContentRow } from "@/modules/content-schema/crud";

/**
 * `{{field}}` templating for content-type detail pages — the generalization of
 * `modules/seo/templating.ts`'s `applyTemplate` from a fixed four-token
 * metadata string to an arbitrary content row.
 *
 * Every `{{field}}` token is replaced by `String(row[field] ?? "")`, then `<`
 * and `>` are stripped from the whole result — the SAME anti-injection posture
 * as the SEO templater: the filled text lands in block content that may be
 * rendered as plain text (a heading, a callout title) where an author- or
 * content-supplied `<script>`/`<img onerror>` must never become live markup.
 * A token whose field is missing/null/undefined resolves to the empty string
 * (never the literal `undefined`).
 */

/** Matches a `{{ field }}` token; the captured group is the (trimmed) field key. */
const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Fill every `{{field}}` token in `text` from `row`, then strip `<`/`>`. */
export function applyRowTemplate(text: string, row: ContentRow): string {
  if (!text) return "";
  return text
    .replace(TOKEN_RE, (_match, key: string) => {
      const value = row[key];
      return value == null ? "" : String(value);
    })
    .replaceAll("<", "")
    .replaceAll(">", "");
}

/**
 * Walk a block tree and apply `applyRowTemplate` to every string-valued
 * property of every block's `content` (recursing into nested `content.blocks`
 * for layout blocks). Returns a NEW tree — inputs are never mutated, so the
 * owner-designed template snapshot stays reusable across rows/requests.
 *
 * Generic by construction: it fills any string field a block declares
 * (a heading's `text`, a callout's `title`/`body`, a richtext's `md`, …)
 * without hard-coding block types. Non-string values (numbers, booleans,
 * arrays, the `_resolved`/`_anchorId` machinery keys) pass through untouched —
 * only the leaf strings an author could have typed a token into are filled.
 */
export function fillBlockTree(
  blocks: BlockNode[],
  row: ContentRow,
  fieldLabels?: Map<string, string>,
): BlockNode[] {
  return blocks.map((block) => {
    // A `field` block renders one column's value from the current row — attach
    // it as `_resolved` (the same convention postlist/table use) rather than
    // token-substituting a string.
    if (block.type === "field") {
      return { ...block, content: resolveFieldContent(block.content, row, fieldLabels) };
    }
    return { ...block, content: fillContent(block.content, row, fieldLabels) };
  });
}

/**
 * Attach `{ value, label }` to a `field` block's content as `_resolved`, read
 * from `row[content.field]`. Display-safe: the value is stringified and its
 * `<`/`>` stripped, exactly like the token templater. Used both server-side
 * (fillBlockTree) and in the editor preview.
 */
export function resolveFieldContent(
  content: Record<string, unknown>,
  row: ContentRow,
  fieldLabels?: Map<string, string>,
): Record<string, unknown> {
  const key = typeof content.field === "string" ? content.field : "";
  const raw = key ? row[key] : undefined;
  const value = raw == null ? "" : String(raw).replaceAll("<", "").replaceAll(">", "");
  const label = fieldLabels?.get(key) ?? "";
  return { ...content, _resolved: { value, label } };
}

/**
 * SHALLOW fill of a single block's content: every top-level string field is
 * templated, but `blocks` (nested children) is left as-is. For the template
 * editor's canvas preview, where the editor already renders each nested block
 * through its own per-block transform — so recursing here would double-fill.
 * Display-only.
 */
export function fillContentShallow(
  content: Record<string, unknown>,
  row: ContentRow,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(content)) {
    out[key] = key !== "blocks" && typeof value === "string" ? applyRowTemplate(value, row) : value;
  }
  return out;
}

/** Recursively fill a block's content object: strings → templated, `blocks` → recursed. */
function fillContent(
  content: Record<string, unknown>,
  row: ContentRow,
  fieldLabels?: Map<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(content)) {
    if (key === "blocks" && Array.isArray(value)) {
      out[key] = fillBlockTree(value as BlockNode[], row, fieldLabels);
    } else if (typeof value === "string") {
      out[key] = applyRowTemplate(value, row);
    } else {
      out[key] = value;
    }
  }
  return out;
}
