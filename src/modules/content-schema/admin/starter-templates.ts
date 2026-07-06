import { createBlock } from "@/blocks/registry";
import type { BlockNode } from "@/blocks/types";
import type { ContentTypeField } from "@/editor/store";

/**
 * A sensible starter DETAIL layout for a content type, built from the type's
 * own fields: the title as an H1, then each remaining shown field. Commerce-ish
 * fields (a "price"/currency) get a prominent heading + a `$` prefix; long text
 * fields render as plain text; everything else as a labelled value. Owners
 * apply this as a starting point and then customize — it's just a normal block
 * tree of `field` blocks (nothing bespoke), so every editor affordance works on it.
 */

/** Make a `field` block bound to a column, with display options. */
function fieldBlock(field: string, patch: Record<string, unknown> = {}): BlockNode {
  const block = createBlock("field");
  return { ...block, content: { ...block.content, field, ...patch } };
}

const CURRENCYISH = new Set(["price", "cost", "amount", "currency"]);
const isCurrencyField = (f: ContentTypeField) =>
  f.kind === "currency" || CURRENCYISH.has(f.key.toLowerCase());
const isLongText = (f: ContentTypeField) =>
  f.kind === "richtext" || ["description", "body", "summary", "content"].includes(f.key.toLowerCase());

/**
 * Build the starter detail template for a type.
 * `titleKey`/`slugKey` are the type's title/slug columns (skipped as body rows;
 * the title becomes the H1).
 */
export function starterDetailTemplate(
  fields: ContentTypeField[],
  titleKey: string,
  slugKey: string,
): BlockNode[] {
  const blocks: BlockNode[] = [
    // Title as a big heading.
    fieldBlock(titleKey, { display: "heading", level: "h1" }),
  ];

  for (const f of fields) {
    if (f.key === titleKey || f.key === slugKey) continue;
    if (isCurrencyField(f)) {
      blocks.push(fieldBlock(f.key, { display: "heading", level: "h3", prefix: "$" }));
    } else if (isLongText(f)) {
      blocks.push(fieldBlock(f.key, { display: "auto" }));
    } else {
      blocks.push(fieldBlock(f.key, { display: "label-value" }));
    }
  }
  return blocks;
}
