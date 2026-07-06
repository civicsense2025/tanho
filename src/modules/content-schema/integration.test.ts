import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createId } from "@paralleldrive/cuid2";
import type { FieldDef } from "@/modules/custom-types/validation";

/**
 * Integration test for the content-schema engine against a REAL, disposable
 * database — the actual `db` singleton, driving actual DDL + CRUD + reflection.
 *
 * The default run uses a throwaway file-backed libSQL database (created in a
 * temp dir, deleted after): DATABASE_URL is pointed at it BEFORE any module
 * that reads it is imported, then everything is imported dynamically — the same
 * ordering src/adapters/search/postgres-tsvector.test.ts uses. A Postgres
 * parity run is TODO-gated on POSTGRES_TEST_DATABASE_URL (skipped otherwise),
 * mirroring that suite.
 */

const dir = mkdtempSync(join(tmpdir(), "ct-int-"));
const dbUrl = `file:${join(dir, "ct.db")}`;

const f = (key: string, kind: FieldDef["kind"]): FieldDef => ({ key, label: key, kind });

describe("content-schema engine (disposable libSQL)", () => {
  let ddl: typeof import("./ddl");
  let crud: typeof import("./crud");
  let introspect: typeof import("./introspect");
  let db: typeof import("@/lib/db/client").db;

  beforeAll(async () => {
    process.env.DATABASE_URL = dbUrl;
    ddl = await import("./ddl");
    crud = await import("./crud");
    introspect = await import("./introspect");
    ({ db } = await import("@/lib/db/client"));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates a real table with a spine + typed columns", async () => {
    const table = ddl.tableNameForSlug("products");
    for (const stmt of ddl.createTableStatements(
      table,
      [f("price", "number"), f("description", "text"), f("internal_note", "text")],
      "sqlite",
    )) {
      await db.run(stmt);
    }
    expect(await introspect.tableExists(table)).toBe(true);
    const cols = await introspect.tableColumns(table);
    expect(cols).toEqual(
      expect.arrayContaining(["id", "slug", "title", "status", "sort_order", "price", "description", "internal_note"]),
    );
  });

  it("inserts, reads by slug, lists, and deletes rows", async () => {
    const table = ddl.tableNameForSlug("products");
    const now = 1_700_000_000_000;
    const id = createId();
    await crud.insertRow(table, {
      id,
      slug: "widget",
      title: "Widget",
      status: "published",
      sort_order: 0,
      created_at: now,
      updated_at: now,
      price: 9.99,
      description: "A fine widget",
      internal_note: "secret",
    });

    const row = await crud.getRowBySlug(table, "widget");
    expect(row).toMatchObject({ slug: "widget", title: "Widget", price: 9.99 });

    const list = await crud.listRows(table, { onlyPublished: true });
    expect(list).toHaveLength(1);

    await crud.deleteRow(table, id);
    expect(await crud.getRowBySlug(table, "widget")).toBeNull();
  });

  it("alters the table: add, then a row survives the add", async () => {
    const table = ddl.tableNameForSlug("products");
    const now = 1_700_000_000_000;
    const id = createId();
    await crud.insertRow(table, {
      id,
      slug: "gadget",
      title: "Gadget",
      status: "published",
      sort_order: 1,
      created_at: now,
      updated_at: now,
      price: 5,
    });
    // Add a new field column.
    const { applyContentTypeChange } = await import("./apply");
    const change = applyContentTypeChange(
      table,
      [f("price", "number"), f("description", "text"), f("internal_note", "text")],
      [f("price", "number"), f("description", "text"), f("internal_note", "text"), f("sku", "text")],
      "sqlite",
    );
    for (const stmt of change.statements) await db.run(stmt);
    expect(await introspect.tableColumns(table)).toContain("sku");
    // Existing row still present after the ALTER; new column reads null.
    const row = await crud.getRowBySlug(table, "gadget");
    expect(row).toMatchObject({ slug: "gadget", title: "Gadget" });
    expect(row?.sku ?? null).toBeNull();
  });

  it("drops the table", async () => {
    const table = ddl.tableNameForSlug("products");
    await db.run(ddl.dropTableStatement(table));
    expect(await introspect.tableExists(table)).toBe(false);
  });
});
