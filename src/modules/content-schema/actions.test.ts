import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import type { FieldDef } from "@/modules/custom-types/validation";

/**
 * Exercises the real content-schema server actions against a fresh in-memory,
 * migrated DB — the harness modules/importers/ghost/review-actions.test.ts
 * established: mock @/lib/db/client to the test db, stub auth/audit/cache.
 * Because crud/introspect/actions all import the same `db`, one mock covers
 * the whole engine.
 */
let client: Client;
let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));
const owner = { id: "u1", email: "owner@example.com", name: "Owner", role: "owner" as const };
vi.mock("@/modules/auth/guards", () => ({ requireUser: vi.fn(async () => owner) }));
vi.mock("@/modules/audit/log", () => ({ writeAudit: vi.fn(async () => undefined) }));
vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return { ...actual, updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() };
});

const f = (key: string, kind: FieldDef["kind"]): FieldDef => ({ key, label: key, kind });

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

describe("content-schema actions", () => {
  it("createTableBackedType provisions a real table + metadata row", async () => {
    const { createTableBackedType } = await import("./actions");
    const { tableExists, tableColumns } = await import("./introspect");

    const res = await createTableBackedType({
      slug: "products",
      name: "Product",
      fields: [f("price", "number"), f("description", "text")],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data!.tableName).toBe("ct_products");
    expect(await tableExists("ct_products")).toBe(true);
    expect(await tableColumns("ct_products")).toEqual(expect.arrayContaining(["id", "slug", "price", "description"]));

    const row = await testDb.query.customTypes.findFirst();
    expect(row?.tableName).toBe("ct_products");
    expect(row?.slug).toBe("products");
  });

  it("rejects a field key that collides with a spine column", async () => {
    const { createTableBackedType } = await import("./actions");
    const res = await createTableBackedType({
      slug: "x",
      name: "X",
      fields: [f("slug", "text")],
    });
    expect(res.ok).toBe(false);
  });

  it("rejects a duplicate slug", async () => {
    const { createTableBackedType } = await import("./actions");
    await createTableBackedType({ slug: "p", name: "P", fields: [f("a", "text")] });
    const res = await createTableBackedType({ slug: "p", name: "P2", fields: [f("b", "text")] });
    expect(res.ok).toBe(false);
  });

  it("updateTableBackedTypeSchema adds a column and blocks data loss without confirm", async () => {
    const { createTableBackedType, updateTableBackedTypeSchema } = await import("./actions");
    const { tableColumns } = await import("./introspect");
    const created = await createTableBackedType({ slug: "p", name: "P", fields: [f("price", "number")] });
    if (!created.ok) throw new Error("setup failed");

    // Add a field.
    const add = await updateTableBackedTypeSchema(created.data!.id, [f("price", "number"), f("sku", "text")]);
    expect(add.ok).toBe(true);
    expect(await tableColumns("ct_p")).toContain("sku");

    // Removing a field drops data → blocked without confirmation.
    const blocked = await updateTableBackedTypeSchema(created.data!.id, [f("price", "number")]);
    expect(blocked.ok).toBe(false);

    // With confirmation, it proceeds.
    const forced = await updateTableBackedTypeSchema(created.data!.id, [f("price", "number")], {
      confirmDataLoss: true,
    });
    expect(forced.ok).toBe(true);
    expect(await tableColumns("ct_p")).not.toContain("sku");
  });

  it("deleteTableBackedType drops the table and refuses when published unless forced", async () => {
    const { createTableBackedType, deleteTableBackedType } = await import("./actions");
    const { tableExists } = await import("./introspect");
    const { customTypes } = await import("@/modules/custom-types/schema");
    const { eq } = await import("drizzle-orm");
    const created = await createTableBackedType({ slug: "p", name: "P", fields: [f("a", "text")] });
    if (!created.ok) throw new Error("setup failed");

    // Mark published → delete refused without force.
    await testDb.update(customTypes).set({ status: "published" }).where(eq(customTypes.id, created.data!.id));
    const refused = await deleteTableBackedType(created.data!.id);
    expect(refused.ok).toBe(false);
    expect(await tableExists("ct_p")).toBe(true);

    // Force delete.
    const forced = await deleteTableBackedType(created.data!.id, { force: true });
    expect(forced.ok).toBe(true);
    expect(await tableExists("ct_p")).toBe(false);
    expect(await testDb.query.customTypes.findFirst()).toBeUndefined();
  });

  it("verifyContentSchema detects a missing table as drift", async () => {
    const { createTableBackedType, verifyContentSchema } = await import("./actions");
    const created = await createTableBackedType({ slug: "p", name: "P", fields: [f("a", "text")] });
    if (!created.ok) throw new Error("setup failed");
    // Drop the table out from under the metadata to simulate drift.
    await testDb.run((await import("./ddl")).dropTableStatement("ct_p"));
    const res = await verifyContentSchema();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data!.drift).toHaveLength(1);
    expect(res.data!.drift[0]!.issue).toContain("missing");
  });
});
