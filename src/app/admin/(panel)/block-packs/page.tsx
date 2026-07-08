import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { listEntries } from "@/modules/entries/queries";
import { BlockPacksScreen } from "@/modules/blocks/packs/admin/BlockPacksScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Block packs" };

/**
 * Reusable block trees the owner authored, imported, or installed. Export a
 * pack to share/sell, import a .pack.json from anyone. Imports are fail-safe:
 * unknown block types render as placeholders, never breaking the site.
 */
export default async function BlockPacksPage() {
  await requireUser();
  const packs = await listEntries("block_pack");
  return (
    <AdminPage width="wide">
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never }}>Block packs</h1>
        <Link href="/admin" style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}>← Dashboard</Link>
      </div>
      <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 640 }}>
        Reusable block trees you can export, share, or sell. Import a pack from anyone — unknown block types render as
        placeholders, so an import never breaks your site.
      </p>
      <BlockPacksScreen packs={packs} />
    </AdminPage>
  );
}
