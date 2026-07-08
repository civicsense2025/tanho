import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq, and } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { hash } from "@node-rs/argon2";
import { vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { users } from "@/modules/auth/schema";
import { roles, permissions, rolePermissions } from "@/modules/team/schema";
import { SYSTEM_ROLES, SYSTEM_ROLE_PERMISSIONS, PERMISSION_CATALOG } from "@/modules/team/permissions";
import { generateSessionToken, hashSessionToken } from "./tokens";

export type TestDb = Awaited<ReturnType<typeof setupTestDb>>["db"];

/**
 * File-backed temp DB with drizzle migrations applied. Mirrors the pattern
 * from auth/first-owner.test.ts — one fresh DB per test. Returns a cleanup
 * function to call in afterEach.
 *
 * NOTE: This function does NOT call vi.mock("@/lib/db/client") — each test
 * file must own its own mock at the top level (vi.mock is hoisted by vitest,
 * so it must reference a module-level variable). See guards.test.ts for the
 * pattern.
 */
export async function setupTestDb() {
  const dir = mkdtempSync(join(tmpdir(), "lamina-test-"));
  const url = `file:${join(dir, "test.db")}`;
  const client = createClient({ url });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });

  return {
    db,
    cleanup: () => {
      client.close();
    },
  };
}

/**
 * Seeds the permission catalog + system roles + role→permission assignments
 * into a test DB. Call after setupTestDb().
 */
export async function seedTestTeam(db: TestDb) {
  // Idempotent: use onConflictDoNothing so re-calling in tests is safe.
  for (const perm of PERMISSION_CATALOG) {
    await db
      .insert(permissions)
      .values({ key: perm.key, description: perm.description })
      .onConflictDoNothing({ target: permissions.key });
  }
  const roleIds: Record<string, string> = {};
  for (const role of SYSTEM_ROLES) {
    const [inserted] = await db
      .insert(roles)
      .values({
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        requireMfa: role.requireMfa,
      })
      .onConflictDoUpdate({
        target: roles.name,
        set: { description: role.description, isSystem: role.isSystem, requireMfa: role.requireMfa },
      })
      .returning();
    roleIds[role.name] = inserted!.id;
  }
  const allPerms = await db.query.permissions.findMany();
  const permByKey = new Map(allPerms.map((p: { key: string; id: string }) => [p.key, p.id]));
  for (const [roleName, keys] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
    const roleId = roleIds[roleName];
    if (!roleId) continue;
    for (const key of keys) {
      const permId = permByKey.get(key);
      if (!permId) continue;
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId: permId })
        .onConflictDoNothing({ target: [rolePermissions.roleId, rolePermissions.permissionId] });
    }
  }
  return roleIds;
}

/**
 * Creates a test user with the given role/permissions/status. Returns the
 * user row + plaintext password. When role="custom", a custom role is
 * created with the given permissions.
 */
export async function createTestUser(
  db: TestDb,
  opts: {
    email?: string;
    name?: string;
    role?: "owner" | "editor" | "custom";
    roleId?: string;
    permissions?: string[];
    status?: "active" | "invited" | "disabled";
    password?: string;
    roleIds?: Record<string, string>;
  } = {},
): Promise<{ user: typeof users.$inferSelect; userId: string; password: string }> {
  const email = opts.email ?? `test-${Date.now()}@example.com`;
  const name = opts.name ?? "Test User";
  const password = opts.password ?? "test-password-123";
  const status = opts.status ?? "active";
  const passwordHash = status === "invited" ? "" : await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  let roleId = opts.roleId;
  if (!roleId && opts.roleIds) {
    if (opts.role === "owner") roleId = opts.roleIds["Owner"];
    else if (opts.role === "editor") roleId = opts.roleIds["Editor"];
  }
  if (opts.role === "custom" && opts.permissions) {
    const [customRole] = await db
      .insert(roles)
      .values({ name: `custom-${Date.now()}`, description: "test custom role", isSystem: false })
      .returning();
    roleId = customRole!.id;
    const allPerms = await db.query.permissions.findMany();
    const permByKey = new Map(allPerms.map((p) => [p.key, p.id]));
    for (const key of opts.permissions) {
      const permId = permByKey.get(key);
      if (permId) {
        await db.insert(rolePermissions).values({ roleId: customRole!.id, permissionId: permId });
      }
    }
  }

  const [user] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      role: opts.role === "owner" ? "owner" : "editor",
      status,
      roleId: roleId ?? null,
    })
    .returning();

  return { user: user!, userId: user!.id, password };
}

/**
 * Creates a test session for a user. Returns the session token (to set as
 * cookie) and the session row ID.
 */
export async function createTestSession(
  db: TestDb,
  userId: string,
  opts: { label?: string; expiresAt?: number } = {},
): Promise<{ sessionId: string; token: string }> {
  const token = generateSessionToken();
  const sessionId = hashSessionToken(token);
  await db.insert(schema.sessions).values({
    id: sessionId,
    kind: "admin",
    userId,
    expiresAt: opts.expiresAt ?? Date.now() + 30 * 24 * 60 * 60 * 1000,
    label: opts.label,
  });
  return { sessionId, token };
}
