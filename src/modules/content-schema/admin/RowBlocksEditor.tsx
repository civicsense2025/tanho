"use client";

import Link from "next/link";
import type { BlockNode } from "@/blocks/types";
import type { FieldDef } from "@/modules/custom-types/validation";
import { rowBlocksOwner } from "@/modules/content-pages/template-owners";
import { fillContentShallow, resolveFieldContent } from "@/modules/content-pages/templating";
import { BlockCanvasEditor } from "@/editor/BlockCanvasEditor";
import shell from "@/editor/editor-shell.module.css";
import { saveDraftRowBlocks, publishRowBlocks } from "../row-blocks-actions";

/**
 * Owner-designed layout editor for ONE custom-type ROW's own bespoke detail
 * page. Thin wrapper over the shared BlockCanvasEditor (the same one
 * pages/entries/chrome/templates use), pointed at owner `entry:custom:<slug>`
 * with ownerId = the row's id — the exact block_sets key the public renderer
 * reads (getPublishedRowBlocks). Mirrors TypeTemplateEditor's detail mode but
 * for a single row: the canvas previews the REAL row so `field` blocks resolve
 * their column value and any text block's `{{field}}` tokens fill from it.
 */
export function RowBlocksEditor({
  typeId,
  typeName,
  slug,
  rowId,
  rowTitle,
  initialBlocks,
  initialDraftDiffers,
  headerBlocks,
  footerBlocks,
  row,
  fields,
}: {
  typeId: string;
  typeName: string;
  slug: string;
  rowId: string;
  rowTitle: string;
  initialBlocks: BlockNode[];
  initialDraftDiffers: boolean;
  /** Real published site chrome, shown read-only around the canvas. */
  headerBlocks: BlockNode[];
  footerBlocks: BlockNode[];
  /** The actual row record, used to preview real data on the canvas. */
  row: Record<string, unknown>;
  /** The type's field defs — drive the field labels + the picker's per-field suggestions. */
  fields: FieldDef[];
}) {
  const fieldLabels = new Map(fields.map((f) => [f.key, f.label]));
  // Preview real data on the canvas (display-only — the store/Inspector/save
  // keep raw tokens + field keys): a `field` block resolves its column value,
  // any other block's string fields fill {{field}} tokens from the row.
  const previewContent = (content: Record<string, unknown>, type: string) =>
    type === "field"
      ? resolveFieldContent(content, row, fieldLabels)
      : fillContentShallow(content, row);
  return (
    <BlockCanvasEditor
      ownerType={rowBlocksOwner(slug)}
      ownerId={rowId}
      initialBlocks={initialBlocks}
      initialDraftDiffers={initialDraftDiffers}
      headerBlocks={headerBlocks}
      footerBlocks={footerBlocks}
      previewContent={previewContent}
      contentTypeContext={{
        slug,
        fields: fields.map((f) => ({ key: f.key, label: f.label, kind: f.kind })),
      }}
      screenLabel={`${typeName} · ${rowTitle} layout`}
      settingsLabel="Layout"
      settingsPanel={
        <div style={{ padding: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          <p style={{ margin: "0 0 var(--space-2)" }}>
            Editing the bespoke layout for <strong>{rowTitle}</strong> ({typeName}).
          </p>
          <p style={{ margin: 0 }}>
            The canvas shows this row so you can preview the real layout. Select a text block and edit its{" "}
            <code>{"{{field}}"}</code> tokens (e.g. <code>{"{{price}}"}</code>) in the Block panel — each fills
            from the row when the page renders. A published layout here overrides the shared detail template.
          </p>
        </div>
      }
      topBarLeft={
        <Link href={`/admin/content/types/${typeId}/rows`} className={shell.back}>
          ← {typeName} rows
        </Link>
      }
      onSaveBlocks={(tree) => saveDraftRowBlocks(typeId, rowId, tree)}
      onPublish={() => publishRowBlocks(typeId, rowId)}
    />
  );
}
