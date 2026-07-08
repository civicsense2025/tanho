import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { listEntries } from "@/modules/entries/queries";
import { DesignPacksScreen } from "@/modules/blocks/design-packs/admin/DesignPacksScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Design packs" };

/**
 * Theme + page template bundles. Import a .pack.json, export one, or activate
 * a design pack to apply its theme and create its pages. Imports are fail-safe:
 * unknown block types render as placeholders, never breaking the site.
 */
export default async function DesignPacksPage() {
  await requireUser();
  const packs = await listEntries("design_pack");
  return (
    <AdminPage width="wide">
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never }}>Design packs</h1>
        <Link href="/admin/settings/brand/themes" style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}>← Themes</Link>
      </div>
      <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 640 }}>
        Complete templates — a theme plus page layouts. Activate a design pack to apply its theme and create its pages
        in one step. Import a pack from anyone; unknown block types render as placeholders, so an import never breaks your site.
      </p>
      <DesignPacksScreen packs={packs} />
    </AdminPage>
  );
}
