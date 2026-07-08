import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { getEntryForEdit } from "@/modules/entries/queries";
import { getEditorChromePreview } from "@/modules/chrome/queries";
import { registryMap } from "@/modules/blocks/registry-queries";
import { resolveBoundBlocks } from "@/blocks/resolve-tree";
import { listCustomTypes } from "@/modules/custom-types/queries";
import { getEntitySchema } from "@/entities/registry-async";
import { toEntitySchemaSummary } from "@/entities/types";
import { EntryBlockEditor } from "@/modules/entries/admin/EntryBlockEditor";

export const metadata = { title: "Edit entry" };

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  await requireUser();
  const { type: encodedType, id } = await params;
  const type = decodeURIComponent(encodedType);

  const [hit, schema, regMap, chrome] = await Promise.all([
    getEntryForEdit(id),
    getEntitySchema(type),
    registryMap(),
    getEditorChromePreview(),
  ]);
  if (!hit || !schema || hit.entry.type !== type) notFound();

  const resolvedBlocks = await resolveBoundBlocks(hit.blocks);
  const enabledTypes = [...regMap.values()].filter((r) => r.enabled).map((r) => r.type);

  let customFields;
  if (type.startsWith("custom:")) {
    const slug = type.slice("custom:".length);
    const rows = await listCustomTypes();
    customFields = rows.find((r) => r.slug === slug)?.fields;
  }

  return (
    <EntryBlockEditor
      entry={hit.entry}
      initialBlocks={resolvedBlocks}
      publishedBlocks={hit.publishedBlocks}
      headerBlocks={chrome.headerBlocks}
      footerBlocks={chrome.footerBlocks}
      enabledTypes={enabledTypes}
      customFields={customFields}
      schema={toEntitySchemaSummary(schema)}
    />
  );
}
