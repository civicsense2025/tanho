import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import type { FieldDef } from "@/modules/custom-types/validation";

/**
 * Row-data CRUD for table-backed content types. Uses the ghost harness
 * (in-memory migrated db + mocked auth/audit/cache) and mocks the search
 * index-document module so search-index calls are observable without touching
 * the real FTS table.
 */
let client: Client;
let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));
const owner = { id: "u1", email: "o@example.com", name: "O", role: "owner" as const };
vi.mock("@/modules/auth/guards", () => ({ requireUser: vi.fn(async () => owner) }));
vi.mock("@/modules/audit/log", () => ({ writeAudit: vi.fn(async () => undefined) }));
vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return { ...actual, updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() };
});
const indexContentRow = vi.fn(async (..._a: unknown[]) => undefined);
const removeContentRow = vi.fn(async (..._a: unknown[]) => undefined);
const reindexContentType = vi.fn(async (..._a: unknown[]) => undefined);
vi.mock("@/modules/search/index-document", () => ({
  indexContentRow,
  removeContentRow,
  reindexContentType,
}));

const f = (key: string, kind: FieldDef["kind"]): FieldDef => ({ key, label: key, kind });

async function seedType(): Promise<string> {
  // Create a real ct_ table + metadata via the content-schema action.
  const { createTableBackedType } = await import("./actions");
  const res = await createTableBackedType({
    slug: "products",
    name: "Product",
    fields: [f("price", "number"), f("featured", "boolean"), f("tags", "tags")],
    titleField: "title",
    slugField: "slug",
  });
  if (!res.ok) throw new Error("seed type failed: " + res.error);
  // Give it a base path + publish so indexing has a path.
  const { customTypes } = await import("@/modules/custom-types/schema");
  const { eq } = await import("drizzle-orm");
  await testDb
    .update(customTypes)
    .set({ basePath: "/products", status: "published" })
    .where(eq(customTypes.id, res.data!.id));
  return res.data!.id;
}

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  indexContentRow.mockClear();
  removeContentRow.mockClear();
  reindexContentType.mockClear();
});

describe("content-schema row actions", () => {
  it("creates a published row, coerces values, and indexes it", async () => {
    const typeId = await seedType();
    const { createRow } = await import("./row-actions");
    const { getRowBySlug } = await import("./crud");

    const res = await createRow(typeId, {
      title: "My Widget",
      price: "9.99",
      featured: "on",
      tags: ["a", "b"],
      status: "published",
    });
    expect(res.ok).toBe(true);

    const row = await getRowBySlug("ct_products", "my-widget");
    expect(row).toMatchObject({ title: "My Widget", slug: "my-widget", price: 9.99 });
    // boolean coerced to 0/1 in SQLite
    expect(row?.featured).toBe(1);
    // tags stored as JSON string
    expect(row?.tags).toBe('["a","b"]');
    expect(indexContentRow).toHaveBeenCalledOnce();
  });

  it("does not index a draft row", async () => {
    const typeId = await seedType();
    const { createRow } = await import("./row-actions");
    await createRow(typeId, { title: "Draft One", status: "draft" });
    expect(indexContentRow).not.toHaveBeenCalled();
  });

  it("rejects a duplicate slug", async () => {
    const typeId = await seedType();
    const { createRow } = await import("./row-actions");
    await createRow(typeId, { title: "Dup" });
    const res = await createRow(typeId, { title: "Dup" });
    expect(res.ok).toBe(false);
  });

  it("publish indexes, unpublish removes", async () => {
    const typeId = await seedType();
    const { createRow, setRowStatus } = await import("./row-actions");
    const created = await createRow(typeId, { title: "Toggle", status: "draft" });
    if (!created.ok) throw new Error("setup");
    indexContentRow.mockClear();

    await setRowStatus(typeId, created.data!.id, "published");
    expect(indexContentRow).toHaveBeenCalledOnce();

    await setRowStatus(typeId, created.data!.id, "draft");
    expect(removeContentRow).toHaveBeenCalledOnce();
  });

  it("delete removes the row and de-indexes it", async () => {
    const typeId = await seedType();
    const { createRow, deleteRowData } = await import("./row-actions");
    const { getRowBySlug } = await import("./crud");
    const created = await createRow(typeId, { title: "Gone", status: "published" });
    if (!created.ok) throw new Error("setup");

    await deleteRowData(typeId, created.data!.id);
    expect(await getRowBySlug("ct_products", "gone")).toBeNull();
    expect(removeContentRow).toHaveBeenCalled();
  });

  it("allows the same leaf slug under different parents (nesting), rejects a true path clash", async () => {
    // Regression: uniqueness must be on the materialized PATH, not the bare slug,
    // or hierarchical types can't hold two `.../overview` pages. Exercises the
    // real ct_ DDL (path-unique index) + createRow's path-based clash check.
    const typeId = await seedType();
    const { customTypes } = await import("@/modules/custom-types/schema");
    const { eq } = await import("drizzle-orm");
    await testDb
      .update(customTypes)
      .set({ isHierarchical: true, permalinkPattern: "{base}/{parent_path}/{slug}" })
      .where(eq(customTypes.id, typeId));

    const { createRow } = await import("./row-actions");
    const { getRowByPath } = await import("./crud");

    const a = await createRow(typeId, { title: "Section A", slug: "a" });
    const b = await createRow(typeId, { title: "Section B", slug: "b" });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    // Same leaf slug "overview" under two different parents → BOTH succeed.
    const oa = await createRow(typeId, { title: "Overview", slug: "overview", parent_id: a.data!.id });
    const ob = await createRow(typeId, { title: "Overview", slug: "overview", parent_id: b.data!.id });
    expect(oa.ok).toBe(true);
    expect(ob.ok).toBe(true);
    expect(await getRowByPath("ct_products", "/products/a/overview")).not.toBeNull();
    expect(await getRowByPath("ct_products", "/products/b/overview")).not.toBeNull();

    // But a THIRD "overview" under parent A (same path) is rejected.
    const dup = await createRow(typeId, { title: "Overview", slug: "overview", parent_id: a.data!.id });
    expect(dup.ok).toBe(false);
  });

  it("sync reindexes all published rows", async () => {
    const typeId = await seedType();
    const { createRow, syncTypeSearchIndex } = await import("./row-actions");
    await createRow(typeId, { title: "One", status: "published" });
    await createRow(typeId, { title: "Two", status: "published" });
    await createRow(typeId, { title: "Three", status: "draft" });

    const res = await syncTypeSearchIndex(typeId);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data!.indexed).toBe(2); // only published
    expect(reindexContentType).toHaveBeenCalledOnce();
  });
});
