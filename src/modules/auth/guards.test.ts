import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, seedTestTeam, createTestUser, type TestDb } from "@/modules/auth/test-helpers";
import { resolvePermissions } from "@/modules/auth/guards";
import { rolePermissions, permissions } from "@/modules/team/schema";

let testDb: TestDb;
let cleanup: () => void;

// vi.mock is hoisted — the getter returns the module-level testDb variable
// which is assigned in beforeEach. This is the first-owner.test.ts pattern.
vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }) }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined), set: vi.fn(), delete: vi.fn() })),
}));
vi.mock("@/modules/audit/log", () => ({ writeAudit: vi.fn(async () => undefined) }));

describe("auth/guards — resolvePermissions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const result = await setupTestDb();
    testDb = result.db;
    cleanup = result.cleanup;
    await seedTestTeam(testDb);
  });

  afterEach(() => cleanup());

  describe("requireUser('owner') — backward compat via team:owner sentinel", () => {
    it("Owner role has team:owner sentinel", async () => {
      const roleIds = await seedTestTeam(testDb);
      const perms = await resolvePermissions(roleIds["Owner"]);
      expect(perms.has("team:owner")).toBe(true);
    });

    it("Editor role does NOT have team:owner sentinel", async () => {
      const roleIds = await seedTestTeam(testDb);
      const perms = await resolvePermissions(roleIds["Editor"]);
      expect(perms.has("team:owner")).toBe(false);
    });

    it("custom-role user with team:owner perm has it", async () => {
      const { userId } = await createTestUser(testDb, {
        role: "custom",
        permissions: ["team:owner", "mfa:self"],
      });
      const users_table = (await import("@/modules/auth/schema")).users;
      const [u] = await testDb.select().from(users_table).where(eq(users_table.id, userId));
      const perms = await resolvePermissions(u!.roleId);
      expect(perms.has("team:owner")).toBe(true);
    });

    it("custom-role user without team:owner does not have it", async () => {
      const { userId } = await createTestUser(testDb, {
        role: "custom",
        permissions: ["content:publish", "mfa:self"],
      });
      const users_table = (await import("@/modules/auth/schema")).users;
      const [u] = await testDb.select().from(users_table).where(eq(users_table.id, userId));
      const perms = await resolvePermissions(u!.roleId);
      expect(perms.has("team:owner")).toBe(false);
    });
  });

  describe("requirePermission — permission set correctness", () => {
    it("Editor has content:publish", async () => {
      const roleIds = await seedTestTeam(testDb);
      const perms = await resolvePermissions(roleIds["Editor"]);
      expect(perms.has("content:publish")).toBe(true);
    });

    it("Viewer does NOT have content:publish", async () => {
      const roleIds = await seedTestTeam(testDb);
      const perms = await resolvePermissions(roleIds["Viewer"]);
      expect(perms.has("content:publish")).toBe(false);
    });
  });

  describe("fail-closed (CWE-440)", () => {
    it("returns empty set when DB query throws", async () => {
      // Drop the role_permissions table to force a DB error in resolvePermissions
      await testDb.$client.execute("DROP TABLE role_permissions");
      const perms = await resolvePermissions("some-role-id");
      expect(perms.size).toBe(0); // fail-closed: empty set, not undefined or throw
    });

    it("returns empty set for null roleId", async () => {
      const perms = await resolvePermissions(null);
      expect(perms.size).toBe(0);
    });
  });

  describe("permission set loading", () => {
    it("Owner gets all 20 permissions", async () => {
      const roleIds = await seedTestTeam(testDb);
      const perms = await resolvePermissions(roleIds["Owner"]);
      expect(perms.has("team:owner")).toBe(true);
      expect(perms.has("team:manage")).toBe(true);
      expect(perms.has("content:publish")).toBe(true);
      expect(perms.has("settings:manage")).toBe(true);
      expect(perms.has("billing:manage")).toBe(true);
      expect(perms.size).toBe(20);
    });

    it("Editor gets correct subset (no team/billing/settings)", async () => {
      const roleIds = await seedTestTeam(testDb);
      const perms = await resolvePermissions(roleIds["Editor"]);
      expect(perms.has("content:publish")).toBe(true);
      expect(perms.has("team:owner")).toBe(false);
      expect(perms.has("team:manage")).toBe(false);
      expect(perms.has("settings:manage")).toBe(false);
      expect(perms.has("billing:manage")).toBe(false);
      expect(perms.has("mfa:self")).toBe(true);
    });

    it("Viewer gets 3 permissions (people:read, analytics:view, mfa:self)", async () => {
      const roleIds = await seedTestTeam(testDb);
      const perms = await resolvePermissions(roleIds["Viewer"]);
      expect(perms.has("people:read")).toBe(true);
      expect(perms.has("analytics:view")).toBe(true);
      expect(perms.has("content:publish")).toBe(false);
      expect(perms.size).toBe(3);
    });
  });
});
