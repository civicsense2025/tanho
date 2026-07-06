"use client";

import Link from "next/link";
import type { BlockNode } from "@/blocks/types";
import type { FieldDef } from "@/modules/custom-types/validation";
import { typeTemplateOwner, type TypeTemplateKind } from "@/modules/content-pages/template-owners";
import { fillContentShallow, resolveFieldContent } from "@/modules/content-pages/templating";
import { BlockCanvasEditor } from "@/editor/BlockCanvasEditor";
import { useEditor } from "@/editor/store";
import shell from "@/editor/editor-shell.module.css";
import { saveDraftTypeTemplate, publishTypeTemplate } from "../template-actions";
import { starterDetailTemplate } from "./starter-templates";

/**
 * Owner-designed template editor for a table-backed content type's INDEX or
 * DETAIL page. Thin wrapper over the shared BlockCanvasEditor (the same one
 * pages/entries/chrome use), pointed at owner `type-template:<kind>:<slug>` —
 * the exact block_sets key the public renderer reads. Mirrors ChromeEditor's
 * shape but for a per-type owner. Detail templates can use `{{field}}` tokens
 * in text blocks (filled from a row at render); index templates hold an
 * `entry-list` block to list the rows.
 */
export function TypeTemplateEditor({
  typeId,
  typeName,
  slug,
  kind,
  initialBlocks,
  initialDraftDiffers,
  headerBlocks,
  footerBlocks,
  sampleRow,
  fields,
  titleField = "title",
  slugField = "slug",
}: {
  typeId: string;
  typeName: string;
  slug: string;
  kind: TypeTemplateKind;
  initialBlocks: BlockNode[];
  initialDraftDiffers: boolean;
  /** The type's title/slug columns (default to the spine columns). */
  titleField?: string;
  slugField?: string;
  /** Real published site chrome, shown read-only around the canvas. */
  headerBlocks: BlockNode[];
  footerBlocks: BlockNode[];
  /**
   * A real (or synthetic) row whose values fill the detail template's
   * `{{field}}` tokens + `field` blocks on the canvas, so the owner previews
   * real data. Null when the type has no rows and no fields to synthesize.
   */
  sampleRow: Record<string, unknown> | null;
  /** The type's field defs — drive the field labels + the picker's per-field suggestions. */
  fields: FieldDef[];
}) {
  const kindLabel = kind === "index" ? "Index (listing)" : "Detail (per-row)";
  const fieldLabels = new Map(fields.map((f) => [f.key, f.label]));
  // Detail templates preview real data on the canvas (display-only — the store/
  // Inspector/save keep raw tokens + field keys): a `field` block resolves its
  // column value, any other block's string fields fill {{field}} tokens. The
  // index template lists rows via an entry-list block, so no fill there.
  const previewContent =
    kind === "detail" && sampleRow
      ? (content: Record<string, unknown>, type: string) =>
          type === "field"
            ? resolveFieldContent(content, sampleRow, fieldLabels)
            : fillContentShallow(content, sampleRow)
      : undefined;
  return (
    <BlockCanvasEditor
      ownerType={typeTemplateOwner(kind, slug)}
      ownerId={slug}
      initialBlocks={initialBlocks}
      initialDraftDiffers={initialDraftDiffers}
      headerBlocks={headerBlocks}
      footerBlocks={footerBlocks}
      previewContent={previewContent}
      contentTypeContext={{
        slug,
        fields: fields.map((f) => ({ key: f.key, label: f.label, kind: f.kind })),
      }}
      screenLabel={`${typeName} · ${kindLabel} template`}
      settingsLabel="Template"
      settingsPanel={
        <div style={{ padding: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          <p style={{ margin: "0 0 var(--space-2)" }}>
            Editing the <strong>{kindLabel}</strong> template for <strong>{typeName}</strong>.
          </p>
          {kind === "detail" ? (
            <p style={{ margin: 0 }}>
              The canvas shows a sample row so you can preview the real layout. Select a text block and edit its{" "}
              <code>{"{{field}}"}</code> tokens (e.g. <code>{"{{price}}"}</code>) in the Block panel — each fills
              from the row when the page renders.
            </p>
          ) : (
            <p style={{ margin: 0 }}>Add an “Entry list” block to list this type’s rows as cards.</p>
          )}
        </div>
      }
      topBarLeft={
        <>
          <Link href="/admin/content/types" className={shell.back}>
            ← {typeName}
          </Link>
          {kind === "detail" ? (
            <StarterButton
              fields={fields.map((f) => ({ key: f.key, label: f.label, kind: f.kind }))}
              titleField={titleField}
              slugField={slugField}
            />
          ) : null}
        </>
      }
      onSaveBlocks={(tree) => saveDraftTypeTemplate(typeId, kind, tree)}
      onPublish={() => publishTypeTemplate(typeId, kind)}
    />
  );
}

/**
 * "Use starter layout" — replaces the canvas with a sensible default detail
 * template built from the type's fields (via the store's `apply`, so it
 * autosaves like any edit). Confirms first, since it overwrites current blocks.
 */
function StarterButton({
  fields,
  titleField,
  slugField,
}: {
  fields: { key: string; label: string; kind: string }[];
  titleField: string;
  slugField: string;
}) {
  const apply = useEditor((s) => s.apply);
  const clearSelection = useEditor((s) => s.clearSelection);
  const blockCount = useEditor((s) => s.blocks.length);
  return (
    <button
      type="button"
      className={shell.back}
      onClick={() => {
        if (blockCount > 0 && !window.confirm("Replace the current template with the starter layout?")) return;
        clearSelection();
        apply(() => starterDetailTemplate(fields, titleField, slugField));
      }}
    >
      ✧ Starter layout
    </button>
  );
}
