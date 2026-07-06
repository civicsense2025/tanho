import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import type { FieldDef } from "@/modules/custom-types/validation";

/**
 * Exercises the admin table-type action wrappers (base path / publish /
 * presentation) against a fresh in-memory, migrated DB. Same harness as
 * content-schema/actions.test.ts: mock @/lib/db/client to the test db, stub
 * auth/audit/cache. `baseCollision` (called by the base-path + publish
 * wrappers) reaches getPublishedPage — a real cached query — which the
 * next/cache mock makes safe to run here.
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

async function makeType(slug: string, fields: FieldDef[] = [f("price", "number")]) {
  const { createTableBackedType } = await import("@/modules/content-schema/actions");
  const res = await createTableBackedType({ slug, name: slug, fields });
  if (!res.ok) throw new Error(`setup failed: ${res.error}`);
  return res.data!;
}

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

describe("setTableBackedBasePath", () => {
  it("sets a valid base path", async () => {
    const { setTableBackedBasePath } = await import("./table-type-actions");
    const { id } = await makeType("products");

    const res = await setTableBackedBasePath(id, "/catalog");
    expect(res.ok).toBe(true);
    const row = await testDb.query.customTypes.findFirst();
    expect(row?.basePath).toBe("/catalog");
  });

  it("normalizes to a single leading-slash segment", async () => {
    const { setTableBackedBasePath } = await import("./table-type-actions");
    const { id } = await makeType("products");

    await setTableBackedBasePath(id, "Catalog/extra/");
    const row = await testDb.query.customTypes.findFirst();
    expect(row?.basePath).toBe("/catalog");
  });

  it("rejects a base that collides with a reserved section", async () => {
    const { setTableBackedBasePath } = await import("./table-type-actions");
    const { id } = await makeType("products");

    // "/shop" is a HARD_RESERVED segment in baseCollision.
    const res = await setTableBackedBasePath(id, "/shop");
    expect(res.ok).toBe(false);
    expect(await testDb.query.customTypes.findFirst().then((r) => r?.basePath)).toBeNull();
  });

  it("rejects a base already owned by another content type", async () => {
    const { setTableBackedBasePath } = await import("./table-type-actions");
    const a = await makeType("alpha");
    const b = await makeType("beta");

    expect((await setTableBackedBasePath(a.id, "/store")).ok).toBe(true);
    const clash = await setTableBackedBasePath(b.id, "/store");
    expect(clash.ok).toBe(false);
    expect(clash).toMatchObject({ error: expect.stringContaining("alpha") });
  });

  it("clearing the base also drops the type to draft", async () => {
    const { setTableBackedBasePath, setTableBackedPublished } = await import("./table-type-actions");
    const { id } = await makeType("products");
    await setTableBackedBasePath(id, "/store");
    await setTableBackedPublished(id, true);
    expect(await testDb.query.customTypes.findFirst().then((r) => r?.status)).toBe("published");

    const res = await setTableBackedBasePath(id, "");
    expect(res.ok).toBe(true);
    const row = await testDb.query.customTypes.findFirst();
    expect(row?.basePath).toBeNull();
    expect(row?.status).toBe("draft");
  });
});

describe("setTableBackedPublished", () => {
  it("refuses to publish without a base path", async () => {
    const { setTableBackedPublished } = await import("./table-type-actions");
    const { id } = await makeType("products");

    const res = await setTableBackedPublished(id, true);
    expect(res.ok).toBe(false);
    expect(await testDb.query.customTypes.findFirst().then((r) => r?.status)).toBe("draft");
  });

  it("publishes once a base path is set, and unpublishes", async () => {
    const { setTableBackedBasePath, setTableBackedPublished } = await import("./table-type-actions");
    const { id } = await makeType("products");
    await setTableBackedBasePath(id, "/store");

    expect((await setTableBackedPublished(id, true)).ok).toBe(true);
    expect(await testDb.query.customTypes.findFirst().then((r) => r?.status)).toBe("published");

    expect((await setTableBackedPublished(id, false)).ok).toBe(true);
    expect(await testDb.query.customTypes.findFirst().then((r) => r?.status)).toBe("draft");
  });

  it("refuses on a type that is not table-backed", async () => {
    const { setTableBackedPublished } = await import("./table-type-actions");
    const { customTypes } = await import("@/modules/custom-types/schema");
    // A legacy JSON-backed type has no tableName.
    const [legacy] = await testDb
      .insert(customTypes)
      .values({ slug: "legacy", name: "Legacy", fields: [] })
      .returning();

    const res = await setTableBackedPublished(legacy.id, true);
    expect(res.ok).toBe(false);
    expect(res).toMatchObject({ error: expect.stringContaining("not table-backed") });
  });
});

describe("setTableBackedPresentation", () => {
  it("updates plural name and title/slug pickers when the keys are real columns", async () => {
    const { setTableBackedPresentation } = await import("./table-type-actions");
    const { id } = await makeType("products", [f("name", "text"), f("price", "number")]);

    const res = await setTableBackedPresentation(id, {
      pluralName: "Products",
      titleField: "name",
      slugField: "slug",
    });
    expect(res.ok).toBe(true);
    const row = await testDb.query.customTypes.findFirst();
    expect(row?.pluralName).toBe("Products");
    expect(row?.titleField).toBe("name");
  });

  it("rejects a title field that is not a column on the type", async () => {
    const { setTableBackedPresentation } = await import("./table-type-actions");
    const { id } = await makeType("products", [f("name", "text")]);

    const res = await setTableBackedPresentation(id, { titleField: "does_not_exist" });
    expect(res.ok).toBe(false);
  });
});
