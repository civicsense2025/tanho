import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { permissions, rolePermissions, roles } from "./schema";
import { users } from "@/modules/auth/schema";

/**
 * Read-side queries for the team module. All staff list/get queries join the
 * `roles` table so the UI gets the role name alongside the user row without an
 * N+1. These are plain queries (no auth guard) — callers are server actions
 * or admin pages that have already authorized via `requirePermission`.
 */

export type StaffRow = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "editor";
  status: "active" | "invited" | "disabled";
  roleId: string | null;
  roleName: string | null;
  invitedAt: number | null;
  createdAt: number;
};

/** All staff with their role name (left join — a user may have no roleId). */
export async function listStaff(): Promise<StaffRow[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      roleId: users.roleId,
      roleName: roles.name,
      invitedAt: users.invitedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id));
  return rows as StaffRow[];
}

/** A single staff member with their role name. */
export async function getStaff(id: string): Promise<StaffRow | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      roleId: users.roleId,
      roleName: roles.name,
      invitedAt: users.invitedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, id));
  return (row as StaffRow | undefined) ?? null;
}

export type RoleRow = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  requireMfa: boolean;
  createdAt: number;
};

/** All roles with the `isSystem` flag (system roles are immutable). */
export async function listRoles(): Promise<RoleRow[]> {
  const rows = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      isSystem: roles.isSystem,
      requireMfa: roles.requireMfa,
      createdAt: roles.createdAt,
    })
    .from(roles);
  return rows as RoleRow[];
}

export type RoleWithPermissions = RoleRow & { permissions: string[] };

/** A role plus its resolved permission-key array. */
export async function getRoleWithPermissions(id: string): Promise<RoleWithPermissions | null> {
  const [role] = await db.select().from(roles).where(eq(roles.id, id));
  if (!role) return null;
  const perms = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, id));
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    requireMfa: role.requireMfa,
    createdAt: role.createdAt,
    permissions: perms.map((p) => p.key),
  };
}
