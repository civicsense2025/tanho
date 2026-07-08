import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/guards";
import { getStaff, listRoles } from "@/modules/team/queries";
import { updateStaffRole, disableStaff, removeStaff, resendInvite } from "@/modules/team/actions";
import { PermissionsProvider } from "@/modules/auth/usePermissions";
import { PermissionGate } from "@/modules/auth/PermissionGate";
import { AdminPage } from "@/components/admin/AdminPage";
import { Button } from "@/components/core/Button";

export const metadata = { title: "Team member" };

/** Form-action wrapper — extracts staffId + roleId from FormData. */
async function handleUpdateRole(formData: FormData) {
  "use server";
  await updateStaffRole(
    String(formData.get("staffId") ?? ""),
    String(formData.get("roleId") ?? ""),
  );
  revalidatePath("/admin/team");
}

/** Form-action wrapper — re-enables a disabled staff member by updating role. */
async function handleEnable(formData: FormData) {
  "use server";
  const staffId = String(formData.get("staffId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  // Re-enable by updating the role (which also re-activates the user row).
  await updateStaffRole(staffId, roleId);
  revalidatePath("/admin/team");
}

/** Form-action wrapper — disables a staff member. */
async function handleDisable(formData: FormData) {
  "use server";
  await disableStaff(String(formData.get("staffId") ?? ""));
  revalidatePath("/admin/team");
}

/** Form-action wrapper — removes a staff member permanently. */
async function handleRemove(formData: FormData) {
  "use server";
  await removeStaff(String(formData.get("staffId") ?? ""));
  revalidatePath("/admin/team");
}

/** Form-action wrapper — resends an invite. */
async function handleResend(formData: FormData) {
  "use server";
  await resendInvite(String(formData.get("staffId") ?? ""));
  revalidatePath("/admin/team");
}

export default function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <StaffDetailPageInner params={params} />
    </Suspense>
  );
}

async function StaffDetailPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("team:manage");
  const [staff, roles] = await Promise.all([getStaff(id), listRoles()]);
  if (!staff) notFound();

  return (
    <PermissionsProvider permissions={user.permissions}>
      <AdminPage>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Link href="/admin/team" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textDecoration: "none" }}>
            ← Team
          </Link>
        </div>

        <h1 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          {staff.name || staff.email}
        </h1>
        <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {staff.email} · <span style={{ textTransform: "capitalize" }}>{staff.status}</span>
        </p>

        {/* Role assignment */}
        <section style={{ marginBottom: "var(--space-8)" }}>
          <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
            Role
          </h2>
          <form action={handleUpdateRole} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", flexWrap: "wrap" }}>
            <input type="hidden" name="staffId" value={staff.id} />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", flex: "1 1 240px" }}>
              <label htmlFor="roleId" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Assigned role
              </label>
              <select
                id="roleId"
                name="roleId"
                defaultValue={staff.roleId ?? ""}
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
            <Button type="submit">Update role</Button>
          </form>
        </section>

        {/* Danger zone — gated by PermissionGate so only team:manage holders see it. */}
        <PermissionGate perm="team:manage">
          <section style={{ padding: "var(--space-6)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
              Access
            </h2>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              {staff.status === "invited" ? (
                <form action={handleResend}>
                  <input type="hidden" name="staffId" value={staff.id} />
                  <Button type="submit" variant="outline">Resend invite</Button>
                </form>
              ) : null}
              {staff.status === "active" ? (
                <form action={handleDisable}>
                  <input type="hidden" name="staffId" value={staff.id} />
                  <Button type="submit" variant="outline">Disable account</Button>
                </form>
              ) : null}
              {staff.status === "disabled" ? (
                <form action={handleEnable}>
                  <input type="hidden" name="staffId" value={staff.id} />
                  <input type="hidden" name="roleId" value={staff.roleId ?? ""} />
                  <Button type="submit" variant="outline">Re-enable</Button>
                </form>
              ) : null}
              <form action={handleRemove}>
                <input type="hidden" name="staffId" value={staff.id} />
                <Button type="submit" variant="outline">Remove permanently</Button>
              </form>
            </div>
          </section>
        </PermissionGate>
      </AdminPage>
    </PermissionsProvider>
  );
}
