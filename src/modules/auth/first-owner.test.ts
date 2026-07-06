import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { users } from "@/modules/auth/schema";
import { settings } from "@/modules/settings/schema";
import { hashPassword } from "@/modules/auth/password";

let client: Client;
let testDb: ReturnType<typeof drizzle<typeof schema>>;
let tmpDir: string;

vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));

// The web install action reuses the login machinery — session creation touches
// cookies() and redirect() throws (both need a real Next request). Stub them so
// the DB-gate logic (the thing under test) runs in a plain Vitest process. The
// redirect stub throws the same way Next's does, so success stops there.
const createAdminSession = vi.fn(async () => undefined);
vi.mock("@/modules/auth/session", () => ({
  ADMIN_COOKIE: "admin_session",
  createAdminSession,
}));
class RedirectError extends Error {}
const redirect = vi.fn((url: string) => {
  throw new RedirectError(url);
});
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "1.2.3.4", "user-agent": "test" })),
}));
vi.mock("@/modules/audit/log", () => ({ writeAudit: vi.fn(async () => undefined) }));

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const GOOD = { name: "Ada Lovelace", email: "ada@example.com", password: "correct horse battery" };

beforeEach(async () => {
  vi.clearAllMocks();
  // A file-backed temp DB (not :memory:) so that reads after db.transaction()
  // share the same DB — libSQL :memory: gives a transaction its own connection,
  // which loses visibility of tables not written during that tx. Production
  // (file/Turso) shares the DB across connections, so this mirrors it.
  tmpDir = mkdtempSync(join(tmpdir(), "oys-first-owner-"));
  client = createClient({ url: `file:${join(tmpDir, "test.db")}` });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  const { __resetInstallLatchForTests } = await import("@/modules/onboarding/install-state");
  __resetInstallLatchForTests();
});

afterEach(() => {
  client.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("createFirstOwner", () => {
  it("creates an owner, logs them in, marks install complete, and redirects — when no user exists", async () => {
    const { createFirstOwner } = await import("./first-owner");
    await expect(createFirstOwner({}, form(GOOD))).rejects.toBeInstanceOf(RedirectError);

    const rows = await testDb.query.users.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.email).toBe("ada@example.com");
    expect(rows[0]!.name).toBe("Ada Lovelace");
    expect(rows[0]!.role).toBe("owner");
    expect(rows[0]!.status).toBe("active");
    // Password is hashed, never stored raw.
    expect(rows[0]!.passwordHash).not.toBe(GOOD.password);

    // Logged in via the SAME primitive the login flow uses.
    expect(createAdminSession).toHaveBeenCalledWith(rows[0]!.id, expect.any(Object));
    // Straight into the wizard.
    expect(redirect).toHaveBeenCalledWith("/admin/onboarding");

    // Install namespace stamped complete → the site lock lifts.
    const installRow = await testDb.query.settings.findFirst({
      where: (s, { eq }) => eq(s.namespace, "install"),
    });
    expect((installRow!.data as { completedAt: number }).completedAt).toBeGreaterThan(0);
  });

  it("lowercases + trims the email", async () => {
    const { createFirstOwner } = await import("./first-owner");
    await expect(
      createFirstOwner({}, form({ ...GOOD, email: "  ADA@Example.COM  " })),
    ).rejects.toBeInstanceOf(RedirectError);
    const rows = await testDb.query.users.findMany();
    expect(rows[0]!.email).toBe("ada@example.com");
  });

  it("REFUSES when a user already exists — no second owner, no session, no redirect", async () => {
    await testDb.insert(users).values({
      email: "existing@example.com",
      name: "First",
      passwordHash: await hashPassword("already the owner here"),
      role: "owner",
    });

    const { createFirstOwner } = await import("./first-owner");
    const result = await createFirstOwner({}, form(GOOD));
    expect(result.error).toMatch(/already set up/i);

    // Still exactly one user; nothing was created or logged in.
    const rows = await testDb.query.users.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.email).toBe("existing@example.com");
    expect(createAdminSession).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("rejects a too-short password without creating a user", async () => {
    const { createFirstOwner } = await import("./first-owner");
    const result = await createFirstOwner({}, form({ ...GOOD, password: "short" }));
    expect(result.error).toMatch(/12 characters/i);
    expect(await testDb.query.users.findMany()).toHaveLength(0);
    expect(createAdminSession).not.toHaveBeenCalled();
  });

  it("rejects an invalid email without creating a user", async () => {
    const { createFirstOwner } = await import("./first-owner");
    const result = await createFirstOwner({}, form({ ...GOOD, email: "not-an-email" }));
    expect(result.error).toMatch(/valid email/i);
    expect(await testDb.query.users.findMany()).toHaveLength(0);
  });

  it("rejects a blank name without creating a user", async () => {
    const { createFirstOwner } = await import("./first-owner");
    const result = await createFirstOwner({}, form({ ...GOOD, name: "   " }));
    expect(result.error).toMatch(/name/i);
    expect(await testDb.query.users.findMany()).toHaveLength(0);
  });
});

describe("install-state helpers", () => {
  it("userCount + hasAnyUser reflect the users table", async () => {
    const mod = await import("@/modules/onboarding/install-state");
    expect(await mod.userCount()).toBe(0);
    expect(await mod.hasAnyUser()).toBe(false);

    await testDb.insert(users).values({
      email: "o@example.com",
      name: "Owner",
      passwordHash: await hashPassword("twelve chars plus"),
      role: "owner",
    });
    expect(await mod.userCount()).toBe(1);
    expect(await mod.hasAnyUser()).toBe(true);
  });

  it("isSiteSetUp is false until BOTH a user exists AND install is marked complete", async () => {
    const mod = await import("@/modules/onboarding/install-state");
    mod.__resetInstallLatchForTests();

    // Nothing yet.
    expect(await mod.isSiteSetUp()).toBe(false);

    // A user but no install flag → still locked.
    await testDb.insert(users).values({
      email: "o@example.com",
      name: "Owner",
      passwordHash: await hashPassword("twelve chars plus"),
      role: "owner",
    });
    expect(await mod.isSiteSetUp()).toBe(false);

    // Mark complete → open, and it latches.
    await mod.markInstallComplete();
    expect(await mod.isSiteSetUp()).toBe(true);
  });

  it("markInstallComplete is idempotent — keeps the first timestamp", async () => {
    const mod = await import("@/modules/onboarding/install-state");
    mod.__resetInstallLatchForTests();
    await mod.markInstallComplete();
    const first = (await mod.readInstallState()).completedAt;
    await mod.markInstallComplete();
    const second = (await mod.readInstallState()).completedAt;
    expect(second).toBe(first);
  });
});

// Reference the settings import so the schema is registered on the in-memory db.
void settings;
