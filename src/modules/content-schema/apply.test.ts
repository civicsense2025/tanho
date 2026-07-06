import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import type { FieldDef } from "@/modules/custom-types/validation";
import { applyContentTypeChange } from "./apply";

const sqlite = new SQLiteSyncDialect();
const f = (key: string, kind: FieldDef["kind"]): FieldDef => ({ key, label: key, kind });
const render = (change: ReturnType<typeof applyContentTypeChange>) =>
  change.statements.map((s) => sqlite.sqlToQuery(s).sql);

describe("applyContentTypeChange", () => {
  it("adds a new field as ADD COLUMN, no data loss", () => {
    const change = applyContentTypeChange("ct_p", [f("title", "text")], [f("title", "text"), f("sku", "text")], "sqlite");
    expect(render(change)).toEqual(['ALTER TABLE "ct_p" ADD COLUMN "sku" text']);
    expect(change.dropsData).toEqual([]);
  });

  it("removes a field as DROP COLUMN and reports data loss", () => {
    const change = applyContentTypeChange("ct_p", [f("title", "text"), f("old", "text")], [f("title", "text")], "sqlite");
    expect(render(change)).toEqual(['ALTER TABLE "ct_p" DROP COLUMN "old"']);
    expect(change.dropsData).toEqual(["old"]);
  });

  it("retypes a field as DROP then ADD (data loss), same column name", () => {
    const change = applyContentTypeChange("ct_p", [f("price", "text")], [f("price", "number")], "sqlite");
    expect(render(change)).toEqual([
      'ALTER TABLE "ct_p" DROP COLUMN "price"',
      'ALTER TABLE "ct_p" ADD COLUMN "price" real',
    ]);
    expect(change.dropsData).toEqual(["price"]);
  });

  it("is a no-op when only label/help change (same kind)", () => {
    const prev = [{ key: "title", label: "Title", kind: "text" } as FieldDef];
    const next = [{ key: "title", label: "Renamed Label", help: "hi", kind: "text" } as FieldDef];
    const change = applyContentTypeChange("ct_p", prev, next, "sqlite");
    expect(change.statements).toEqual([]);
    expect(change.dropsData).toEqual([]);
  });

  it("does not treat number↔currency as a retype (same column type)", () => {
    const change = applyContentTypeChange("ct_p", [f("amt", "number")], [f("amt", "currency")], "sqlite");
    expect(change.statements).toEqual([]);
  });
});
