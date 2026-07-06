import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { FieldDef } from "@/modules/custom-types/validation";
import {
  addColumnStatement,
  columnType,
  createTableStatements,
  dropColumnStatement,
  dropTableStatement,
  renameColumnStatement,
} from "./ddl";
import { assertIdentifier, tableNameForSlug } from "./identifiers";

const sqlite = new SQLiteSyncDialect();
const pg = new PgDialect();

function text(stmt: SQL, dialect: "sqlite" | "postgres"): string {
  return (dialect === "postgres" ? pg : sqlite).sqlToQuery(stmt).sql;
}

const field = (over: Partial<FieldDef> & { key: string; kind: FieldDef["kind"] }): FieldDef => ({
  label: over.key,
  ...over,
});

describe("content-schema identifiers", () => {
  it("maps a kebab slug to an underscored ct_ table name", () => {
    expect(tableNameForSlug("my-type")).toBe("ct_my_type");
    expect(tableNameForSlug("products")).toBe("ct_products");
  });

  it("rejects unsafe identifiers", () => {
    expect(() => assertIdentifier("drop table")).toThrow();
    expect(() => assertIdentifier('x"; drop table y;--')).toThrow();
    expect(() => assertIdentifier("__proto__")).toThrow();
    expect(() => assertIdentifier("")).toThrow();
    expect(() => assertIdentifier("a".repeat(64))).toThrow();
    expect(assertIdentifier("valid_name1")).toBe("valid_name1");
  });
});

describe("columnType mapping", () => {
  it("numbers/currency → real (sqlite) / double precision (pg)", () => {
    expect(columnType(field({ key: "p", kind: "number" }), "sqlite")).toBe("real");
    expect(columnType(field({ key: "p", kind: "currency" }), "postgres")).toBe("double precision");
  });
  it("boolean → integer (sqlite) / boolean (pg)", () => {
    expect(columnType(field({ key: "b", kind: "boolean" }), "sqlite")).toBe("integer");
    expect(columnType(field({ key: "b", kind: "boolean" }), "postgres")).toBe("boolean");
  });
  it("json/tags/repeater/multi-reference → text (sqlite) / jsonb (pg)", () => {
    for (const kind of ["json", "tags", "repeater"] as const) {
      expect(columnType(field({ key: "j", kind }), "sqlite")).toBe("text");
      expect(columnType(field({ key: "j", kind }), "postgres")).toBe("jsonb");
    }
    const multiRef = field({ key: "r", kind: "reference", multi: true });
    expect(columnType(multiRef, "postgres")).toBe("jsonb");
    const singleRef = field({ key: "r", kind: "reference" });
    expect(columnType(singleRef, "postgres")).toBe("text");
  });
  it("text-family kinds → text", () => {
    for (const kind of ["text", "richtext", "date", "url", "email", "color", "image"] as const) {
      expect(columnType(field({ key: "t", kind }), "sqlite")).toBe("text");
    }
  });
});

describe("createTableStatements", () => {
  it("emits a spine + one column per field + unique slug index (sqlite)", () => {
    const stmts = createTableStatements(
      "ct_products",
      [field({ key: "price", kind: "number" }), field({ key: "body", kind: "richtext" })],
      "sqlite",
    );
    const create = text(stmts[0]!, "sqlite");
    expect(create).toContain('CREATE TABLE "ct_products"');
    expect(create).toContain('"id" text PRIMARY KEY NOT NULL');
    expect(create).toContain('"slug" text NOT NULL');
    expect(create).toContain('"price" real');
    expect(create).toContain('"body" text');
    // Uniqueness is on `path` (nesting: same slug allowed under different
    // parents); slug gets a plain index for by-slug lookups.
    expect(text(stmts[1]!, "sqlite")).toContain('CREATE UNIQUE INDEX "ct_products_path_unique"');
    expect(text(stmts[1]!, "sqlite")).toContain('("path")');
    expect(text(stmts[2]!, "sqlite")).toContain('CREATE INDEX "ct_products_slug_idx"');
    // No RLS on SQLite.
    expect(stmts).toHaveLength(3);
  });

  it("appends RLS enable/force + policy on postgres", () => {
    const stmts = createTableStatements("ct_products", [field({ key: "price", kind: "number" })], "postgres");
    const rendered = stmts.map((s) => text(s, "postgres"));
    expect(rendered.some((s) => s.includes('"price" double precision'))).toBe(true);
    expect(rendered.some((s) => s.includes("ENABLE ROW LEVEL SECURITY"))).toBe(true);
    expect(rendered.some((s) => s.includes("FORCE ROW LEVEL SECURITY"))).toBe(true);
    expect(rendered.some((s) => s.includes('CREATE POLICY "ct_products_app_only"') && s.includes("oys_app"))).toBe(
      true,
    );
  });

  it("refuses to build DDL for an unsafe field key", () => {
    expect(() =>
      createTableStatements("ct_x", [field({ key: "ok", kind: "text" }), { key: "bad key", label: "x", kind: "text" }], "sqlite"),
    ).toThrow();
  });
});

describe("alter/drop statements", () => {
  it("ADD COLUMN", () => {
    expect(text(addColumnStatement("ct_products", field({ key: "sku", kind: "text" }), "sqlite"), "sqlite")).toBe(
      'ALTER TABLE "ct_products" ADD COLUMN "sku" text',
    );
  });
  it("DROP COLUMN", () => {
    expect(text(dropColumnStatement("ct_products", "sku"), "sqlite")).toBe(
      'ALTER TABLE "ct_products" DROP COLUMN "sku"',
    );
  });
  it("RENAME COLUMN", () => {
    expect(text(renameColumnStatement("ct_products", "a", "b"), "sqlite")).toBe(
      'ALTER TABLE "ct_products" RENAME COLUMN "a" TO "b"',
    );
  });
  it("DROP TABLE", () => {
    expect(text(dropTableStatement("ct_products"), "sqlite")).toBe('DROP TABLE "ct_products"');
  });
});
