import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let testDb: ReturnType<typeof drizzle<typeof schema>>;
let tmpDir: string;
let cleanup: () => void;

vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));

const { runMigrations } = await import("./migrate");

describe("runMigrations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    tmpDir = mkdtempSync(join(tmpdir(), "lamina-migrate-test-"));
    const url = `file:${join(tmpDir, "test.db")}`;
    const client = createClient({ url });
    testDb = drizzle(client, { schema });
    cleanup = () => client.close();
  });

  afterEach(() => cleanup());

  it("applies migrations to a fresh SQLite database without error", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
    await runMigrations();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("migrations completed successfully"),
    );

    // Verify tables exist by querying a known schema table.
    const result = await testDb.run(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`,
    );
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("detects libSQL/SQLite dialect from a file: URL", async () => {
    process.env.DATABASE_URL = `file:${join(tmpDir, "test.db")}`;
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
    await runMigrations();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("libSQL/SQLite"),
    );
    delete process.env.DATABASE_URL;
  });

  it("detects Postgres dialect from a postgres:// URL", async () => {
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/testdb";
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
    // The actual migrate() call will fail (no real Postgres), but the
    // detection log happens before the import attempt.
    await runMigrations();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Postgres"),
    );
    process.env.DATABASE_URL = originalUrl;
  });

  it("catches migration errors gracefully without throwing", async () => {
    const originalCwd = process.cwd();
    // Point cwd to a directory with no drizzle/ folder so the migrator fails.
    process.chdir(tmpDir);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    await expect(runMigrations()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("migrations failed"),
      expect.anything(),
    );
    process.chdir(originalCwd);
  });

  it("skips execution in a browser-like environment", async () => {
    const originalWindow = (globalThis as { window?: unknown }).window;
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
    });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
    await runMigrations();
    // No migration logs should appear — the function returned early.
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Auto-migration"),
    );
    delete (globalThis as { window?: unknown }).window;
    if (originalWindow !== undefined) {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
      });
    }
  });
});
