import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { ImportScreen } from "@/modules/importers/shared/admin/ImportScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Import from Squarespace" };

/** Legacy route kept so old links don't 404; renders the shared <ImportScreen>.
 *  Canonical home is the hub at /admin/content/import/squarespace. */

export default function SquarespaceImportPage() {
  return (
    <Suspense fallback={null}>
      <SquarespaceImportPageInner />
    </Suspense>
  );
}

async function SquarespaceImportPageInner() {
  await requireUser("owner");
  return (
    <AdminPage>
      <h1 style={{ marginBottom: "var(--space-2)" }}>Import from Squarespace</h1>
      <p style={{ marginBottom: "var(--space-6)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
        Export your Squarespace site as WordPress (Settings → Import &amp; Export → Export), then upload the{" "}
        <code>.xml</code> file here. Nothing is written until you confirm the preview.
      </p>
      <ImportScreen importerId="squarespace" />
    </AdminPage>
  );
}
