import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { ImportScreen } from "@/modules/importers/shared/admin/ImportScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Import from Ghost" };

/**
 * Legacy Ghost-import route, kept so old links don't 404. Now renders the SHARED
 * <ImportScreen> (ghost descriptor); the canonical home is /admin/content/import/ghost.
 */
export default function GhostImportPage() {
  return (
    <Suspense fallback={null}>
      <GhostImportPageInner />
    </Suspense>
  );
}

async function GhostImportPageInner() {
  await requireUser("owner");
  return (
    <AdminPage>
      <h1 style={{ marginBottom: "var(--space-2)" }}>Import from Ghost</h1>
      <p style={{ marginBottom: "var(--space-6)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
        Upload your Ghost content export and (optionally) members export. Nothing is written until you
        confirm the preview.
      </p>
      <ImportScreen importerId="ghost" />
    </AdminPage>
  );
}
