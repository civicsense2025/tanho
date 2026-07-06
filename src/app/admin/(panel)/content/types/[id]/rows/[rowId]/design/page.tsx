import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { getTableBackedType } from "@/modules/content-schema/admin-queries";
import { rowById } from "@/modules/content-schema/row-actions";
import { loadRowBlocksForEdit } from "@/modules/content-schema/row-blocks-actions";
import { getEditorChromePreview } from "@/modules/chrome/queries";
import { resolveBoundBlocks } from "@/blocks/resolve-tree";
import { RowBlocksEditor } from "@/modules/content-schema/admin/RowBlocksEditor";

export const metadata = { title: "Row layout editor" };

export default function RowDesignPage({
  params,
}: {
  params: Promise<{ id: string; rowId: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Inner params={params} />
    </Suspense>
  );
}

async function Inner({ params }: { params: Promise<{ id: string; rowId: string }> }) {
  await requireUser("owner");
  const { id, rowId } = await params;

  const type = await getTableBackedType(id);
  if (!type) notFound();

  const [row, loaded, chrome] = await Promise.all([
    rowById(type.tableName, rowId),
    loadRowBlocksForEdit(type.id, rowId),
    getEditorChromePreview(),
  ]);
  if (!row) notFound();
  if (!loaded.ok) notFound();

  // Pre-resolve bound (dynamic) blocks server-side so the editor canvas draws
  // their real design rather than a placeholder — `_resolved` mirrors what the
  // public renderer injects (same as the pages editor route).
  const resolvedBlocks = await resolveBoundBlocks(loaded.blocks);

  const rowTitle = String(row.title ?? row.slug ?? "Untitled");

  return (
    <RowBlocksEditor
      typeId={type.id}
      typeName={type.name}
      slug={type.slug}
      rowId={rowId}
      rowTitle={rowTitle}
      initialBlocks={resolvedBlocks}
      initialDraftDiffers={loaded.draftDiffers}
      headerBlocks={chrome.headerBlocks}
      footerBlocks={chrome.footerBlocks}
      row={row}
      fields={type.fields}
    />
  );
}
