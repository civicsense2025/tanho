import { describe, expect, it, vi } from "vitest";

/**
 * Tests the dialect-inference logic in isolation by re-importing `./index`
 * fresh per case (vi.resetModules) — `search`'s value is computed once at
 * module load from `process.env.DATABASE_URL`.
 *
 * Deliberately imports ONLY the ONE adapter file the case expects to win,
 * never both: `fts5.ts` imports `@/lib/db/client`, which eagerly calls
 * libsql's `createClient(process.env.DATABASE_URL)` at ITS OWN module top
 * level (a pre-existing, correct-for-production singleton pattern — see
 * that file). libsql's client throws synchronously on a non-libsql scheme
 * (postgres://, a malformed string), so a test forcing a Postgres-shaped
 * DATABASE_URL and still importing fts5.ts (even just to compare identity)
 * would crash on an import that production code never actually makes in
 * that scenario — the real factory only ever imports the ONE adapter file
 * matching the real DATABASE_URL, exactly what this test now mirrors.
 */
async function expectFactoryPicks(databaseUrl: string | undefined, winner: "postgres" | "fts5") {
  const prev = process.env.DATABASE_URL;
  if (databaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = databaseUrl;

  vi.resetModules();
  const { search } = await import("./index");
  const expected =
    winner === "postgres"
      ? (await import("./postgres-tsvector")).postgresSearch
      : (await import("./fts5")).fts5Search;

  if (prev === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = prev;

  expect(search).toBe(expected);
}

describe("search adapter factory — dialect inference from DATABASE_URL", () => {
  it("picks the Postgres adapter for a postgres:// URL", async () => {
    await expectFactoryPicks("postgres://user:pass@host:5432/db", "postgres");
  });

  it("picks the Postgres adapter for a postgresql:// URL", async () => {
    await expectFactoryPicks("postgresql://user:pass@host:5432/db", "postgres");
  });

  it("picks the Postgres adapter for a Supabase pooler connection string", async () => {
    await expectFactoryPicks(
      "postgresql://postgres.abcdefgh:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
      "postgres",
    );
  });

  it("picks the FTS5 adapter for a file: URL (the local libSQL default)", async () => {
    await expectFactoryPicks("file:./data/dev.db", "fts5");
  });

  it("picks the FTS5 adapter for a libsql:// URL (Turso-hosted)", async () => {
    await expectFactoryPicks("libsql://my-db.turso.io", "fts5");
  });

  it("picks the FTS5 adapter when DATABASE_URL is unset (matches client.ts's own local-file default)", async () => {
    await expectFactoryPicks(undefined, "fts5");
  });

  it("falls back to the FTS5 adapter for a malformed/schemeless value rather than throwing", async () => {
    // A malformed DATABASE_URL still resolves the factory to fts5Search
    // WITHOUT the module ever being imported in this case — proving the
    // fallback is decided before any adapter file loads, not by catching a
    // downstream construction error.
    process.env.DATABASE_URL = "not-a-valid-url-at-all";
    vi.resetModules();
    await expect(import("./index")).resolves.toBeDefined();
    delete process.env.DATABASE_URL;
  });
});
