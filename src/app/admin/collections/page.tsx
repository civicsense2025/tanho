import { getAdminSession } from "@/lib/auth";
import { listCollections } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { Button, TextLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const collections = await listCollections();

  return (
    <AdminPageShell title="Collections">
      <div style={{ marginBottom: "var(--space-6)" }}>
        <Button as="a" href="/admin/collections/new" size="sm" variant="outline">+ New collection</Button>
      </div>
      {collections.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No collections yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {collections.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3) var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{ fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{c.slug}</span>
              </div>
              <TextLink arrow="forward" muted href={`/admin/collections/${c.id}`} style={{ fontSize: "var(--text-xs)" }}>
                Edit
              </TextLink>
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
