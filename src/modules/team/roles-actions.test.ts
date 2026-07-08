import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, seedTestTeam, createTestUser } from "@/modules/auth/test-helpers";
import { users } from "@/modules/auth/schema";
import { roles, rolePermissions, permissions } from "@/modules/team/schema";

/**
 * Custom Roles CRUD actions. Uses the file-backed temp DB harness
 * (setupTestDb creates a temp DB; the vi.mock below wires it to @/lib/db/client).
 * Mocks auth guards + audit so the actions run with a fixed admin identity.
 * System roles are seeded via seedTestTeam so Viewer reassignment + isSystem
 * rejection can be exercised.
 */
let testDb: Awaited<ReturnType<typeof setupTestDb>>["db"];
let cleanup: () => void;

// vi.mock is hoisted — the getter returns the module-level testDb variable.
vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));
const admin = { id: "admin-1", email: "a@example.com", name: "A", role: "owner" as const, permissions: new Set(["team:roles:manage"]) };
vi.mock("@/modules/auth/guards", () => ({
  requirePermission: vi.fn(async () => admin),
  requireUser: vi.fn(async () => admin),
}));
vi.mock("@/modules/audit/log", () => ({ writeAudit: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { }) }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined), set: vi.fn(), delete: vi.fn() })),
}));

import { writeAudit } from "@/modules/audit/log";
import { createRole, updateRole, deleteRole, setRolePermissions } from "./roles-actions";

beforeEach(async () => {
  vi.clearAllMocks();
  const harness = await setupTestDb();
  testDb = harness.db;
  cleanup = harness.cleanup;
  await seedTestTeam(testDb);
});

afterEach(() => cleanup());

/** Reads the current permission keys for a role (test helper). */
async function keysForRole(roleId: string): Promise<string[]> {
  const rows = await testDb
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));
  return rows.map((r: { key: string }) => r.key).sort();
}

describe("createRole", () => {
  it("inserts a custom role with isSystem=false and writes audit", async () => {
    const res = await createRole({ name: "Marketing", description: "Marketing team", requireMfa: true });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data!.id).toBeTruthy();

    const role = await testDb.query.roles.findFirst({ where: eq(roles.id, res.data!.id) });
    expect(role).toMatchObject({ name: "Marketing", description: "Marketing team", isSystem: false, requireMfa: true });
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ userId: admin.id, action: "team.role.create", meta: { name: "Marketing" } }),
    );
  });

  it("rejects a duplicate name", async () => {
    const first = await createRole({ name: "Dup" });
    expect(first.ok).toBe(true);
    const second = await createRole({ name: "Dup" });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toMatch(/already exists/i);
  });

  it("rejects a name that collides with a system role name", async () => {
    const res = await createRole({ name: "Viewer" });
    expect(res.ok).toBe(false);
  });

  it("validates name length (min 1, max 60)", async () => {
    const empty = await createRole({ name: "   " });
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.error).toMatch(/required/i);

    const tooLong = await createRole({ name: "x".repeat(61) });
    expect(tooLong.ok).toBe(false);
    if (tooLong.ok) return;
    expect(tooLong.error).toMatch(/60|fewer|length/i);
  });

  it("trims the name and defaults description/requireMfa", async () => {
    const res = await createRole({ name: "  Trimmed  " });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const role = await testDb.query.roles.findFirst({ where: eq(roles.id, res.data!.id) });
    expect(role?.name).toBe("Trimmed");
    expect(role?.description).toBe("");
    expect(role?.requireMfa).toBe(false);
  });
});

describe("updateRole", () => {
  it("updates a custom role's fields", async () => {
    const created = await createRole({ name: "Updater", description: "before" });
    if (!created.ok) throw new Error("setup");
    const res = await updateRole(created.data!.id, { name: "Updater2", description: "after", requireMfa: true });
    expect(res.ok).toBe(true);

    const role = await testDb.query.roles.findFirst({ where: eq(roles.id, created.data!.id) });
    expect(role).toMatchObject({ name: "Updater2", description: "after", requireMfa: true });
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ userId: admin.id, action: "team.role.update", ownerId: created.data!.id }),
    );
  });

  it("rejects system roles", async () => {
    const roleIds = await seedTestTeam(testDb);
    const res = await updateRole(roleIds["Editor"], { description: "hacked" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/system roles cannot be modified/i);
  });

  it("rejects a name change that collides with another role", async () => {
    const a = await createRole({ name: "RoleA" });
    const b = await createRole({ name: "RoleB" });
    if (!a.ok || !b.ok) throw new Error("setup");
    const res = await updateRole(b.data!.id, { name: "RoleA" });
    expect(res.ok).toBe(false);
  });

  it("allows renaming to the same name (no-op uniqueness check)", async () => {
    const created = await createRole({ name: "SameName" });
    if (!created.ok) throw new Error("setup");
    const res = await updateRole(created.data!.id, { name: "SameName" });
    expect(res.ok).toBe(true);
  });

  it("rejects an empty name on update", async () => {
    const created = await createRole({ name: "NonEmpty" });
    if (!created.ok) throw new Error("setup");
    const res = await updateRole(created.data!.id, { name: "   " });
    expect(res.ok).toBe(false);
  });

  it("rejects updating a missing role", async () => {
    const res = await updateRole("does-not-exist", { description: "x" });
    expect(res.ok).toBe(false);
  });
});

describe("deleteRole", () => {
  it("deletes a custom role and its junction rows", async () => {
    const created = await createRole({ name: "ToDelete" });
    if (!created.ok) throw new Error("setup");
    // Give it a permission so we can confirm junction cleanup.
    const roleIds = await seedTestTeam(testDb);
    await setRolePermissions(created.data!.id, ["content:publish", "mfa:self"]);
    expect((await keysForRole(created.data!.id)).sort()).toEqual(["content:publish", "mfa:self"]);

    const res = await deleteRole(created.data!.id);
    expect(res.ok).toBe(true);

    const role = await testDb.query.roles.findFirst({ where: eq(roles.id, created.data!.id) });
    expect(role).toBeUndefined();
    const junction = await testDb
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, created.data!.id));
    expect(junction).toHaveLength(0);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ userId: admin.id, action: "team.role.delete", ownerId: created.data!.id }),
    );
    void roleIds;
  });

  it("reassigns affected users to the Viewer system role", async () => {
    const created = await createRole({ name: "DoomedRole" });
    if (!created.ok) throw new Error("setup");
    const roleIds = await seedTestTeam(testDb);

    const { userId } = await createTestUser(testDb, {
      email: "doomed@example.com",
      roleId: created.data!.id,
      roleIds,
    });

    const res = await deleteRole(created.data!.id);
    expect(res.ok).toBe(true);

    const user = await testDb.query.users.findFirst({ where: eq(users.id, userId) });
    expect(user?.roleId).toBe(roleIds["Viewer"]);
  });

  it("rejects deleting system roles", async () => {
    const roleIds = await seedTestTeam(testDb);
    const res = await deleteRole(roleIds["Owner"]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/system roles cannot be deleted/i);
  });

  it("rejects deleting a missing role", async () => {
    const res = await deleteRole("nope");
    expect(res.ok).toBe(false);
  });
});

describe("setRolePermissions", () => {
  it("rejects system roles (seed-controlled)", async () => {
    const roleIds = await seedTestTeam(testDb);
    const res = await setRolePermissions(roleIds["Editor"], ["content:publish"]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/seed-controlled/i);
  });

  it("rejects unknown permission keys (CWE-20) without touching the DB", async () => {
    const created = await createRole({ name: "Strict" });
    if (!created.ok) throw new Error("setup");
    const before = await keysForRole(created.data!.id);

    const res = await setRolePermissions(created.data!.id, ["content:publish", "evil:permission"]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/unknown permission key/i);

    const after = await keysForRole(created.data!.id);
    expect(after).toEqual(before);
  });

  it("adds permissions to a custom role and writes audit with the diff", async () => {
    const created = await createRole({ name: "Adder" });
    if (!created.ok) throw new Error("setup");

    const res = await setRolePermissions(created.data!.id, ["content:publish", "media:manage"]);
    expect(res.ok).toBe(true);

    expect((await keysForRole(created.data!.id)).sort()).toEqual(["content:publish", "media:manage"]);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: admin.id,
        action: "team.role.permissions.update",
        ownerId: created.data!.id,
        meta: { added: expect.arrayContaining(["content:publish", "media:manage"]), removed: [] },
      }),
    );
  });

  it("removes permissions from a custom role", async () => {
    const created = await createRole({ name: "Remover" });
    if (!created.ok) throw new Error("setup");
    await setRolePermissions(created.data!.id, ["content:publish", "media:manage", "mfa:self"]);

    const res = await setRolePermissions(created.data!.id, ["mfa:self"]);
    expect(res.ok).toBe(true);

    expect((await keysForRole(created.data!.id)).sort()).toEqual(["mfa:self"]);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "team.role.permissions.update",
        ownerId: created.data!.id,
        meta: {
          added: [],
          removed: expect.arrayContaining(["content:publish", "media:manage"]),
        },
      }),
    );
  });

  it("adds and removes permissions in the same call (diff + junction correct)", async () => {
    const created = await createRole({ name: "Swapper" });
    if (!created.ok) throw new Error("setup");
    await setRolePermissions(created.data!.id, ["content:publish", "media:manage"]);

    // Keep media:manage, drop content:publish, add people:read + analytics:view.
    const res = await setRolePermissions(created.data!.id, ["media:manage", "people:read", "analytics:view"]);
    expect(res.ok).toBe(true);

    expect((await keysForRole(created.data!.id)).sort()).toEqual(
      ["analytics:view", "media:manage", "people:read"].sort(),
    );
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "team.role.permissions.update",
        ownerId: created.data!.id,
        meta: {
          added: expect.arrayContaining(["people:read", "analytics:view"]),
          removed: ["content:publish"],
        },
      }),
    );
  });

  it("clears all permissions when given an empty array", async () => {
    const created = await createRole({ name: "Emptier" });
    if (!created.ok) throw new Error("setup");
    await setRolePermissions(created.data!.id, ["content:publish", "mfa:self"]);

    const res = await setRolePermissions(created.data!.id, []);
    expect(res.ok).toBe(true);
    expect(await keysForRole(created.data!.id)).toEqual([]);
  });

  it("is a no-op (no junction changes) when the set is unchanged", async () => {
    const created = await createRole({ name: "Stable" });
    if (!created.ok) throw new Error("setup");
    await setRolePermissions(created.data!.id, ["content:publish", "mfa:self"]);
    (writeAudit as ReturnType<typeof vi.fn>).mockClear();

    const res = await setRolePermissions(created.data!.id, ["mfa:self", "content:publish"]);
    expect(res.ok).toBe(true);
    expect((await keysForRole(created.data!.id)).sort()).toEqual(["content:publish", "mfa:self"]);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { added: [], removed: [] } }),
    );
  });

  it("rejects a missing role", async () => {
    const res = await setRolePermissions("nope", ["content:publish"]);
    expect(res.ok).toBe(false);
  });
});
