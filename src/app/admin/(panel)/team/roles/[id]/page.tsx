import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/guards";
import { getRoleWithPermissions } from "@/modules/team/queries";
import { createRole, updateRole, setRolePermissions, deleteRole } from "@/modules/team/roles-actions";
import { PERMISSION_CATALOG } from "@/modules/team/permissions";
import { PermissionsProvider } from "@/modules/auth/usePermissions";
import { AdminPage } from "@/components/admin/AdminPage";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

export const metadata = { title: "Role editor" };

/** Form-action wrapper — creates a new role from FormData. */
async function handleCreate(formData: FormData) {
  "use server";
  await createRole({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  revalidatePath("/admin/team/roles");
}

/** Form-action wrapper — updates a role's mutable fields. */
async function handleUpdate(formData: FormData) {
  "use server";
  await updateRole(String(formData.get("roleId") ?? ""), {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  revalidatePath("/admin/team/roles");
}

/** Form-action wrapper — replaces a role's permission set from checkbox values. */
async function handleSetPermissions(formData: FormData) {
  "use server";
  const roleId = String(formData.get("roleId") ?? "");
  const keys = formData.getAll("permissions").map(String);
  await setRolePermissions(roleId, keys);
  revalidatePath("/admin/team/roles");
}

/** Form-action wrapper — deletes a custom role. */
async function handleDelete(formData: FormData) {
  "use server";
  await deleteRole(String(formData.get("roleId") ?? ""));
  revalidatePath("/admin/team/roles");
}

export default function RoleEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <RoleEditorPageInner params={params} />
    </Suspense>
  );
}

async function RoleEditorPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("team:roles:manage");

  // "new" is a virtual route — no DB row, just the create form.
  const isNew = id === "new";
  const role = isNew ? null : await getRoleWithPermissions(id);
  if (!isNew && !role) notFound();

  const isSystem = role?.isSystem ?? false;
  const grantedKeys = new Set(role?.permissions ?? []);

  return (
    <PermissionsProvider permissions={user.permissions}>
      <AdminPage>
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Link href="/admin/team/roles" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textDecoration: "none" }}>
            ← Roles
          </Link>
        </div>

        <h1 style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          {isNew ? "Create role" : role!.name}
        </h1>

        {/* Role details form */}
        <section style={{ marginBottom: "var(--space-8)" }}>
          <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
            Details
          </h2>
          <form
            action={isNew ? handleCreate : handleUpdate}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: "32rem" }}
          >
            {!isNew ? <input type="hidden" name="roleId" value={role!.id} /> : null}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              <label htmlFor="name" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Name
              </label>
              <Input
                id="name"
                type="text"
                name="name"
                defaultValue={role?.name ?? ""}
                disabled={isSystem}
                required
                placeholder="e.g. Content reviewer"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              <label htmlFor="description" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Description
              </label>
              <Input
                id="description"
                type="text"
                name="description"
                defaultValue={role?.description ?? ""}
                disabled={isSystem}
                placeholder="What this role can do"
              />
            </div>
            {isSystem ? (
              <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                System roles are seeded and cannot be renamed.
              </p>
            ) : null}
            {!isSystem ? <Button type="submit" style={{ alignSelf: "flex-start" }}>{isNew ? "Create role" : "Save details"}</Button> : null}
          </form>
        </section>

        {/* Permission matrix */}
        <section style={{ marginBottom: "var(--space-8)" }}>
          <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
            Permissions
          </h2>
          {isSystem ? (
            <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              System role permissions are seed-controlled and read-only.
            </p>
          ) : null}
          <form action={handleSetPermissions}>
            {!isNew ? <input type="hidden" name="roleId" value={role!.id} /> : null}
            <div style={{ display: "grid", gap: "var(--space-2)", maxWidth: "40rem" }}>
              {PERMISSION_CATALOG.map((perm) => {
                const checked = grantedKeys.has(perm.key);
                return (
                  <label
                    key={perm.key}
                    style={{
                      display: "flex",
                      gap: "var(--space-3)",
                      alignItems: "flex-start",
                      padding: "var(--space-3) var(--space-4)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      cursor: isSystem ? "default" : "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="permissions"
                      value={perm.key}
                      defaultChecked={checked}
                      disabled={isSystem || isNew}
                      style={{ marginTop: 2 }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                      <span style={{ fontSize: "var(--text-sm)", color: "var(--text)", fontFamily: "var(--font-label)" }}>
                        {perm.key}
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        {perm.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
            {!isSystem && !isNew ? (
              <Button type="submit" style={{ marginTop: "var(--space-4)" }}>Save permissions</Button>
            ) : null}
          </form>
          {isNew ? (
            <p style={{ margin: "var(--space-4) 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Create the role first, then assign permissions.
            </p>
          ) : null}
        </section>

        {/* Delete — only for non-system custom roles */}
        {!isNew && !isSystem ? (
          <section style={{ padding: "var(--space-6)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
              Delete role
            </h2>
            <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Removing a role unassigns it from all staff. They will lose access immediately.
            </p>
            <form action={handleDelete}>
              <input type="hidden" name="roleId" value={role!.id} />
              <Button type="submit" variant="outline">Delete this role</Button>
            </form>
          </section>
        ) : null}
      </AdminPage>
    </PermissionsProvider>
  );
}
