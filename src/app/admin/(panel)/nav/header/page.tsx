import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { listMenus } from "@/modules/menus/queries";
import { registryMap } from "@/modules/blocks/registry-queries";
import { resolveBoundBlocks } from "@/blocks/resolve-tree";
import { getChromeForEdit } from "@/modules/chrome/queries";
import { ChromeEditor } from "@/modules/chrome/admin/ChromeEditor";

export const metadata = { title: "Header" };

export default function NavHeaderPage() {
  return (
    <Suspense fallback={null}>
      <NavHeaderPageInner />
    </Suspense>
  );
}

async function NavHeaderPageInner() {
  await requireUser("owner");
  const [hit, menus, regMap] = await Promise.all([
    getChromeForEdit("chrome:header"),
    listMenus(),
    registryMap(),
  ]);
  const dirty = JSON.stringify(hit.blocks) !== JSON.stringify(hit.publishedBlocks);
  // Pre-resolve bound sub-blocks (logo → site name, nav-menu → menu items) so
  // the editor canvas draws the real chrome, not placeholders — mirrors pages.
  const resolvedBlocks = await resolveBoundBlocks(hit.blocks);
  const enabledTypes = [...regMap.values()].filter((r) => r.enabled).map((r) => r.type);

  return (
    <ChromeEditor
      ownerType="chrome:header"
      initialBlocks={resolvedBlocks}
      isDirtyVsPublished={dirty}
      enabledTypes={enabledTypes}
      firstMenuId={menus[0]?.id ?? ""}
    />
  );
}
