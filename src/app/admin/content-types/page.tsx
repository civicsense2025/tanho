import { getAdminSession } from "@/lib/auth";
import { listContentTypes } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { Badge, Button, TextLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ContentTypesPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const types = await listContentTypes();

  return (
    <AdminPageShell title="Content Types">
      <div style={{ marginBottom: "var(--space-6)" }}>
        <Button as="a" href="/admin/content-types/new" size="sm" variant="outline">+ New content type</Button>
      </div>
      {types.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No content types yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {types.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3) var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                {t.icon && <span style={{ fontSize: "var(--text-lg)" }}>{t.icon}</span>}
                <span style={{ fontWeight: 500 }}>{t.name}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{t.slug}</span>
                {t.isBuiltIn === 1 && <Badge status="published">Built-in</Badge>}
              </div>
              <TextLink arrow="forward" muted href={`/admin/content-types/${t.id}`} style={{ fontSize: "var(--text-xs)" }}>
                Edit
              </TextLink>
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
