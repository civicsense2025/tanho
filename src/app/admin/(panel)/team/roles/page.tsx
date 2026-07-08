import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/modules/auth/guards";
import { listRoles } from "@/modules/team/queries";
import { PermissionsProvider } from "@/modules/auth/usePermissions";
import { AdminPage } from "@/components/admin/AdminPage";
import { Button } from "@/components/core/Button";

export const metadata = { title: "Roles" };

export default function RolesPage() {
  return (
    <Suspense fallback={null}>
      <RolesPageInner />
    </Suspense>
  );
}

async function RolesPageInner() {
  const user = await requirePermission("team:roles:manage");
  const roles = await listRoles();
  return (
    <PermissionsProvider permissions={user.permissions}>
      <AdminPage>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-2)" }}>
          <h1 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
            Roles
          </h1>
          <span style={{ flex: 1 }} />
          <Link href="/admin/team" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            ← Team
          </Link>
        </div>
        <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: "36rem" }}>
          Roles bundle permissions. System roles are seeded and read-only; custom roles can be tailored to your team.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-4)" }}>
          <Link href="/admin/team/roles/new">
            <Button type="button" variant="outline">+ Create role</Button>
          </Link>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>Name</th>
              <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>Description</th>
              <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>Type</th>
              <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>MFA required</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "var(--space-2) var(--space-4)" }}>
                  <Link href={`/admin/team/roles/${r.id}`} style={{ color: "var(--text)", textDecoration: "none" }}>
                    {r.name}
                  </Link>
                </td>
                <td style={{ padding: "var(--space-2) var(--space-4)", color: "var(--text-muted)" }}>{r.description || "—"}</td>
                <td style={{ padding: "var(--space-2) var(--space-4)" }}>
                  {r.isSystem ? (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)" }}>
                      System
                    </span>
                  ) : (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Custom</span>
                  )}
                </td>
                <td style={{ padding: "var(--space-2) var(--space-4)", color: "var(--text-muted)" }}>
                  {r.requireMfa ? "Yes" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminPage>
    </PermissionsProvider>
  );
}
