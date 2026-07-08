import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { generate } from "otplib";
import { hash } from "@node-rs/argon2";
import * as schema from "@/lib/db/schema";
import { sessions, users } from "@/modules/auth/schema";
import { roles, permissions, rolePermissions } from "@/modules/team/schema";
import {
  SYSTEM_ROLES,
  SYSTEM_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
} from "@/modules/team/permissions";
import { userBackupCodes, userMfa } from "@/modules/auth/mfa/schema";
import { generateSessionToken, hashSessionToken, makeSignedToken } from "@/modules/auth/tokens";
import { decryptSecret } from "@/modules/auth/mfa/totp";
import {
  consumeBackupCode,
  generateBackupCodes,
  hashBackupCode,
} from "@/modules/auth/mfa/backup-codes";

let client: Client;
let testDb: ReturnType<typeof drizzle<typeof schema>>;
let tmpDir: string;

// ── Mocks ───────────────────────────────────────────────────────────────────
// Mutable cookie jar: tests set currentToken (admin_session) and/or
// currentMfaPending (mfa_pending) to stage the auth state they want.
let currentToken = "";
let currentMfaPending = "";
const mockJar = {
  get: vi.fn((name: string) => {
    if (name === "admin_session") return currentToken ? { value: currentToken } : undefined;
    if (name === "mfa_pending") return currentMfaPending ? { value: currentMfaPending } : undefined;
    return undefined;
  }),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "1.2.3.4", "user-agent": "test" })),
  cookies: vi.fn(async () => mockJar),
}));

class RedirectError extends Error { }
const redirect = vi.fn((url: string) => {
  throw new RedirectError(url);
});
vi.mock("next/navigation", () => ({ redirect }));

const writeAudit = vi.fn(async (_entry: { userId?: string | null; action: string; meta?: Record<string, unknown> }) => undefined);
vi.mock("@/modules/audit/log", () => ({ writeAudit }));

vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));

// Keep real getAdminUser + destroyAllSessionsForUser (they hit the test DB);
// only stub createAdminSession so verifyMfaAction doesn't mint a real
// session/cookie on the success path (we assert it was called instead).
const createAdminSession = vi.fn(async () => undefined);
vi.mock("@/modules/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/modules/auth/session")>(
    "@/modules/auth/session",
  );
  return { ...actual, createAdminSession };
});

// ── Inlined test helpers (test-helpers.ts has an unawaited-migrate race +
// a nested vi.mock that hoists and clobbers @/lib/db/client; same inline
// approach as session-actions.test.ts) ──────────────────────────────────────

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
      if (!permId) continue;
      await testDb.insert(rolePermissions).values({ roleId, permissionId: permId });
    }
  }
  return roleIds;
}

async function createTestUser(
  opts: {
    email?: string;
    name?: string;
    role?: "owner" | "editor";
    roleId?: string;
    status?: "active" | "invited" | "disabled";
    password?: string;
    roleIds?: Record<string, string>;
  } = {},
): Promise<{ user: typeof users.$inferSelect; userId: string; password: string }> {
  const email = opts.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const name = opts.name ?? "Test User";
  const password = opts.password ?? "test-password-123";
  const status = opts.status ?? "active";
  const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  let roleId = opts.roleId;
  if (!roleId && opts.roleIds) {
    if (opts.role === "owner") roleId = opts.roleIds["Owner"];
    else if (opts.role === "editor") roleId = opts.roleIds["Editor"];
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
    })
    .returning();

  return { user: user!, userId: user!.id, password };
}

async function createTestSession(
  userId: string,
  opts: { label?: string; expiresAt?: number } = {},
): Promise<{ sessionId: string; token: string }> {
  const token = generateSessionToken();
  const sessionId = hashSessionToken(token);
  await testDb.insert(schema.sessions).values({
    id: sessionId,
    kind: "admin",
    userId,
    expiresAt: opts.expiresAt ?? Date.now() + 30 * 24 * 60 * 60 * 1000,
    label: opts.label,
  });
  return { sessionId, token };
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(async () => {
  vi.clearAllMocks();
  currentToken = "";
  currentMfaPending = "";
  // File-backed (not :memory:) so reads after writes share the same DB —
  // libSQL :memory: gives a transaction its own connection. Mirrors production.
  tmpDir = mkdtempSync(join(tmpdir(), "lamina-mfa-"));
  client = createClient({ url: `file:${join(tmpDir, "test.db")}` });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

afterEach(() => {
  client.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("enrollMfa", () => {
  it("stores the secret encrypted, returns an otpauth URI + 10 backup codes, and audits without leaking secrets", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    const { token } = await createTestSession(userId);
    currentToken = token;
    const { enrollMfa, verifyMfaEnroll, disableMfa, regenerateBackupCodes, verifyMfaAction } = await import("./actions");

    const res = await enrollMfa();
    expect(res.ok).toBe(true);
    const data = (res as { ok: true; data: { otpauthUri: string; backupCodes: string[] } }).data;
    expect(data.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    expect(data.backupCodes).toHaveLength(10);
    data.backupCodes.forEach((c) => expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/));

    // The stored secret is AES-GCM ciphertext, NOT the plaintext base32.
    const [row] = await testDb.select().from(userMfa).where(eq(userMfa.userId, userId));
    expect(row).toBeTruthy();
    expect(row!.secret).not.toMatch(/^[A-Z2-9]+$/); // not raw base32
    expect(row!.secret).includes(":"); // iv:ciphertext:tag
    // Round-trips through decrypt.
    expect(decryptSecret(row!.secret)).toMatch(/^[A-Z2-9]+$/);

    // 10 hashed backup codes persisted; none raw.
    const codeRows = await testDb
      .select()
      .from(userBackupCodes)
      .where(eq(userBackupCodes.userId, userId));
    expect(codeRows).toHaveLength(10);
    codeRows.forEach((r) => {
      expect(r.codeHash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
      expect(r.usedAt).toBeNull();
    });

    // CWE-532: audit meta must NOT contain the secret or any backup code.
    const enrollStart = writeAudit.mock.calls.find((c) => c[0]?.action === "mfa.enroll-start");
    expect(enrollStart).toBeTruthy();
    const meta = JSON.stringify(enrollStart![0]?.meta ?? {});
    expect(meta).not.toContain(row!.secret);
    for (const c of data.backupCodes) expect(meta).not.toContain(c);
  });

  it("replaces a prior enrollment + backup codes on re-enroll", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    const { token } = await createTestSession(userId);
    currentToken = token;
    const { enrollMfa, verifyMfaEnroll, disableMfa, regenerateBackupCodes, verifyMfaAction } = await import("./actions");

    const first = await enrollMfa();
    const firstCodes = (first as { ok: true; data: { backupCodes: string[] } }).data.backupCodes;
    const second = await enrollMfa();
    const secondCodes = (second as { ok: true; data: { backupCodes: string[] } }).data.backupCodes;

    // Still exactly one MFA row + 10 code rows (old codes invalidated).
    const mfaRows = await testDb.select().from(userMfa).where(eq(userMfa.userId, userId));
    expect(mfaRows).toHaveLength(1);
    const codeRows = await testDb
      .select()
      .from(userBackupCodes)
      .where(eq(userBackupCodes.userId, userId));
    expect(codeRows).toHaveLength(10);

    // Old backup codes no longer verify.
    for (const c of firstCodes) {
      expect(await consumeBackupCode(userId, c)).toBe(false);
    }
    // New ones do.
    expect(await consumeBackupCode(userId, secondCodes[0]!)).toBe(true);
  });
});

describe("verifyMfaEnroll", () => {
  it("enables MFA on a valid TOTP and rejects an invalid one (row retained for retry)", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    const { token } = await createTestSession(userId);
    currentToken = token;
    const { enrollMfa, verifyMfaEnroll, disableMfa, regenerateBackupCodes, verifyMfaAction } = await import("./actions");

    await enrollMfa();

    const [mfaRow] = await testDb.select().from(userMfa).where(eq(userMfa.userId, userId));
    const secret = decryptSecret(mfaRow!.secret);
    const valid = (await generate({ secret })).replace(/\s/g, "");

    const ok = await verifyMfaEnroll(valid);
    expect(ok.ok).toBe(true);
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "mfa.enroll" }));

    // Invalid code: error, row still present for retry.
    const bad = await verifyMfaEnroll("000000");
    expect(bad.ok).toBe(false);
    const rows = await testDb.select().from(userMfa).where(eq(userMfa.userId, userId));
    expect(rows).toHaveLength(1);
  });
});

describe("disableMfa", () => {
  it("requires the correct password; wrong password is rejected and nothing is deleted", async () => {
    const roleIds = await seedTestTeam();
    const { userId, password } = await createTestUser({ role: "owner", roleIds });
    const { token } = await createTestSession(userId);
    currentToken = token;
    const { enrollMfa, verifyMfaEnroll, disableMfa, regenerateBackupCodes, verifyMfaAction } = await import("./actions");

    await enrollMfa();

    const wrong = await disableMfa("totally-wrong-password");
    expect(wrong.ok).toBe(false);
    expect((wrong as { error: string }).error).toMatch(/password/i);
    const mfaRows = await testDb.select().from(userMfa).where(eq(userMfa.userId, userId));
    expect(mfaRows).toHaveLength(1);

    const ok = await disableMfa(password);
    expect(ok.ok).toBe(true);
  });

  it("deletes user_mfa + backup codes and destroys all other sessions", async () => {
    const roleIds = await seedTestTeam();
    const { userId, password } = await createTestUser({ role: "owner", roleIds });
    const { token } = await createTestSession(userId);
    currentToken = token;
    const { enrollMfa, verifyMfaEnroll, disableMfa, regenerateBackupCodes, verifyMfaAction } = await import("./actions");
    // A second session (the "other" device) that should be destroyed.
    await createTestSession(userId, { label: "other-device" });

    await enrollMfa();
    await disableMfa(password);

    expect(await testDb.select().from(userMfa).where(eq(userMfa.userId, userId))).toHaveLength(0);
    expect(
      await testDb.select().from(userBackupCodes).where(eq(userBackupCodes.userId, userId)),
    ).toHaveLength(0);
    const remaining = await testDb
      .select()
      .from(sessions)
      .where(and(eq(sessions.kind, "admin"), eq(sessions.userId, userId)));
    expect(remaining).toHaveLength(0);
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "mfa.disable" }));
  });
});

describe("regenerateBackupCodes", () => {
  it("requires re-auth; invalidates old codes and returns 10 new ones", async () => {
    const roleIds = await seedTestTeam();
    const { userId, password } = await createTestUser({ role: "owner", roleIds });
    const { token } = await createTestSession(userId);
    currentToken = token;
    const { enrollMfa, verifyMfaEnroll, disableMfa, regenerateBackupCodes, verifyMfaAction } = await import("./actions");

    const enrolled = await enrollMfa();
    const oldCodes = (enrolled as { ok: true; data: { backupCodes: string[] } }).data.backupCodes;

    const wrong = await regenerateBackupCodes("nope-wrong-password");
    expect(wrong.ok).toBe(false);

    const ok = await regenerateBackupCodes(password);
    expect(ok.ok).toBe(true);
    const newCodes = (ok as { ok: true; data: { codes: string[] } }).data.codes;
    expect(newCodes).toHaveLength(10);

    // Old codes are invalidated (replay fails).
    for (const c of oldCodes) expect(await consumeBackupCode(userId, c)).toBe(false);
    // A new code works.
    expect(await consumeBackupCode(userId, newCodes[0]!)).toBe(true);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "mfa.backup-codes.regenerate" }),
    );
  });
});

describe("backup code consume", () => {
  it("is single-use: a replay of the same code fails", async () => {
    await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner" });
    const code = generateBackupCodes(1)[0]!;
    await testDb
      .insert(userBackupCodes)
      .values({ userId, codeHash: hashBackupCode(code) });

    expect(await consumeBackupCode(userId, code)).toBe(true);
    // Replay → false (usedAt now set).
    expect(await consumeBackupCode(userId, code)).toBe(false);
  });

  it("a DB leak of the hash alone can't be used as a code", async () => {
    await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner" });
    const code = generateBackupCodes(1)[0]!;
    await testDb
      .insert(userBackupCodes)
      .values({ userId, codeHash: hashBackupCode(code) });

    const [row] = await testDb
      .select()
      .from(userBackupCodes)
      .where(eq(userBackupCodes.userId, userId));
    // The stored hash is NOT a valid code.
    expect(await consumeBackupCode(userId, row!.codeHash)).toBe(false);
  });

  it("rejects a code that belongs to a different user", async () => {
    await seedTestTeam();
    const { userId: aId } = await createTestUser({ role: "owner", email: "a@example.com" });
    const { userId: bId } = await createTestUser({ role: "editor", email: "b@example.com" });
    const code = generateBackupCodes(1)[0]!;
    await testDb
      .insert(userBackupCodes)
      .values({ userId: aId, codeHash: hashBackupCode(code) });

    expect(await consumeBackupCode(bId, code)).toBe(false);
  });
});

describe("verifyMfaAction", () => {
  it("creates a session + deletes the pending cookie on a valid TOTP", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    const { token } = await createTestSession(userId);
    currentToken = token;
    const { enrollMfa, verifyMfaEnroll, disableMfa, regenerateBackupCodes, verifyMfaAction } = await import("./actions");

    await enrollMfa();
    const [mfaRow] = await testDb.select().from(userMfa).where(eq(userMfa.userId, userId));
    const secret = decryptSecret(mfaRow!.secret);
    const valid = (await generate({ secret })).replace(/\s/g, "");

    currentMfaPending = makeSignedToken("mfa-pending", userId, 15 * 60 * 1000);
    currentToken = ""; // no admin session — this is the MFA gate, pre-session

    await expect(verifyMfaAction({}, form({ code: valid }))).rejects.toBeInstanceOf(RedirectError);
    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(createAdminSession).toHaveBeenCalledWith(userId);
    expect(mockJar.delete).toHaveBeenCalledWith("mfa_pending");
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ userId, action: "auth.login.mfa" }),
    );
  });

  it("falls back to a backup code when TOTP fails, then deletes the cookie", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    const { token } = await createTestSession(userId);
    currentToken = token;
    const { enrollMfa, verifyMfaEnroll, disableMfa, regenerateBackupCodes, verifyMfaAction } = await import("./actions");

    const enrolled = await enrollMfa();
    const backup = (enrolled as { ok: true; data: { backupCodes: string[] } }).data.backupCodes[0]!;

    currentMfaPending = makeSignedToken("mfa-pending", userId, 15 * 60 * 1000);
    currentToken = "";

    await expect(verifyMfaAction({}, form({ code: backup }))).rejects.toBeInstanceOf(RedirectError);
    expect(createAdminSession).toHaveBeenCalledWith(userId);
    expect(mockJar.delete).toHaveBeenCalledWith("mfa_pending");
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ userId, action: "auth.login.mfa-backup" }),
    );
    // The used backup code is now consumed.
    const [row] = await testDb
      .select()
      .from(userBackupCodes)
      .where(eq(userBackupCodes.codeHash, hashBackupCode(backup)));
    expect(row!.usedAt).not.toBeNull();
  });

  it("fails on a wrong code without creating a session", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    const { token } = await createTestSession(userId);
    currentToken = token;
    const { enrollMfa, verifyMfaEnroll, disableMfa, regenerateBackupCodes, verifyMfaAction } = await import("./actions");

    await enrollMfa();

    currentMfaPending = makeSignedToken("mfa-pending", userId, 15 * 60 * 1000);
    currentToken = "";

    const res = await verifyMfaAction({}, form({ code: "000000" }));
    expect(res.error).toBeTruthy();
    expect(createAdminSession).not.toHaveBeenCalled();
    expect(mockJar.delete).not.toHaveBeenCalledWith("mfa_pending");
  });

  it("clears the pending cookie after 3 failed attempts, forcing re-login", async () => {
    const roleIds = await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner", roleIds });
    const { token } = await createTestSession(userId);
    currentToken = token;
    const { enrollMfa, verifyMfaEnroll, disableMfa, regenerateBackupCodes, verifyMfaAction } = await import("./actions");

    await enrollMfa();

    currentMfaPending = makeSignedToken("mfa-pending", userId, 15 * 60 * 1000);
    currentToken = "";

    const r1 = await verifyMfaAction({}, form({ code: "000000" }));
    const r2 = await verifyMfaAction({}, form({ code: "111111" }));
    expect(r1.error).toBeTruthy();
    expect(r2.error).toBeTruthy();
    expect(mockJar.delete).not.toHaveBeenCalledWith("mfa_pending");

    // 3rd failure → cookie cleared, forced re-login.
    const r3 = await verifyMfaAction({}, form({ code: "222222" }));
    expect(r3.error).toMatch(/too many failed attempts/i);
    expect(mockJar.delete).toHaveBeenCalledWith("mfa_pending");
    expect(createAdminSession).not.toHaveBeenCalled();
  });

  it("rejects an expired/invalid pending cookie with no session creation", async () => {
    await seedTestTeam();
    const { userId } = await createTestUser({ role: "owner" });
    const { verifyMfaAction } = await import("./actions");

    // No pending cookie at all.
    currentMfaPending = "";
    const r1 = await verifyMfaAction({}, form({ code: "123456" }));
    expect(r1.error).toMatch(/expired/i);

    // Tampered / garbage token.
    currentMfaPending = "garbage.token.value";
    const r2 = await verifyMfaAction({}, form({ code: "123456" }));
    expect(r2.error).toMatch(/expired/i);
    expect(createAdminSession).not.toHaveBeenCalled();
    void userId;
  });
});
