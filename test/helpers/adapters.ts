import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";
import type { DbAdapter } from "@/lib/db/types";

/**
 * Spins up a fresh, isolated adapter of each backend for the contract suite, plus a
 * teardown. Each backend construction reads its connection env at call time (see the
 * adapters' create*Adapter()), so we set the relevant env just before constructing and
 * restore it after — keeping the three backends hermetic within one test process.
 *
 * libsql: a throwaway file DB under a temp dir (in-memory `:memory:` can't be shared across
 *   the multiple client connections a migration + queries open, so a temp file is the
 *   reliable zero-infra choice).
 * mongodb: an in-process mongodb-memory-server — no Docker, works locally and in CI.
 * postgres: only when DATABASE_URL is provided (CI service container); skipped otherwise.
 */

export interface BackendHarness {
  name: string;
  make: () => Promise<DbAdapter>;
  teardown: () => Promise<void>;
  available: boolean;
}

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

export function libsqlHarness(): BackendHarness {
  let dir: string | null = null;
  return {
    name: "libsql",
    available: true,
    async make() {
      dir = mkdtempSync(join(tmpdir(), "tanho-libsql-"));
      const url = `file:${join(dir, "test.db")}`;
      const { createLibsqlAdapter } = await import("@/lib/db/adapters/libsql");
      const adapter = withEnv({ TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: undefined }, () =>
        createLibsqlAdapter()
      );
      await adapter.migrate();
      return adapter;
    },
    async teardown() {
      if (dir) rmSync(dir, { recursive: true, force: true });
      dir = null;
    },
  };
}

export function mongoHarness(): BackendHarness {
  let server: import("mongodb-memory-server").MongoMemoryServer | null = null;
  return {
    name: "mongodb",
    available: true,
    async make() {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      server = await MongoMemoryServer.create();
      const uri = server.getUri();
      const { createMongoAdapter } = await import("@/lib/db/adapters/mongodb");
      const adapter = withEnv(
        { MONGODB_URL: uri, MONGODB_DB: `tanho_test_${Math.floor(process.hrtime()[1])}` },
        () => createMongoAdapter()
      );
      await adapter.migrate();
      return adapter;
    },
    async teardown() {
      if (server) await server.stop();
      server = null;
    },
  };
}

export function postgresHarness(): BackendHarness {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let schema: string | null = null;
  return {
    name: "postgres",
    available: Boolean(url),
    async make() {
      // Isolate each run in its own schema so parallel test files never collide and cleanup
      // is a single DROP SCHEMA CASCADE. Postgres doesn't auto-create a schema just because
      // search_path names it -- every CREATE TABLE would otherwise fail with "no schema has
      // been selected to create in", which is exactly what happened here before this fix: the
      // schema was never actually created, only pointed at. Date.now().toString(36) is always
      // alphanumeric (base-36 encoding of a timestamp), so it's a safe bare identifier with no
      // quoting/escaping needed.
      schema = `tanho_test_${Date.now().toString(36)}`;
      const setupSql = postgres(url!);
      await setupSql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      await setupSql.end();

      const { createPostgresAdapter } = await import("@/lib/db/adapters/postgres");
      const adapter = withEnv(
        { POSTGRES_URL: `${url}?options=-c%20search_path%3D${schema}` },
        () => createPostgresAdapter()
      );
      await adapter.migrate();
      return adapter;
    },
    async teardown() {
      if (schema) {
        const teardownSql = postgres(url!);
        await teardownSql.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
        await teardownSql.end();
      }
      schema = null;
    },
  };
}

/** All backends, filtered to those actually runnable in this environment. */
export function availableBackends(): BackendHarness[] {
  return [libsqlHarness(), mongoHarness(), postgresHarness()].filter((b) => b.available);
}
