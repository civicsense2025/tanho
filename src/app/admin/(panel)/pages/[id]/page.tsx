import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { getPageForEdit, listPages } from "@/modules/pages/queries";
import { resolveBoundBlocks } from "@/blocks/resolve-tree";
import { registryMap } from "@/modules/blocks/registry-queries";
import { PageEditor } from "@/editor/PageEditor";

export const metadata = { title: "Edit page" };

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [hit, all, regMap] = await Promise.all([
    getPageForEdit(id),
    listPages(),
    registryMap(),
  ]);
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

  // Enabled block types from the DB registry — drives picker filtering so a
  // disabled block can't be added. Falls back to all compiled defs if empty.
  const enabledTypes = [...regMap.values()].filter((r) => r.enabled).map((r) => r.type);

  // Fullscreen: the editor renders its own top bar and overlays the admin
  // chrome (position:fixed inset:0), matching the design's page-builder.
  return (
    <PageEditor
      page={hit.page}
      initialBlocks={resolvedBlocks}
      isDirtyVsPublished={dirty}
      pageOptions={pageOptions}
      enabledTypes={enabledTypes}
      isOwner={user.role === "owner"}
    />
  );
}
