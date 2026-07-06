import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { AdminPage } from "@/components/admin/AdminPage";
import { getImporter } from "@/modules/importers/shared/registry";
import { ImportScreen } from "@/modules/importers/shared/admin/ImportScreen";

export const metadata = { title: "Import" };

/**
 * Runs one importer, resolved by id from the registry. The generic <ImportScreen> is
 * driven entirely by the importer's descriptor. Owner-only (each importer's actions
 * also guard themselves — defense in depth). `params` is a Promise in this Next build.
 */
export default async function ImportRunPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("owner");
  const { id } = await params;
  const importer = getImporter(id);
  if (!importer) notFound();
  return (
    <AdminPage>
      <p style={{ marginBottom: "var(--space-3)" }}>
        <Link href="/admin/content/import" style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          ← All importers
        </Link>
      </p>
      <h1 style={{ marginBottom: "var(--space-2)" }}>Import from {importer.label}</h1>
      <p style={{ marginBottom: "var(--space-6)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
        {importer.description}
      </p>
      <ImportScreen importerId={id} />
    </AdminPage>
  );
}
