import { eq } from "drizzle-orm";
import { users } from "../../src/modules/auth/schema";
import { ensureSystemRolesSeeded } from "../../src/modules/team/seed";
import { log, type SeedDb } from "../lib";

/**
 * Seeds the permission catalog, five system roles, system role → permission
 * assignments, and backfills `users.roleId` for existing rows (idempotent).
 * Steps 1-3 are shared with the first-owner install path via
 * `ensureSystemRolesSeeded` so a fresh deploy that skips the seed still gets
 * the Owner role + `team:owner` sentinel.
 */
export async function seedTeam(db: SeedDb) {
  const roleIds = await ensureSystemRolesSeeded(db);
  log(`team: seeded system roles + permission assignments`);

  // Backfill users.roleId for existing rows (one-time, guarded by IS NULL).
  const ownerRoleId = roleIds["Owner"];
  const editorRoleId = roleIds["Editor"];
  if (ownerRoleId && editorRoleId) {
    const allUsers = await db.query.users.findMany();
    let backfilled = 0;
    for (const user of allUsers) {
      if (user.roleId) continue; // already set — never re-touch custom roles
      const targetRoleId = user.role === "owner" ? ownerRoleId : editorRoleId;
      await db.update(users).set({ roleId: targetRoleId }).where(eq(users.id, user.id));
      backfilled++;
    }
    if (backfilled > 0) {
      log(`team: backfilled roleId for ${backfilled} existing users`);
    }
  }
}
