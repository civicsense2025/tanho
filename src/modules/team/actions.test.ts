import { createClient } from "@libsql/client";
import { hash } from "@node-rs/argon2";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { sessions, users } from "@/modules/auth/schema";
import { userBackupCodes, userMfa } from "@/modules/auth/mfa/schema";
import { generateSessionToken, hashSessionToken, makeSignedToken } from "@/modules/auth/tokens";
import { permissions, rolePermissions, roles } from "@/modules/team/schema";
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLES,
  SYSTEM_ROLE_PERMISSIONS,
} from "@/modules/team/permissions";

/**
 * Team-management server actions. The harness mirrors auth/first-owner.test.ts:
 * a file-backed temp DB per test (so reads after db.transaction() share state),
 * with next/navigation, next/headers, audit, email, and the session module
 * mocked so the actions run in a plain Vitest process.
 *
 * The auth/test-helpers module ships a `setupTestDb` whose nested vi.mock call
 * is hoisted by Vitest and clobbers this file's own @/lib/db/client mock
 * (returning an out-of-scope `db`), which breaks every DB-backed assertion.
 * The helpers' seeding/user/session factories are therefore inlined below so
 * the test owns the db mock exclusively — same logic, no cross-file hoist
 * conflict. See auth/first-owner.test.ts for the self-contained pattern.
 */

let client: ReturnType<typeof createClient>;
let testDb: ReturnType<typeof drizzle<typeof schema>>;
let tmpDir: string;

vi.mock("@/lib/db/client", () => ({ get db() { return testDb; } }));

const { RedirectError, redirect, createAdminSession, emailSend, currentAdmin } = vi.hoisted(() => {
  class RedirectError extends Error { }
  const redirect = vi.fn((url: string) => {
    throw new RedirectError(url);
  });
  return {
    RedirectError,
    redirect,
    createAdminSession: vi.fn(async () => undefined),
    emailSend: vi.fn(async () => undefined),
    currentAdmin: {
      value: null as null | {
        id: string;
        email: string;
        name: string;
        role: "owner" | "editor";
        permissions: Set<string>;
      },
    },
  };
});

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));
vi.mock("@/modules/audit/log", () => ({ writeAudit: vi.fn(async () => undefined) }));
vi.mock("@/adapters/email", () => ({ email: { send: emailSend } }));
vi.mock("@/modules/auth/session", () => ({
  ADMIN_COOKIE: "admin_session",
  createAdminSession,
  getAdminUser: vi.fn(async () => currentAdmin.value),
  destroyAllSessionsForUser: vi.fn(async (userId: string) => {
    const { db } = await import("@/lib/db/client");
    const { sessions } = await import("@/modules/auth/schema");
    await db.delete(sessions).where(and(eq(sessions.kind, "admin"), eq(sessions.userId, userId)));
  }),
}));

import { writeAudit } from "@/modules/audit/log";
import { resolvePermissions } from "@/modules/auth/guards";
import {
  acceptInvite,
  disableStaff,
  inviteStaff,
  removeStaff,
  resendInvite,
  updateStaffRole,
} from "./actions";

const INVITE_PURPOSE = "staff-invite";

// ── inlined test helpers (see file header) ──────────────────────────────

async function seedTestTeam(): Promise<Record<string, string>> {
  for (const perm of PERMISSION_CATALOG) {
    await testDb.insert(permissions).values({ key: perm.key, description: perm.description });
  }
  const roleIds: Record<string, string> = {};
  for (const role of SYSTEM_ROLES) {
    const [inserted] = await testDb
      .insert(roles)
      .values({
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        requireMfa: role.requireMfa,
      })
      .returning();
    roleIds[role.name] = inserted!.id;
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
  email?: string;
  name?: string;
  role?: "owner" | "editor" | "custom";
  roleId?: string;
  permissions?: string[];
  status?: "active" | "invited" | "disabled";
  roleIds?: Record<string, string>;
};

async function createTestUser(opts: CreateUserOpts = {}) {
  const email = opts.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const name = opts.name ?? "Test User";
  const status = opts.status ?? "active";
  const passwordHash =
    status === "invited" ? "" : await hash("test-password-123", { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  let roleId = opts.roleId;
  if (!roleId && opts.roleIds) {
    if (opts.role === "owner") roleId = opts.roleIds["Owner"];
    else if (opts.role === "editor") roleId = opts.roleIds["Editor"];
  }
  if (opts.role === "custom" && opts.permissions) {
    const [customRole] = await testDb
      .insert(roles)
      .values({ name: `custom-${Date.now()}`, description: "test custom role", isSystem: false })
      .returning();
    roleId = customRole!.id;
    const allPerms = await testDb.query.permissions.findMany();
    const permByKey = new Map(allPerms.map((p) => [p.key, p.id]));
    for (const key of opts.permissions) {
      const permId = permByKey.get(key);
      if (permId) await testDb.insert(rolePermissions).values({ roleId: customRole!.id, permissionId: permId });
    }
  }
  const [user] = await testDb
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      role: opts.role === "owner" ? "owner" : "editor",
      status,
      roleId: roleId ?? null,
      invitedAt: status === "invited" ? Date.now() : null,
    })
    .returning();
  return { user: user!, userId: user!.id };
}

async function createTestSession(userId: string): Promise<{ sessionId: string; token: string }> {
  const token = generateSessionToken();
  const sessionId = hashSessionToken(token);
  await testDb.insert(sessions).values({
    id: sessionId,
    kind: "admin",
    userId,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  return { sessionId, token };
}

/** Sets `currentAdmin` to the acting user with their live permission set. */
async function becomeAdmin(userId: string, user: { email: string; name: string; role: "owner" | "editor"; roleId: string | null }) {
  currentAdmin.value = {
    id: userId,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: await resolvePermissions(user.roleId),
  };
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// ── setup ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.clearAllMocks();
  currentAdmin.value = null;
  tmpDir = mkdtempSync(join(tmpdir(), "lamina-team-"));
  client = createClient({ url: `file:${join(tmpDir, "test.db")}` });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

afterEach(() => {
  client.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

// ── inviteStaff ─────────────────────────────────────────────────────────

describe("inviteStaff", () => {
  it("owner succeeds: creates an invited row, sends email, audits", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);

    const res = await inviteStaff({ email: "new@example.com", name: "New Person", roleId: roleIds["Editor"] });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data!.id).toBeTruthy();
    expect(res.data!.token).toBeTruthy();

    const invited = await testDb.query.users.findFirst({ where: eq(users.email, "new@example.com") });
    expect(invited).toMatchObject({ status: "invited", roleId: roleIds["Editor"], name: "New Person" });
    // No password yet — invited users can't log in until they accept.
    expect(invited?.passwordHash).toBe("");
    expect(invited?.invitedAt).toBeGreaterThan(0);

    expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({ to: "new@example.com" }));
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ userId, action: "team.invite", ownerId: res.data!.id, meta: { email: "new@example.com", roleId: roleIds["Editor"] } }),
    );
  });

  it("editor without team:manage is forbidden (throws)", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "editor", roleId: roleIds["Editor"], roleIds });
    await becomeAdmin(userId, user);
    // Editor system role has no team:manage → requirePermission throws.
    await expect(inviteStaff({ email: "x@example.com", name: "X", roleId: roleIds["Editor"] })).rejects.toThrow(/Forbidden/);
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("dedups: re-invites an existing invited user instead of erroring", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const { userId: invitedId } = await createTestUser({
      email: "pending@example.com",
      name: "Pending",
      roleId: roleIds["Author"],
      status: "invited",
    });

    const res = await inviteStaff({ email: "pending@example.com", name: "Pending Renamed", roleId: roleIds["Editor"] });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Same row, not a new one.
    expect(res.data!.id).toBe(invitedId);
    const row = await testDb.query.users.findFirst({ where: eq(users.id, invitedId) });
    expect(row?.name).toBe("Pending Renamed");
    expect(row?.roleId).toBe(roleIds["Editor"]);
    expect(emailSend).toHaveBeenCalledTimes(1);
  });

  it("refuses to re-invite an active user", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    await createTestUser({ email: "active@example.com", name: "Active", roleId: roleIds["Editor"], status: "active" });

    const res = await inviteStaff({ email: "active@example.com", name: "Active", roleId: roleIds["Editor"] });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/already exists/i);
  });
});

describe("inviteStaff — privilege escalation (CWE-269)", () => {
  it("a non-owner with team:manage cannot assign the Owner role", async () => {
    const roleIds = await seedTestTeam();
    // Custom role: can manage team but is NOT an owner.
    const { userId, user } = await createTestUser({ role: "custom", permissions: ["team:manage", "mfa:self"] });
    await becomeAdmin(userId, user);
    expect(currentAdmin.value!.permissions.has("team:manage")).toBe(true);
    expect(currentAdmin.value!.permissions.has("team:owner")).toBe(false);

    const res = await inviteStaff({ email: "escalate@example.com", name: "Esc", roleId: roleIds["Owner"] });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/owner/i);
    // No user was created.
    const row = await testDb.query.users.findFirst({ where: eq(users.email, "escalate@example.com") });
    expect(row).toBeUndefined();
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("an owner CAN assign the Owner role", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const res = await inviteStaff({ email: "new-owner@example.com", name: "New Owner", roleId: roleIds["Owner"] });
    expect(res.ok).toBe(true);
  });
});

// ── acceptInvite ────────────────────────────────────────────────────────

describe("acceptInvite", () => {
  it("a valid token sets the password, flips status to active, and creates a session", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({
      email: "accept@example.com",
      name: "Accept",
      roleId: roleIds["Editor"],
      status: "invited",
    });
    const token = makeSignedToken(INVITE_PURPOSE, userId, 60_000);

    await expect(acceptInvite({}, form({ token, password: "a-very-strong-pw" }))).rejects.toThrow(RedirectError);
    expect(redirect).toHaveBeenCalledWith("/admin");

    const row = await testDb.query.users.findFirst({ where: eq(users.id, userId) });
    expect(row?.status).toBe("active");
    expect(row?.passwordHash).not.toBe("");
    expect(row?.passwordHash).not.toBe("a-very-strong-pw"); // hashed, not raw
    expect(createAdminSession).toHaveBeenCalledWith(userId);
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ userId, action: "team.accept" }));
  });

  it("rejects an expired/invalid token", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({
      email: "expired@example.com",
      roleId: roleIds["Editor"],
      status: "invited",
    });
    // Negative TTL → already expired.
    const token = makeSignedToken(INVITE_PURPOSE, userId, -1000);
    const res = await acceptInvite({}, form({ token, password: "a-very-strong-pw" }));
    expect(res.error).toMatch(/invalid|expired/i);
    expect(createAdminSession).not.toHaveBeenCalled();
  });

  it("rejects an already-accepted invite (status=active)", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({
      email: "already@example.com",
      roleId: roleIds["Editor"],
      status: "active",
    });
    const token = makeSignedToken(INVITE_PURPOSE, userId, 60_000);
    const res = await acceptInvite({}, form({ token, password: "a-very-strong-pw" }));
    expect(res.error).toMatch(/invalid|expired/i);
    expect(createAdminSession).not.toHaveBeenCalled();
  });

  it("rejects a weak password (<12 chars)", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({
      email: "weak@example.com",
      roleId: roleIds["Editor"],
      status: "invited",
    });
    const token = makeSignedToken(INVITE_PURPOSE, userId, 60_000);
    const res = await acceptInvite({}, form({ token, password: "short" }));
    expect(res.error).toBeTruthy();
    // No session, status unchanged.
    expect(createAdminSession).not.toHaveBeenCalled();
    const row = await testDb.query.users.findFirst({ where: eq(users.id, userId) });
    expect(row?.status).toBe("invited");
  });

  it("ignores a forged roleId field (CWE-269 mass-assignment)", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({
      email: "mass@example.com",
      name: "Mass",
      roleId: roleIds["Editor"],
      status: "invited",
    });
    const token = makeSignedToken(INVITE_PURPOSE, userId, 60_000);
    // Attacker tries to escalate by submitting roleId=Owner in the form.
    await expect(
      acceptInvite({}, form({ token, password: "a-very-strong-pw", roleId: roleIds["Owner"] })),
    ).rejects.toThrow(RedirectError);

    const row = await testDb.query.users.findFirst({ where: eq(users.id, userId) });
    expect(row?.status).toBe("active");
    // roleId is STILL the Editor role the inviter chose — the form field was dropped.
    expect(row?.roleId).toBe(roleIds["Editor"]);
  });
});

// ── updateStaffRole ─────────────────────────────────────────────────────

describe("updateStaffRole", () => {
  it("changes roleId and the denormalized role enum", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const { userId: targetId } = await createTestUser({
      email: "target@example.com",
      roleId: roleIds["Editor"],
      roleIds,
    });

    const res = await updateStaffRole(targetId, roleIds["Author"]);
    expect(res.ok).toBe(true);
    const row = await testDb.query.users.findFirst({ where: eq(users.id, targetId) });
    expect(row?.roleId).toBe(roleIds["Author"]);
    // Author has no team:owner → denormalized enum stays "editor".
    expect(row?.role).toBe("editor");
  });

  it("revokes the target's other sessions", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const { userId: targetId } = await createTestUser({ email: "t@example.com", roleId: roleIds["Editor"], roleIds });
    await createTestSession(targetId);
    expect(await testDb.query.sessions.findMany({ where: eq(sessions.userId, targetId) })).toHaveLength(1);

    await updateStaffRole(targetId, roleIds["Author"]);
    expect(await testDb.query.sessions.findMany({ where: eq(sessions.userId, targetId) })).toHaveLength(0);
  });

  it("cannot change your own role (CWE-306)", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const res = await updateStaffRole(userId, roleIds["Editor"]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/own role/i);
  });

  it("last-owner protection: demoting the only owner is rejected", async () => {
    const roleIds = await seedTestTeam();
    // A non-owner actor with team:manage (so they pass the guard but can't
    // escalate), and a single owner as the target.
    const { userId: actorId, user: actor } = await createTestUser({
      role: "custom",
      permissions: ["team:manage", "mfa:self"],
    });
    await becomeAdmin(actorId, actor);
    const { userId: ownerId } = await createTestUser({
      email: "sole-owner@example.com",
      role: "owner",
      roleId: roleIds["Owner"],
      roleIds,
    });

    const res = await updateStaffRole(ownerId, roleIds["Editor"]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/last owner/i);
    // Unchanged.
    const row = await testDb.query.users.findFirst({ where: eq(users.id, ownerId) });
    expect(row?.roleId).toBe(roleIds["Owner"]);
  });

  it("privilege escalation: a non-owner cannot assign the Owner role (CWE-269)", async () => {
    const roleIds = await seedTestTeam();
    const { userId: actorId, user: actor } = await createTestUser({
      role: "custom",
      permissions: ["team:manage", "mfa:self"],
    });
    await becomeAdmin(actorId, actor);
    const { userId: targetId } = await createTestUser({ email: "t2@example.com", roleId: roleIds["Editor"], roleIds });

    const res = await updateStaffRole(targetId, roleIds["Owner"]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/owner/i);
  });

  it("an owner can demote a second owner when >1 owner exists", async () => {
    const roleIds = await seedTestTeam();
    const { userId: actorId, user: actor } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(actorId, actor);
    const { userId: secondOwnerId } = await createTestUser({
      email: "second@example.com",
      role: "owner",
      roleId: roleIds["Owner"],
      roleIds,
    });
    const res = await updateStaffRole(secondOwnerId, roleIds["Editor"]);
    expect(res.ok).toBe(true);
    const row = await testDb.query.users.findFirst({ where: eq(users.id, secondOwnerId) });
    expect(row?.roleId).toBe(roleIds["Editor"]);
    expect(row?.role).toBe("editor");
  });
});

// ── disableStaff ────────────────────────────────────────────────────────

describe("disableStaff", () => {
  it("sets status=disabled and destroys sessions", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const { userId: targetId } = await createTestUser({ email: "d@example.com", roleId: roleIds["Editor"], roleIds });
    await createTestSession(targetId);

    const res = await disableStaff(targetId);
    expect(res.ok).toBe(true);
    const row = await testDb.query.users.findFirst({ where: eq(users.id, targetId) });
    expect(row?.status).toBe("disabled");
    expect(await testDb.query.sessions.findMany({ where: eq(sessions.userId, targetId) })).toHaveLength(0);
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "team.disable", ownerId: targetId }));
  });

  it("cannot disable your own account (CWE-306)", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const res = await disableStaff(userId);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/own/i);
  });

  it("last-owner protection: cannot disable the last owner", async () => {
    const roleIds = await seedTestTeam();
    const { userId: actorId, user: actor } = await createTestUser({
      role: "custom",
      permissions: ["team:manage", "mfa:self"],
    });
    await becomeAdmin(actorId, actor);
    const { userId: ownerId } = await createTestUser({
      email: "sole@example.com",
      role: "owner",
      roleId: roleIds["Owner"],
      roleIds,
    });
    const res = await disableStaff(ownerId);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/last owner/i);
    const row = await testDb.query.users.findFirst({ where: eq(users.id, ownerId) });
    expect(row?.status).toBe("active");
  });
});

// ── removeStaff ─────────────────────────────────────────────────────────

describe("removeStaff", () => {
  it("deletes the user and cascades sessions, MFA, and backup codes", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const { userId: targetId } = await createTestUser({ email: "rm@example.com", roleId: roleIds["Editor"], roleIds });
    await createTestSession(targetId);
    await testDb.insert(userMfa).values({ userId: targetId, secret: "enc-secret", enabledAt: Date.now() });
    await testDb.insert(userBackupCodes).values({ userId: targetId, codeHash: "hash-1" });

    const res = await removeStaff(targetId);
    expect(res.ok).toBe(true);
    expect(await testDb.query.users.findFirst({ where: eq(users.id, targetId) })).toBeUndefined();
    expect(await testDb.query.sessions.findMany({ where: eq(sessions.userId, targetId) })).toHaveLength(0);
    expect(await testDb.query.userMfa.findFirst({ where: eq(userMfa.userId, targetId) })).toBeUndefined();
    expect(await testDb.query.userBackupCodes.findMany({ where: eq(userBackupCodes.userId, targetId) })).toHaveLength(0);
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "team.remove", ownerId: targetId }));
  });

  it("cannot remove your own account (CWE-306)", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const res = await removeStaff(userId);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/own/i);
  });

  it("last-owner protection: cannot remove the last owner", async () => {
    const roleIds = await seedTestTeam();
    const { userId: actorId, user: actor } = await createTestUser({
      role: "custom",
      permissions: ["team:manage", "mfa:self"],
    });
    await becomeAdmin(actorId, actor);
    const { userId: ownerId } = await createTestUser({
      email: "sole-rm@example.com",
      role: "owner",
      roleId: roleIds["Owner"],
      roleIds,
    });
    const res = await removeStaff(ownerId);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/last owner/i);
    expect(await testDb.query.users.findFirst({ where: eq(users.id, ownerId) })).toBeDefined();
  });
});

// ── resendInvite ────────────────────────────────────────────────────────

describe("resendInvite", () => {
  it("rotates invitedAt, mints a fresh token, and sends email — for an invited user", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const { userId: targetId } = await createTestUser({
      email: "resend@example.com",
      roleId: roleIds["Editor"],
      status: "invited",
    });
    const before = await testDb.query.users.findFirst({ where: eq(users.id, targetId) });
    const oldInvitedAt = before!.invitedAt!;
    // Ensure the rotated timestamp will differ.
    await new Promise((r) => setTimeout(r, 5));

    const res = await resendInvite(targetId);
    expect(res.ok).toBe(true);
    const after = await testDb.query.users.findFirst({ where: eq(users.id, targetId) });
    expect(after!.invitedAt).toBeGreaterThan(oldInvitedAt);
    expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({ to: "resend@example.com" }));
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "team.invite.resend", ownerId: targetId }),
    );
  });

  it("refuses to resend for a non-invited user", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const { userId: targetId } = await createTestUser({
      email: "active-resend@example.com",
      roleId: roleIds["Editor"],
      status: "active",
    });
    const res = await resendInvite(targetId);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/pending|invited/i);
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("refuses to resend for a missing user", async () => {
    const roleIds = await seedTestTeam();
    const { userId, user } = await createTestUser({ role: "owner", roleId: roleIds["Owner"], roleIds });
    await becomeAdmin(userId, user);
    const res = await resendInvite("does-not-exist");
    expect(res.ok).toBe(false);
  });
});
