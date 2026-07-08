import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { permissions, rolePermissions, roles } from "@/modules/team/schema";
import { getAdminUser, type AdminUser } from "./session";

/**
 * Authorization guard — called at the top of EVERY admin server action and
 * in the admin panel layout (defense in depth; the layout alone is not the
 * security boundary). `role: "owner"` gates settings, payments, people
 * deletion, and integrations.
 *
 * Backward compat: the ~140 existing `requireUser("owner")` call sites keep
 * working unchanged. The resolver checks the user's permission set for the
 * `team:owner` sentinel — only the Owner system role has it.
 */
export async function requireUser(role?: "owner"): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  if (role === "owner" && !user.permissions.has("team:owner")) {
    throw new Error("Forbidden: owner role required");
  }
  return user;
}

/**
 * Permission-based guard for new code. Checks that the current admin has the
 * given permission key in their role's permission set. Throws "Forbidden" if
 * not, redirects to login if unauthenticated.
 */
export async function requirePermission(key: string): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  if (!user.permissions.has(key)) {
    throw new Error(`Forbidden: ${key} required`);
  }
  return user;
}

/**
 * Reusable wrapper for server actions — handles auth + authz in one call.
 * Eliminates the 3-line boilerplate (require + check + throw) at the top of
 * every new action. The wrapped function receives the authenticated user as
 * its first argument.
 *
 * Usage:
 *   export const createRole = withPermission("team:roles:manage",
 *     async (user, input: CreateRoleInput) => { ... });
 */
export function withPermission<TArgs extends unknown[], TResult>(
  permission: string,
  fn: (user: AdminUser, ...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const user = await requirePermission(permission);
    return fn(user, ...args);
  };
}

/**
 * Resolves the permission set for a user's roleId. Fail-closed: on any DB
 * error, returns an empty set (deny all) — never undefined or partial
 * (CWE-440). This is load-bearing defense-in-depth; do NOT remove the
 * try/catch.
 *
 * Exported for use by session.ts's getAdminUser (which loads permissions
 * once per request, avoiding N+1).
 */
export async function resolvePermissions(roleId: string | null): Promise<Set<string>> {
  if (!roleId) return new Set();
  try {
    const rows = await db
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
    return new Set(rows.map((r) => r.key));
  } catch {
    // Fail-closed: DB error → empty set → deny all (CWE-440).
    return new Set();
  }
}
