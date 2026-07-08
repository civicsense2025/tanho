"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requirePermission } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { users } from "@/modules/auth/schema";
import { roles, permissions, rolePermissions } from "./schema";
import { isValidPermissionKey } from "./permissions";

/**
 * CRUD for custom roles + their permission assignments. System roles
 * (Owner/Editor/Author/Moderator/Viewer) are seed-controlled and reject
 * mutation here. Permission keys are validated against the catalog (CWE-20).
 */
type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const NAME_MAX = 60;

/** Create a custom role. `isSystem` is always false — system roles are seeded. */
export async function createRole(input: {
  name: string;
  description?: string;
  requireMfa?: boolean;
}): Promise<Result<{ id: string }>> {
  const user = await requirePermission("team:roles:manage");

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required" };
  if (name.length > NAME_MAX) return { ok: false, error: `Name must be ${NAME_MAX} characters or fewer` };

  const existing = await db.query.roles.findFirst({ where: eq(roles.name, name) });
  if (existing) return { ok: false, error: "A role with this name already exists" };

  const [created] = await db
    .insert(roles)
    .values({
      name,
      description: input.description?.trim() ?? "",
      requireMfa: input.requireMfa ?? false,
      isSystem: false,
    })
    .returning({ id: roles.id });

  await writeAudit({ userId: user.id, action: "team.role.create", meta: { name } });
  return { ok: true, data: { id: created!.id } };
}

/** Update a custom role's mutable fields. System roles reject. */
export async function updateRole(
  id: string,
  patch: { name?: string; description?: string; requireMfa?: boolean },
): Promise<Result> {
  const user = await requirePermission("team:roles:manage");

  const role = await db.query.roles.findFirst({ where: eq(roles.id, id) });
  if (!role) return { ok: false, error: "Role not found" };
  if (role.isSystem) return { ok: false, error: "System roles cannot be modified" };

  const values: Partial<typeof roles.$inferInsert> = {};
  if (typeof patch.name === "string") {
    const name = patch.name.trim();
    if (!name) return { ok: false, error: "Name is required" };
    if (name.length > NAME_MAX) return { ok: false, error: `Name must be ${NAME_MAX} characters or fewer` };
    if (name !== role.name) {
      const clash = await db.query.roles.findFirst({ where: eq(roles.name, name) });
      if (clash) return { ok: false, error: "A role with this name already exists" };
    }
    values.name = name;
  }
  if (typeof patch.description === "string") values.description = patch.description.trim();
  if (typeof patch.requireMfa === "boolean") values.requireMfa = patch.requireMfa;

  if (Object.keys(values).length > 0) {
    await db.update(roles).set(values).where(eq(roles.id, id));
  }

  await writeAudit({ userId: user.id, action: "team.role.update", ownerId: id });
  return { ok: true };
}

/**
 * Delete a custom role. Affected users are reassigned to the Viewer system
 * role (fail-safe default — least privilege among system roles). System roles
 * reject. Role→permission junction rows for this role are cleared first.
 */
export async function deleteRole(id: string): Promise<Result> {
  const user = await requirePermission("team:roles:manage");

  const role = await db.query.roles.findFirst({ where: eq(roles.id, id) });
  if (!role) return { ok: false, error: "Role not found" };
  if (role.isSystem) return { ok: false, error: "System roles cannot be deleted" };

  const viewer = await db.query.roles.findFirst({ where: eq(roles.name, "Viewer") });
  if (!viewer) return { ok: false, error: "Viewer system role not found" };

  // Reassign affected users to Viewer (least-privilege fail-safe).
  await db.update(users).set({ roleId: viewer.id }).where(eq(users.roleId, id));
  // Clear junction rows, then drop the role.
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
  await db.delete(roles).where(eq(roles.id, id));

  await writeAudit({ userId: user.id, action: "team.role.delete", ownerId: id });
  return { ok: true };
}

/**
 * Replace a custom role's permission set. Diffs against the current set and
 * applies only additions/removals. Every key is validated against the catalog
 * (CWE-20) — any unknown key rejects the whole call. System roles reject;
 * their permissions are seed-controlled.
 */
export async function setRolePermissions(roleId: string, permissionKeys: string[]): Promise<Result> {
  const user = await requirePermission("team:roles:manage");

  const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
  if (!role) return { ok: false, error: "Role not found" };
  if (role.isSystem) return { ok: false, error: "System role permissions are seed-controlled" };

  // CWE-20: validate every key against the catalog before touching the DB.
  const invalid = permissionKeys.find((k) => !isValidPermissionKey(k));
  if (invalid) return { ok: false, error: `Unknown permission key: ${invalid}` };

  const desired = new Set(permissionKeys);

  // Current keys for this role.
  const current = await db
    .select({ key: permissions.key, id: permissions.id })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));
  const currentKeyToId = new Map(current.map((r) => [r.key, r.id]));
  const currentKeys = new Set(currentKeyToId.keys());

  const addedKeys = [...desired].filter((k) => !currentKeys.has(k));
  const removedKeys = [...currentKeys].filter((k) => !desired.has(k));

  // Resolve ids for added keys.
  const allPerms = await db.query.permissions.findMany();
  const permByKey = new Map(allPerms.map((p) => [p.key, p.id]));

  if (removedKeys.length > 0) {
    const removedIds = removedKeys.map((k) => currentKeyToId.get(k)).filter((id): id is string => !!id);
    if (removedIds.length > 0) {
      await db
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, roleId),
            inArray(rolePermissions.permissionId, removedIds),
          ),
        );
    }
  }

  if (addedKeys.length > 0) {
    const rows = addedKeys
      .map((k) => permByKey.get(k))
      .filter((id): id is string => !!id)
      .map((permissionId) => ({ roleId, permissionId }));
    if (rows.length > 0) {
      await db.insert(rolePermissions).values(rows);
    }
  }

  await writeAudit({
    userId: user.id,
    action: "team.role.permissions.update",
    ownerId: roleId,
    meta: { added: addedKeys, removed: removedKeys },
  });
  return { ok: true };
}
