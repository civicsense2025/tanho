import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { getTableBackedType, getSampleRow } from "@/modules/content-schema/admin-queries";
import { loadTypeTemplateForEdit } from "@/modules/content-schema/template-actions";
import { getEditorChromePreview } from "@/modules/chrome/queries";
import { TypeTemplateEditor } from "@/modules/content-schema/admin/TypeTemplateEditor";
import type { TypeTemplateKind } from "@/modules/content-pages/template-owners";

export const metadata = { title: "Template editor" };

export default function TypeTemplatePage({
  params,
}: {
  params: Promise<{ id: string; kind: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Inner params={params} />
    </Suspense>
  );
}

async function Inner({ params }: { params: Promise<{ id: string; kind: string }> }) {
  await requireUser("owner");
  const { id, kind } = await params;
  if (kind !== "index" && kind !== "detail") notFound();
  const templateKind = kind as TypeTemplateKind;

  const type = await getTableBackedType(id);
  if (!type) notFound();

  const [loaded, chrome, sampleRow] = await Promise.all([
    loadTypeTemplateForEdit(type.id, templateKind),
    getEditorChromePreview(),
    getSampleRow(type),
  ]);
  if (!loaded.ok) notFound();

  return (
    <TypeTemplateEditor
      typeId={type.id}
      typeName={type.name}
      slug={type.slug}
      kind={templateKind}
      initialBlocks={loaded.blocks}
      initialDraftDiffers={loaded.draftDiffers}
      headerBlocks={chrome.headerBlocks}
      footerBlocks={chrome.footerBlocks}
      sampleRow={sampleRow}
      fields={type.fields}
      titleField={type.titleField ?? "title"}
      slugField={type.slugField ?? "slug"}
    />
  );
}
