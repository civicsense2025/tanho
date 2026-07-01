import { z } from "zod";
import { getBlockSpec } from "../registry";
import { styleSchema, type StyleProps } from "./style-schema";

/**
 * Validates a persisted block tree at the trust boundary. Replaces the old unchecked
 * `JSON.parse(raw).blocks` (which could 500 a whole page on a single malformed block from a
 * hand edit, bad deploy, or corrupt content write). Invalid or unknown blocks are DROPPED with
 * a server-side warning — never thrown — so one bad block can't take down the page.
 *
 * Two on-disk shapes are supported for backward-compat:
 *  - content blocks:    { type, content, style?, variant?, sortOrder? }
 *  - data-bound blocks: { type, props,   style?,           sortOrder? }  (homepage home.json)
 * Both normalize to { type, content, style?, variant? } where `content` carries either the
 * block content or the data-bound props. Content-block content is validated against its spec's
 * Zod schema (filling schema defaults); data-bound props pass through (their renderers own
 * their prop defaults).
 */

export interface ValidatedBlock {
  type: string;
  content: Record<string, unknown>;
  style?: StyleProps;
  variant?: string;
}

const rawBlockSchema = z.object({
  type: z.string(),
  content: z.record(z.string(), z.unknown()).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  style: styleSchema.optional(),
  variant: z.string().optional(),
});

function warn(msg: string) {
  // Server-side visibility without crashing the render.
  console.warn(`[blocks] ${msg}`);
}

/** Parse a raw JSON string (or already-parsed value) holding `{ blocks: [...] }` into a
 * validated, render-safe block list. Returns [] on a structurally invalid document. */
export function parseBlocks(raw: string | unknown): ValidatedBlock[] {
  let doc: unknown;
  if (typeof raw === "string") {
    try {
      doc = JSON.parse(raw);
    } catch {
      warn("page block JSON failed to parse; rendering no blocks");
      return [];
    }
  } else {
    doc = raw;
  }

  const outer = z.object({ blocks: z.array(z.unknown()) }).safeParse(doc);
  if (!outer.success) {
    warn("block document has no valid `blocks` array; rendering no blocks");
    return [];
  }

  const out: ValidatedBlock[] = [];
  for (const item of outer.data.blocks) {
    const parsed = rawBlockSchema.safeParse(item);
    if (!parsed.success) {
      warn(`dropping malformed block: ${parsed.error.message}`);
      continue;
    }
    const b = parsed.data;
    const spec = getBlockSpec(b.type);

    if (spec) {
      // Content block: validate its content against the spec schema (fills defaults).
      const contentResult = spec.schema.safeParse(b.content ?? {});
      if (!contentResult.success) {
        warn(`dropping "${b.type}" block with invalid content: ${contentResult.error.message}`);
        continue;
      }
      out.push({ type: b.type, content: contentResult.data as Record<string, unknown>, style: b.style, variant: b.variant });
      continue;
    }

    // Data-bound block (homepage list): props pass through under `content`.
    out.push({ type: b.type, content: b.props ?? b.content ?? {}, style: b.style });
  }
  return out;
}
