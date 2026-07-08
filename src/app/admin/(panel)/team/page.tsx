import { Suspense } from "react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/guards";
import { listStaff, listRoles } from "@/modules/team/queries";
import { inviteStaff } from "@/modules/team/actions";
import { PermissionsProvider } from "@/modules/auth/usePermissions";
import { AdminPage } from "@/components/admin/AdminPage";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

export const metadata = { title: "Team" };

/** Form-action wrapper — extracts FormData and calls the typed inviteStaff action. */
async function handleInvite(formData: FormData) {
  "use server";
  await inviteStaff({
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    roleId: String(formData.get("roleId") ?? ""),
  });
  revalidatePath("/admin/team");
}

export default function TeamPage() {
  return (
    <Suspense fallback={null}>
      <TeamPageInner />
    </Suspense>
  );
}

async function TeamPageInner() {
  const user = await requirePermission("team:manage");
  const [staff, roles] = await Promise.all([listStaff(), listRoles()]);
  return (
    <PermissionsProvider permissions={user.permissions}>
      <AdminPage>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-2)" }}>
          <h1 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
            Team
          </h1>
          <span style={{ flex: 1 }} />
          <Link href="/admin/team/roles" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Roles &amp; permissions →
          </Link>
        </div>
        <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: "36rem" }}>
          Invite staff, assign roles, and manage who has access to this site.
        </p>

        {/* Invite form — minimal inline form posting to the inviteStaff server action. */}
        <form
          action={handleInvite}
          style={{
            display: "flex",
            gap: "var(--space-3)",
            alignItems: "flex-end",
            flexWrap: "wrap",
            padding: "var(--space-4)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            marginBottom: "var(--space-8)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", flex: "1 1 220px" }}>
            <label htmlFor="invite-email" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Email
            </label>
            <Input id="invite-email" type="email" name="email" placeholder="teammate@example.com" required />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", flex: "1 1 160px" }}>
            <label htmlFor="invite-name" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Name
            </label>
            <Input id="invite-name" type="text" name="name" placeholder="Jordan Lee" required />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", flex: "1 1 180px" }}>
            <label htmlFor="invite-role" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Role
            </label>
            <select
              id="invite-role"
              name="roleId"
              required
              style={{
                padding: "var(--space-2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: "var(--text-sm)",
              }}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.isSystem ? " (system)" : ""}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Send invite</Button>
        </form>

        {/* Staff list */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>Name</th>
              <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>Email</th>
              <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>Role</th>
              <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>Status</th>
              <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>Invited</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "var(--space-2) var(--space-4)" }}>
                  <Link href={`/admin/team/${s.id}`} style={{ color: "var(--text)", textDecoration: "none" }}>
                    {s.name || "—"}
                  </Link>
                </td>
                <td style={{ padding: "var(--space-2) var(--space-4)", color: "var(--text-muted)" }}>{s.email}</td>
                <td style={{ padding: "var(--space-2) var(--space-4)" }}>{s.roleName ?? "—"}</td>
                <td style={{ padding: "var(--space-2) var(--space-4)" }}>
                  <StatusBadge status={s.status} />
                </td>
                <td style={{ padding: "var(--space-2) var(--space-4)", color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                  {s.invitedAt ? new Date(s.invitedAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {staff.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-muted)" }}>
                  No staff yet. Invite your first teammate above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </AdminPage>
    </PermissionsProvider>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "active" ? "var(--success)" :
      status === "invited" ? "var(--text-muted)" :
        status === "disabled" ? "var(--danger)" :
          "var(--text-muted)";
  return (
    <span style={{
      fontSize: "var(--text-xs)",
      color,
      textTransform: "capitalize",
    }}>
      {status}
    </span>
  );
}
