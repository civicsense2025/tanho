import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { AdminPage } from "@/components/admin/AdminPage";
import { IMPORTERS } from "@/modules/importers/shared/registry";

export const metadata = { title: "Import content" };

/**
 * The Import hub — one card per registered importer (registry.IMPORTERS). Adding an
 * importer to the registry surfaces it here automatically. Owner-only, matching every
 * importer's own action guard.
 */
export default async function ImportHubPage() {
  await requireUser("owner");
  return (
    <AdminPage>
      <h1 style={{ marginBottom: "var(--space-2)" }}>Import content</h1>
      <p style={{ marginBottom: "var(--space-6)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
        Bring content in from another platform. Nothing is written until you review the preview and confirm.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {IMPORTERS.map((imp) => (
          <Link
            key={imp.id}
            href={`/admin/content/import/${imp.id}`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              padding: "var(--space-5)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              background: "var(--surface)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--text)" }}>{imp.label}</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  color: "var(--text-faint)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xs)",
                  padding: "1px 6px",
                }}
              >
                {imp.acceptSummary}
              </span>
            </div>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: 1.4 }}>
              {imp.description}
            </span>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}
