import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { ImportScreen } from "@/modules/importers/shared/admin/ImportScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Import from WordPress" };

/** Legacy route kept so old links don't 404; renders the shared <ImportScreen>.
 *  Canonical home is the hub at /admin/content/import/wordpress. */

export default function WordpressImportPage() {
  return (
    <Suspense fallback={null}>
      <WordpressImportPageInner />
    </Suspense>
  );
}

async function WordpressImportPageInner() {
  await requireUser("owner");
  return (
    <AdminPage>
      <h1 style={{ marginBottom: "var(--space-2)" }}>Import from WordPress</h1>
      <p style={{ marginBottom: "var(--space-6)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
        Upload your WordPress export (an <code>.xml</code> WXR file). Nothing is written until you confirm
        the preview. Comments and custom post types are optional.
      </p>
      <ImportScreen importerId="wordpress" />
    </AdminPage>
  );
}
