import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { getPageForEdit, listPages } from "@/modules/pages/queries";
import { resolveBoundBlocks } from "@/blocks/resolve-tree";
import { PageEditor } from "@/editor/PageEditor";

export const metadata = { title: "Edit page" };

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const [hit, all] = await Promise.all([getPageForEdit(id), listPages()]);
  if (!hit) notFound();
  const dirty = JSON.stringify(hit.blocks) !== JSON.stringify(hit.publishedBlocks);

  // Pre-resolve bound (dynamic) blocks server-side so the editor canvas draws
  // their real design (profile header, project list, …) rather than a
  // placeholder. `_resolved` mirrors what the public renderer injects.
  const resolvedBlocks = await resolveBoundBlocks(hit.blocks);

  // Parent-page options for the "post nests under a page" picker — pages only,
  // never the page being edited.
  const pageOptions = all
    .filter((p) => p.kind === "page" && p.id !== hit.page.id)
    .map((p) => ({ id: p.id, title: p.title, route: p.route }));

  // Fullscreen: the editor renders its own top bar and overlays the admin
  // chrome (position:fixed inset:0), matching the design's page-builder.
  return (
    <PageEditor
      page={hit.page}
      initialBlocks={resolvedBlocks}
      isDirtyVsPublished={dirty}
      pageOptions={pageOptions}
    />
  );
}
