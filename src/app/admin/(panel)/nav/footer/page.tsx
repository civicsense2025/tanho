import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { listMenus } from "@/modules/menus/queries";
import { registryMap } from "@/modules/blocks/registry-queries";
import { resolveBoundBlocks } from "@/blocks/resolve-tree";
import { getChromeForEdit } from "@/modules/chrome/queries";
import { ChromeEditor } from "@/modules/chrome/admin/ChromeEditor";

export const metadata = { title: "Footer" };

export default function NavFooterPage() {
  return (
    <Suspense fallback={null}>
      <NavFooterPageInner />
    </Suspense>
  );
}

async function NavFooterPageInner() {
  await requireUser("owner");
  const [hit, menus, regMap] = await Promise.all([
    getChromeForEdit("chrome:footer"),
    listMenus(),
    registryMap(),
  ]);
  const dirty = JSON.stringify(hit.blocks) !== JSON.stringify(hit.publishedBlocks);
  const resolvedBlocks = await resolveBoundBlocks(hit.blocks);
  const enabledTypes = [...regMap.values()].filter((r) => r.enabled).map((r) => r.type);

  return (
    <ChromeEditor
      ownerType="chrome:footer"
      initialBlocks={resolvedBlocks}
      isDirtyVsPublished={dirty}
      enabledTypes={enabledTypes}
      firstMenuId={menus[0]?.id ?? ""}
    />
  );
}
