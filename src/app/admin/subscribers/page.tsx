import { getAdminSession } from "@/lib/auth";
import { listSubscribers } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { redirect, notFound } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { Badge, Button } from "@/components/ui";
import { SubscriberImport } from "@/components/SubscriberImport";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const settings = await getSettings();
  if (!settings.features.newsletter) notFound();
  if (!(await getAdminSession())) redirect("/admin/login");

  const subscribers = await listSubscribers();

  return (
    <AdminPageShell title="Subscribers">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {subscribers.length} total · {subscribers.filter((s) => s.status === "active").length} active
        </p>
        <Button as="a" href="/api/subscribers?format=csv" size="sm" variant="outline">
          Export CSV
        </Button>
      </div>

      <SubscriberImport />

      <div style={{ marginTop: "var(--space-8)" }}>
        {subscribers.length === 0 ? (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No subscribers yet.</p>
        ) : (
          subscribers.map((s, i) => (
            <div
              key={s.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3) 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{s.email}</span>
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                {s.source && <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{s.source}</span>}
                <Badge status={s.status === "active" ? "published" : "draft"}>{s.status}</Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminPageShell>
  );
}
