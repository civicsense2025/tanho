import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration test against a REAL, disposable Postgres database — not a
 * mock. Requires POSTGRES_TEST_DATABASE_URL (a scratch database already
 * migrated with scripts/postgres-search-tsvector.sql, including the lamina_app
 * role from docs/recipes/swap-database-to-postgres.md's step 1 — this
 * adapter's own migration's RLS policy grants that role, so the connection
 * used here must authenticate AS it). Skips (not fails) when that env var is
 * absent, since most contributors run the default SQLite/libSQL dialect day
 * to day and won't have a Postgres instance handy — the FTS5 suite
 * (fts5.test.ts) is what runs unconditionally against this repo's own
 * dev.db. See docs/recipes/swap-database-to-postgres.md for how to stand up
 * a real instance to run this suite locally.
 *
 * `postgresSearch` reads `DATABASE_URL` at first call (a lazily-created
 * module-level pool — see postgres-tsvector.ts), so it's set here BEFORE the
 * dynamic import, not via a static top-of-file import.
 */
const TEST_DB_URL = process.env.POSTGRES_TEST_DATABASE_URL;
const TEST_PREFIX = "__pgts_test__";

describe.skipIf(!TEST_DB_URL)("postgresSearch", () => {
  let postgresSearch: typeof import("./postgres-tsvector").postgresSearch;
  let pool: import("pg").Pool;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    ({ postgresSearch } = await import("./postgres-tsvector"));
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: TEST_DB_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  async function cleanup(): Promise<void> {
    await pool.query("DELETE FROM search_index WHERE id LIKE $1", [`${TEST_PREFIX}%`]);
  }

  afterEach(cleanup);

  function doc(overrides: Partial<import("../types").SearchDocument> = {}): import("../types").SearchDocument {
    return {
      id: `${TEST_PREFIX}page:1`,
      type: "page",
      sourceId: "page-1",
      title: "Getting Started Guide",
      body: "Learn how widgets and gadgets work together in this comprehensive guide.",
      path: "/guide",
      gate: null,
      updatedAt: 1700000000000,
      ...overrides,
    };
  }

  it("reports true once the migrated table exists", async () => {
    expect(await postgresSearch.isConfigured()).toBe(true);
  });

  it("indexes a document and finds it by a body term", async () => {
    await postgresSearch.index(doc());
    const hits = await postgresSearch.search("widgets");
    expect(hits.some((h) => h.document.id === `${TEST_PREFIX}page:1`)).toBe(true);
  });

  it("finds a document by a title term", async () => {
    await postgresSearch.index(doc());
    const hits = await postgresSearch.search("Getting");
    expect(hits.some((h) => h.document.id === `${TEST_PREFIX}page:1`)).toBe(true);
  });

  it("returns no hits for a term that doesn't appear", async () => {
    await postgresSearch.index(doc());
    const hits = await postgresSearch.search("nonexistentxyzterm");
    expect(hits.some((h) => h.document.id === `${TEST_PREFIX}page:1`)).toBe(false);
  });

  it("re-indexing the same id upserts rather than duplicates", async () => {
    await postgresSearch.index(doc({ title: "Original Title" }));
    await postgresSearch.index(doc({ title: "Updated Title" }));
    const countRow = await pool.query("SELECT COUNT(*)::int AS c FROM search_index WHERE id = $1", [`${TEST_PREFIX}page:1`]);
    expect(countRow.rows[0].c).toBe(1);
    const hits = await postgresSearch.search("Updated");
    expect(hits.some((h) => h.document.id === `${TEST_PREFIX}page:1`)).toBe(true);
  });

  it("remove() deletes the document so it no longer matches", async () => {
    await postgresSearch.index(doc());
    await postgresSearch.remove(`${TEST_PREFIX}page:1`);
    const hits = await postgresSearch.search("widgets");
    expect(hits.some((h) => h.document.id === `${TEST_PREFIX}page:1`)).toBe(false);
  });

  it("round-trips a stored gate through JSONB and returns it unchanged", async () => {
    await postgresSearch.index(doc({ gate: { kind: "membership", tier: "founding" } }));
    const hits = await postgresSearch.search("widgets");
    const hit = hits.find((h) => h.document.id === `${TEST_PREFIX}page:1`);
    expect(hit?.document.gate).toEqual({ kind: "membership", tier: "founding" });
  });

  it("a null gate round-trips as null", async () => {
    await postgresSearch.index(doc({ gate: null }));
    const hits = await postgresSearch.search("widgets");
    const hit = hits.find((h) => h.document.id === `${TEST_PREFIX}page:1`);
    expect(hit?.document.gate).toBeNull();
  });

  it("filters by document type when opts.types is given", async () => {
    await postgresSearch.index(doc({ id: `${TEST_PREFIX}page:2`, type: "page", body: "zzyzxsearchable content" }));
    await postgresSearch.index(doc({ id: `${TEST_PREFIX}entry:2`, type: "entry", sourceId: "entry-1", body: "zzyzxsearchable content" }));
    const pagesOnly = await postgresSearch.search("zzyzxsearchable", { types: ["page"] });
    const ids = pagesOnly.map((h) => h.document.id);
    expect(ids).toContain(`${TEST_PREFIX}page:2`);
    expect(ids).not.toContain(`${TEST_PREFIX}entry:2`);
  });

  it("ranks a title match above a body-only match (weight A > weight B)", async () => {
    await postgresSearch.index(doc({ id: `${TEST_PREFIX}page:title`, title: "zyzzyva keyword here", body: "unrelated filler text" }));
    await postgresSearch.index(doc({ id: `${TEST_PREFIX}page:body`, title: "Unrelated title", body: "the zyzzyva keyword appears here" }));
    const hits = await postgresSearch.search("zyzzyva");
    const ids = hits.map((h) => h.document.id);
    expect(ids.indexOf(`${TEST_PREFIX}page:title`)).toBeLessThan(ids.indexOf(`${TEST_PREFIX}page:body`));
  });

  it("never throws on malformed query-language input (quotes, OR, parens, dash, star)", async () => {
    await postgresSearch.index(doc());
    for (const malformed of ['"unterminated', "foo OR", "()", "-", "*", '""']) {
      await expect(postgresSearch.search(malformed)).resolves.not.toThrow();
    }
  });

  it("returns an empty array for a query that tokenizes to nothing (blank/whitespace)", async () => {
    expect(await postgresSearch.search("   ")).toEqual([]);
    expect(await postgresSearch.search("")).toEqual([]);
  });

  it("clamps limit to the adapter's hard max even when a caller asks for more", async () => {
    const hits = await postgresSearch.search("widgets", { limit: 10_000 });
    expect(hits.length).toBeLessThanOrEqual(50);
  });

  it("every hit's snippet is drawn from the BODY (highlighting the matched term), not the title — ts_headline references the body column by name, so this can't regress the way fts5.ts's positional snippet() index once did, but assert it directly rather than just checking non-empty length", async () => {
    await postgresSearch.index(doc());
    const hits = await postgresSearch.search("widgets");
    const hit = hits.find((h) => h.document.id === `${TEST_PREFIX}page:1`);
    expect(hit?.snippet).toContain("<mark>widgets</mark>");
    expect(hit?.snippet).not.toBe(doc().title);
  });
});
