import { Fragment } from "react";
import type { RenderCtx, BlockNode } from "../types";
import type { CollectionContent } from "./fields";
import type { CollectionRecord } from "./resolve";

/**
 * Repeats the item template (`content.blocks`) once per bound record, each with a
 * different record in context (threaded via `ctx.children(..., { record })`).
 * Atoms in the template bind to the record through `{{record.field}}` tokens.
 *
 * Editor: render the template ONCE against a sample record so the author designs a
 * single representative card. Public: repeat per record; empty → nothing.
 */
export function RenderCollection({
  content,
  ctx,
}: {
  content: CollectionContent & { _resolved?: CollectionRecord[] | null };
  ctx: RenderCtx;
}) {
  const records = content._resolved ?? [];
  const template = content.blocks as BlockNode[];

  if (ctx.mode === "editor") {
    if (records.length === 0) {
      return (
        <div data-collection>
          <div
            style={{
              padding: "var(--space-6)",
              textAlign: "center",
              border: "1px dashed var(--border-strong)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-faint)",
              fontSize: "var(--text-sm)",
            }}
          >
            Collection has no records yet — add data to preview cards.
          </div>
        </div>
      );
    }
    const sample = records[0];
    return <div data-collection>{ctx.children(template, { record: sample })}</div>;
  }

  if (records.length === 0) return null;
  return (
    <div data-collection>
      {records.map((record, i) => (
        <Fragment key={String(record._href ?? record.slug ?? i)}>
          {ctx.children(template, { record })}
        </Fragment>
      ))}
    </div>
  );
}
