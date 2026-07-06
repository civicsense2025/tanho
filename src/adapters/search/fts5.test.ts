import { createClient } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";
import { fts5Search } from "./fts5";
import type { SearchDocument } from "../types";

/**
 * Hits the REAL dev DB (search_index_fts is a hand-authored FTS5 virtual
 * table — see drizzle/0024_search_fts5.sql — created by the same
 * `db:migrate` every table in this repo goes through). Every id used here is
 * prefixed `__fts5_test__` and removed in afterEach, so this never leaves
 * residue in the shared dev.db or collides with real indexed content.
 *
 * Uses its own libsql client (same URL fts5.ts's own lazy client defaults
 * to) rather than importing `db` from `@/lib/db/client` — that import isn't
 * wrong in THIS test (the real dev DB genuinely is libsql), but fts5.ts
 * itself deliberately avoids depending on that shared singleton (see its own
 * header comment), so the test mirrors the same independence instead of
 * re-introducing the coupling one layer up.
 */
const TEST_PREFIX = "__fts5_test__";
const testClient = createClient({ url: process.env.DATABASE_URL ?? "file:./data/dev.db" });

async function cleanup(): Promise<void> {
  await testClient.execute({
    sql: "DELETE FROM search_index_fts WHERE id LIKE ?",
    args: [`${TEST_PREFIX}%`],
  });
}

afterEach(cleanup);

function doc(overrides: Partial<SearchDocument> = {}): SearchDocument {
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

describe("fts5Search.isConfigured", () => {
  it("reports true once the migrated virtual table exists", async () => {
    expect(await fts5Search.isConfigured()).toBe(true);
  });
});

describe("fts5Search.index + search", () => {
  it("indexes a document and finds it by a body term", async () => {
    await fts5Search.index(doc());
    const hits = await fts5Search.search("widgets");
    expect(hits.some((h) => h.document.id === `${TEST_PREFIX}page:1`)).toBe(true);
  });

  it("finds a document by a title term", async () => {
    await fts5Search.index(doc());
    const hits = await fts5Search.search("Getting");
    expect(hits.some((h) => h.document.id === `${TEST_PREFIX}page:1`)).toBe(true);
  });

  it("returns no hits for a term that doesn't appear", async () => {
    await fts5Search.index(doc());
    const hits = await fts5Search.search("nonexistentxyzterm");
    expect(hits.some((h) => h.document.id === `${TEST_PREFIX}page:1`)).toBe(false);
  });

  it("re-indexing the same id replaces rather than duplicates", async () => {
    await fts5Search.index(doc({ title: "Original Title" }));
    await fts5Search.index(doc({ title: "Updated Title" }));
    const countRow = await testClient.execute({
      sql: "SELECT COUNT(*) as c FROM search_index_fts WHERE id = ?",
      args: [`${TEST_PREFIX}page:1`],
    });
    expect(countRow.rows[0]!.c).toBe(1);
    const hits = await fts5Search.search("Updated");
    expect(hits.some((h) => h.document.id === `${TEST_PREFIX}page:1`)).toBe(true);
  });

  it("remove() deletes the document so it no longer matches", async () => {
    await fts5Search.index(doc());
    await fts5Search.remove(`${TEST_PREFIX}page:1`);
    const hits = await fts5Search.search("widgets");
    expect(hits.some((h) => h.document.id === `${TEST_PREFIX}page:1`)).toBe(false);
  });

  it("round-trips a stored gate through JSON and returns it unchanged", async () => {
    await fts5Search.index(doc({ gate: { kind: "membership", tier: "founding" } }));
    const hits = await fts5Search.search("widgets");
    const hit = hits.find((h) => h.document.id === `${TEST_PREFIX}page:1`);
    expect(hit?.document.gate).toEqual({ kind: "membership", tier: "founding" });
  });

  it("a null gate round-trips as null, not the string \"null\"", async () => {
    await fts5Search.index(doc({ gate: null }));
    const hits = await fts5Search.search("widgets");
    const hit = hits.find((h) => h.document.id === `${TEST_PREFIX}page:1`);
    expect(hit?.document.gate).toBeNull();
  });

  it("filters by document type when opts.types is given", async () => {
    await fts5Search.index(doc({ id: `${TEST_PREFIX}page:2`, type: "page", body: "zzyzxsearchable content" }));
    await fts5Search.index(doc({ id: `${TEST_PREFIX}entry:2`, type: "entry", sourceId: "entry-1", body: "zzyzxsearchable content" }));
    const pagesOnly = await fts5Search.search("zzyzxsearchable", { types: ["page"] });
    const ids = pagesOnly.map((h) => h.document.id);
    expect(ids).toContain(`${TEST_PREFIX}page:2`);
    expect(ids).not.toContain(`${TEST_PREFIX}entry:2`);
  });

  it("never throws on malformed FTS5-special-character input (quotes, OR, parens, dash, star)", async () => {
    await fts5Search.index(doc());
    for (const malformed of ['"unterminated', "foo OR", "()", "-", "*", '""']) {
      await expect(fts5Search.search(malformed)).resolves.not.toThrow();
    }
  });

  it("returns an empty array for a query that tokenizes to nothing (blank/whitespace)", async () => {
    expect(await fts5Search.search("   ")).toEqual([]);
    expect(await fts5Search.search("")).toEqual([]);
  });

  it("clamps limit to the adapter's hard max even when a caller asks for more", async () => {
    // Not asserting exact server-side max here (an implementation detail);
    // asserting it does NOT return an unbounded count for a generous ask.
    const hits = await fts5Search.search("widgets", { limit: 10_000 });
    expect(hits.length).toBeLessThanOrEqual(50);
  });

  it("every hit's snippet is drawn from the BODY (highlighting the matched term), not the title — catches a real prior bug where a miscounted column index silently returned the title for every result", async () => {
    await fts5Search.index(doc());
    const hits = await fts5Search.search("widgets");
    const hit = hits.find((h) => h.document.id === `${TEST_PREFIX}page:1`);
    expect(hit?.snippet).toContain("<mark>widgets</mark>");
    expect(hit?.snippet).not.toBe(doc().title);
  });
});
