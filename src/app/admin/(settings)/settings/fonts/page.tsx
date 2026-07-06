import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { listFontFamilies } from "@/modules/fonts/actions";
import { GOOGLE_FONTS } from "@/modules/fonts/google";
import { FontsManager } from "@/modules/fonts/admin/FontsManager";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Fonts" };

/**
 * Fonts manager — add a Google font (self-hosted) or upload your own font
 * files (drag files, a folder, or a .zip), grouped into families with
 * per-weight/style faces, plus page-speed guidance.
 */
export default function FontsSettingsPage() {
  return (
    <Suspense fallback={null}>
      <FontsSettingsPageInner />
    </Suspense>
  );
}

async function FontsSettingsPageInner() {
  await requireUser("owner");
  const res = await listFontFamilies();
  const families = res.ok ? (res.data ?? []) : [];
  return (
    <AdminPage>
      <FontsManager initialFamilies={families} googleFonts={GOOGLE_FONTS} />
    </AdminPage>
  );
}
