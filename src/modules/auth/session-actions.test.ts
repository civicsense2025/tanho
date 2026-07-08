import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import * as schema from "@/lib/db/schema";
import { sessions } from "@/modules/auth/schema";
import { SYSTEM_ROLES, SYSTEM_ROLE_PERMISSIONS, PERMISSION_CATALOG } from "@/modules/team/permissions";
import { roles, permissions, rolePermissions } from "@/modules/team/schema";
import { generateSessionToken, hashSessionToken } from "@/modules/auth/tokens";

let client: Client;
let testDb: ReturnType<typeof drizzle<typeof schema>>;
let tmpDir: string;

// Mutable cookie jar — each test sets `currentToken` to the session it wants
// to be "current", then the mock returns that value for admin_session.
let currentToken = "";
const mockJar = {
  get: vi.fn((name: string) => (name === "admin_session" ? { value: currentToken } : undefined)),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => mockJar) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }),
}));
const writeAudit = vi.fn(async () => undefined);
vi.mock("@/modules/audit/log", () => ({ writeAudit }));
vi.mock("@/lib/db/client", () => ({ get db() { return testDb; } }));

// ── Inlined test helpers (test-helpers.ts has an unawaited-migrate bug) ──

async function seedTestTeam(): Promise<Record<string, string>> {
  for (const perm of PERMISSION_CATALOG) {
    await testDb.insert(permissions).values({ key: perm.key, description: perm.description });
  }
  const roleIds: Record<string, string> = {};
  for (const role of SYSTEM_ROLES) {
    const [r] = await testDb.insert(roles).values({
      name: role.name, description: role.description, isSystem: role.isSystem, requireMfa: role.requireMfa,
    }).returning();
    roleIds[role.name] = r!.id;
  }
  const allPerms = await testDb.query.permissions.findMany();
  const permByKey = new Map(allPerms.map((p) => [p.key, p.id]));
  for (const [roleName, keys] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
    const roleId = roleIds[roleName];
    if (!roleId) continue;
    for (const key of keys) {
      const permId = permByKey.get(key);
      if (permId) await testDb.insert(rolePermissions).values({ roleId, permissionId: permId });
    }
  }
  return roleIds;
}

type CreateUserOpts = {
  email?: string; role?: "owner" | "editor" | "custom"; roleId?: string;
  permissions?: string[]; roleIds?: Record<string, string>;
};

async function createTestUser(opts: CreateUserOpts = {}): Promise<{ userId: string }> {
  const email = opts.email ?? `test-${Date.now()}-${Math.random()}@example.com`;
  const passwordHash = await hash("test-password-123", { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  let roleId = opts.roleId ?? (opts.roleIds ? (opts.role === "owner" ? opts.roleIds["Owner"] : opts.roleIds?.["Editor"]) : undefined);
  if (opts.role === "custom" && opts.permissions) {
    const [customRole] = await testDb.insert(roles)
      .values({ name: `custom-${Date.now()}`, description: "test", isSystem: false }).returning();
    roleId = customRole!.id;
    const allPerms = await testDb.query.permissions.findMany();
    const permByKey = new Map(allPerms.map((p) => [p.key, p.id]));
    for (const key of opts.permissions) {
      const permId = permByKey.get(key);
      if (permId) await testDb.insert(rolePermissions).values({ roleId: customRole!.id, permissionId: permId });
    }
  }
  const [user] = await testDb.insert(schema.users)
    .values({ email, name: "Test User", passwordHash, role: opts.role === "owner" ? "owner" : "editor", roleId: roleId ?? null })
    .returning();
  return { userId: user!.id };
}

async function createTestSession(userId: string, opts: { label?: string; expiresAt?: number } = {}): Promise<{ sessionId: string; token: string }> {
  const token = generateSessionToken();
  const sessionId = hashSessionToken(token);
  await testDb.insert(schema.sessions).values({
    id: sessionId, kind: "admin", userId,
    expiresAt: opts.expiresAt ?? Date.now() + 30 * 24 * 60 * 60 * 1000, label: opts.label,
  });
  return { sessionId, token };
}

beforeEach(async () => {
  vi.clearAllMocks();
  currentToken = "";
  tmpDir = mkdtempSync(join(tmpdir(), "lamina-session-actions-"));
  client = createClient({ url: `file:${join(tmpDir, "test.db")}` });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

afterEach(() => { client.close(); rmSync(tmpDir, { recursive: true, force: true }); });

describe("listSessions", () => {
  it("returns the caller's active sessions with isCurrent on the cookie-matching row", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    const cur = await createTestSession(userId, { label: "laptop" });
    const other = await createTestSession(userId, { label: "phone" });
    await createTestSession(userId, { expiresAt: Date.now() - 1000 }); // expired → filtered
    currentToken = cur.token;

    const { listSessions } = await import("./session-actions");
    const res = await listSessions();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const rows = res.data!;
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === cur.sessionId)!.isCurrent).toBe(true);
    expect(rows.find((r) => r.id === cur.sessionId)!.label).toBe("laptop");
    expect(rows.find((r) => r.id === other.sessionId)!.isCurrent).toBe(false);
  });

  it("IDOR: a non-team:manage caller requesting another user's sessions is Forbidden (CWE-639)", async () => {
    const roleIds = await seedTestTeam();
    const { userId: viewerId } = await createTestUser({ role: "custom", permissions: ["people:read"], roleIds });
    const { userId: ownerId } = await createTestUser({ role: "owner", roleIds });
    await createTestSession(ownerId);
    currentToken = (await createTestSession(viewerId)).token;

    const { listSessions } = await import("./session-actions");
    expect(await listSessions(ownerId)).toEqual({ ok: false, error: "Forbidden" });
  });

  it("team:manage holder can list any user's sessions", async () => {
    const roleIds = await seedTestTeam();
    const { userId: managerId } = await createTestUser({ role: "custom", permissions: ["team:manage"], roleIds });
    const { userId: ownerId } = await createTestUser({ role: "owner", roleIds });
    const ownerSession = await createTestSession(ownerId, { label: "owner-laptop" });
    currentToken = (await createTestSession(managerId)).token;

    const { listSessions } = await import("./session-actions");
    const res = await listSessions(ownerId);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data!).toHaveLength(1);
    expect(res.data![0]!.id).toBe(ownerSession.sessionId);
    expect(res.data![0]!.isCurrent).toBe(false);
  });
});

describe("revokeSession", () => {
  it("deletes the target session and writes audit", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    const cur = await createTestSession(userId);
    const target = await createTestSession(userId, { label: "tablet" });
    currentToken = cur.token;

    const { revokeSession } = await import("./session-actions");
    expect((await revokeSession(target.sessionId)).ok).toBe(true);
    expect(await testDb.select().from(sessions).where(eq(sessions.id, target.sessionId))).toHaveLength(0);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "session.revoke", ownerId: target.sessionId }),
    );
  });

  it("refuses to revoke the current session", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    const cur = await createTestSession(userId);
    currentToken = cur.token;

    const { revokeSession } = await import("./session-actions");
    const res = await revokeSession(cur.sessionId);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/logout/i);
    expect(await testDb.select().from(sessions).where(eq(sessions.id, cur.sessionId))).toHaveLength(1);
  });

  it("returns an error for a non-existent session", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    currentToken = (await createTestSession(userId)).token;

    const { revokeSession } = await import("./session-actions");
    const res = await revokeSession("nonexistent-session-id");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/not found/i);
  });

  it("IDOR: a non-team:manage caller cannot revoke another user's session (CWE-639)", async () => {
    const roleIds = await seedTestTeam();
    const { userId: viewerId } = await createTestUser({ role: "custom", permissions: ["people:read"], roleIds });
    const { userId: ownerId } = await createTestUser({ role: "owner", roleIds });
    const ownerSession = await createTestSession(ownerId);
    currentToken = (await createTestSession(viewerId)).token;

    const { revokeSession } = await import("./session-actions");
    expect(await revokeSession(ownerSession.sessionId)).toEqual({ ok: false, error: "Forbidden" });
    expect(await testDb.select().from(sessions).where(eq(sessions.id, ownerSession.sessionId))).toHaveLength(1);
  });
});

describe("revokeOtherSessions", () => {
  it("destroys all of the caller's sessions except the current one", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    const cur = await createTestSession(userId, { label: "laptop" });
    const other1 = await createTestSession(userId, { label: "phone" });
    const other2 = await createTestSession(userId, { label: "tablet" });
    currentToken = cur.token;

    const { revokeOtherSessions } = await import("./session-actions");
    expect((await revokeOtherSessions()).ok).toBe(true);

    const remaining = await testDb.select().from(sessions).where(eq(sessions.userId, userId));
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(cur.sessionId);
    expect(await testDb.select().from(sessions).where(eq(sessions.id, other1.sessionId))).toHaveLength(0);
    expect(await testDb.select().from(sessions).where(eq(sessions.id, other2.sessionId))).toHaveLength(0);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "session.revoke-others", userId }),
    );
  });

  it("does not touch another user's sessions", async () => {
    const roleIds = await seedTestTeam();
    const { userId: aId } = await createTestUser({ role: "owner", roleIds });
    const { userId: bId } = await createTestUser({ email: "b@example.com", role: "owner", roleIds });
    const aCur = await createTestSession(aId);
    await createTestSession(aId);
    const bSession = await createTestSession(bId);
    currentToken = aCur.token;

    const { revokeOtherSessions } = await import("./session-actions");
    expect((await revokeOtherSessions()).ok).toBe(true);

    const aRows = await testDb.select().from(sessions).where(eq(sessions.userId, aId));
    expect(aRows).toHaveLength(1);
    expect(aRows[0]!.id).toBe(aCur.sessionId);
    expect(await testDb.select().from(sessions).where(eq(sessions.id, bSession.sessionId))).toHaveLength(1);
  });
});
