import { describe, expect, it } from "vitest";
import { buildPostgresSelect, HARD_ROW_CAP } from "./query-builder";

describe("buildPostgresSelect", () => {
  it("builds a parameterized SELECT with no interpolated values", () => {
    const { text, params } = buildPostgresSelect({
      table: "products",
      columns: ["id", "name"],
      limit: 10,
    });
    expect(text).toBe('SELECT "id", "name" FROM "products" LIMIT $1');
    expect(params).toEqual([10]);
  });

  it("treats a filter value containing SQL syntax as an inert bound parameter, never interpolated", () => {
    const injectionAttempt = "x'; DROP TABLE products;--";
    const { text, params } = buildPostgresSelect({
      table: "products",
      columns: ["id"],
      filters: [{ column: "name", op: "eq", value: injectionAttempt }],
      limit: 10,
    });
    // The malicious string must appear ONLY as a bound parameter value, never in the SQL text.
    expect(text).not.toContain("DROP TABLE");
    expect(text).toBe('SELECT "id" FROM "products" WHERE "name" = $1 LIMIT $2');
    expect(params[0]).toBe(injectionAttempt);
  });

  it("clamps limit to the hard row cap regardless of requested value", () => {
    const { params } = buildPostgresSelect({
      table: "products",
      columns: ["id"],
      limit: 999999,
    });
    expect(params[params.length - 1]).toBe(HARD_ROW_CAP);
  });

  it("builds an IN clause with one placeholder per value", () => {
    const { text, params } = buildPostgresSelect({
      table: "products",
      columns: ["id"],
      filters: [{ column: "id", op: "in", value: [1, 2, 3] }],
      limit: 10,
    });
    expect(text).toBe('SELECT "id" FROM "products" WHERE "id" IN ($1, $2, $3) LIMIT $4');
    expect(params).toEqual([1, 2, 3, 10]);
  });

  it("builds a contains clause using ILIKE with wildcards bound as a parameter", () => {
    const { text, params } = buildPostgresSelect({
      table: "products",
      columns: ["id"],
      filters: [{ column: "name", op: "contains", value: "widget" }],
      limit: 10,
    });
    expect(text).toBe('SELECT "id" FROM "products" WHERE "name" ILIKE $1 LIMIT $2');
    expect(params[0]).toBe("%widget%");
  });

  it("quotes identifiers containing an embedded double-quote rather than breaking out of quoting", () => {
    const { text } = buildPostgresSelect({
      table: 'weird"table',
      columns: ["id"],
      limit: 10,
    });
    expect(text).toContain('"weird""table"');
  });

  it("orders by validated columns with direction, defaulting to ASC", () => {
    const { text } = buildPostgresSelect({
      table: "products",
      columns: ["id"],
      sort: [{ column: "price", dir: "desc" }],
      limit: 10,
    });
    expect(text).toBe('SELECT "id" FROM "products" ORDER BY "price" DESC LIMIT $1');
  });
});
