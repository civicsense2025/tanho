import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/lib/db/schema";
import { permissions, roles, rolePermissions } from "./schema";
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLES,
  SYSTEM_ROLE_PERMISSIONS,
} from "./permissions";

/**
 * A handle that supports the query/insert/update/delete API — covers both the
 * production `db` (LibSQLDatabase) and a `db.transaction` callback's `tx`
 * (SQLiteTransaction). Mirrors the `Tx` extraction in
 * `src/modules/portability/import.ts`.
 *
 * Derived from drizzle-orm's own types + the aggregated schema (not
 * `@/lib/db/client`, which has top-level await and breaks the seed script's
 * tsx/cjs bundle). The seeder receives its db handle as a parameter and never
 * touches the global one.
 */
type DbInstance = LibSQLDatabase<typeof schema>;
type SeedableDb =
  | DbInstance
  | Parameters<Parameters<DbInstance["transaction"]>[0]>[0];

/**
 * Idempotently seeds the permission catalog, the five system roles, and the
 * system role → permission assignments. Safe to call on a fresh DB (the
 * migration only creates the tables — rows come from here or `npm run seed`)
 * and safe to re-run on an existing DB (upserts by unique key).
 *
 * Shared by `seed/modules/team.ts` and the first-owner install path
 * (`src/modules/auth/first-owner.ts`), so a fresh deploy that skips the seed
 * and goes straight through the web wizard still gets the Owner role + the
 * `team:owner` sentinel that `requireUser("owner")` authorizes against.
 *
 * Accepts a `SeedableDb` so one function serves the production `db`, a
 * transaction `tx`, and the seed script's `seedDb()`. Returns a `roleIds` map
 * (name → id) so callers can look up the Owner role id when creating the
 * first user.
 */
export async function ensureSystemRolesSeeded(
  db: SeedableDb,
): Promise<Record<string, string>> {
  // 1. Permission catalog — idempotent upsert by key.
  for (const perm of PERMISSION_CATALOG) {
    const existing = await db.query.permissions.findFirst({
      where: eq(permissions.key, perm.key),
    });
    if (existing) {
      await db
        .update(permissions)
        .set({ description: perm.description })
        .where(eq(permissions.id, existing.id));
    } else {
      await db.insert(permissions).values({
        key: perm.key,
        description: perm.description,
      });
    }
  }

  // 2. System roles — idempotent upsert by name. Capture ids as we go.
  const roleIds: Record<string, string> = {};
  for (const role of SYSTEM_ROLES) {
    const existing = await db.query.roles.findFirst({
      where: eq(roles.name, role.name),
    });
    if (existing) {
      await db
        .update(roles)
        .set({
          description: role.description,
          isSystem: role.isSystem,
          requireMfa: role.requireMfa,
        })
        .where(eq(roles.id, existing.id));
      roleIds[role.name] = existing.id;
    } else {
      const [inserted] = await db
        .insert(roles)
        .values({
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          requireMfa: role.requireMfa,
        })
        .returning({ id: roles.id });
      roleIds[role.name] = inserted!.id;
    }
  }

  // 3. System role → permission assignments — delete + re-insert so catalog
  //    edits in code propagate on re-seed. Custom roles are untouched.
  const allPerms = await db.query.permissions.findMany();
  const permByKey = new Map(allPerms.map((p) => [p.key, p.id]));

  for (const [roleName, keys] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
    const roleId = roleIds[roleName];
    if (!roleId) continue;
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    for (const key of keys) {
      const permId = permByKey.get(key);
      if (!permId) continue;
      await db.insert(rolePermissions).values({ roleId, permissionId: permId });
    }
  }

  return roleIds;
}
