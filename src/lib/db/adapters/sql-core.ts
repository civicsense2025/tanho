import { randomUUID } from "crypto";
import type { ListQuery, Repository } from "../types";

/**
 * Shared SQL engine for the libsql and postgres adapters. The two backends previously
 * reimplemented an identical generic repository (CRUD + list querying for all 10 entities); the
 * only real differences are the parameter-placeholder syntax and the execute call. Those are
 * captured by the SqlDialect below, so the repository logic lives here ONCE. The bespoke
 * join/upsert methods stay in each adapter, because their transaction idioms (batch vs BEGIN)
 * are genuinely dialect-specific and clearer left inline.
 *
 * The 3-backend contract suite is the proof this refactor preserves behavior.
 */

/** The minimal surface the shared repository needs from a SQL backend. */
export interface SqlDialect {
  /** Placeholder for the i-th (1-based) bound parameter: "?" for libsql, "$i" for postgres. */
  placeholder(i: number): string;
  /** Run a query and return the result rows as plain objects. */
  query(text: string, args: unknown[]): Promise<Record<string, unknown>[]>;
}

/** Maps camelCase TS field names to this table's snake_case SQL columns. */
export type ColumnMap<T> = { [K in keyof Omit<T, "id">]: string };

export function sqlRepository<T extends { id: string }>(
  dialect: SqlDialect,
  table: string,
  columns: ColumnMap<T>
): Repository<T> {
  const fields = Object.keys(columns) as (keyof Omit<T, "id">)[];
  const colFor = (f: keyof Omit<T, "id">) => columns[f];
  const ph = (i: number) => dialect.placeholder(i);

  function fromRow(row: Record<string, unknown>): T {
    const out: Record<string, unknown> = { id: row.id };
    for (const f of fields) out[f as string] = row[colFor(f)];
    return out as T;
  }

  return {
    async list(query?: ListQuery<T>) {
      const clauses: string[] = [];
      const args: unknown[] = [];
      let i = 1;
      if (query?.where) {
        for (const [key, value] of Object.entries(query.where)) {
          const col = key === "id" ? "id" : colFor(key as keyof Omit<T, "id">);
          if (value && typeof value === "object" && "in" in (value as object)) {
            const inList = (value as { in: unknown[] }).in;
            clauses.push(`${col} IN (${inList.map(() => ph(i++)).join(",")})`);
            args.push(...inList);
          } else {
            clauses.push(`${col} = ${ph(i++)}`);
            args.push(value);
          }
        }
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const order = query?.orderBy?.length
        ? `ORDER BY ${query.orderBy
            .map((o) => `${o.field === "id" ? "id" : colFor(o.field as keyof Omit<T, "id">)} ${o.direction.toUpperCase()}`)
            .join(", ")}`
        : "";
      const limit = query?.limit ? `LIMIT ${query.limit}` : "";
      const offset = query?.offset ? `OFFSET ${query.offset}` : "";
      const rows = await dialect.query(`SELECT * FROM ${table} ${where} ${order} ${limit} ${offset}`, args);
      return rows.map(fromRow);
    },

    async get(id: string) {
      const rows = await dialect.query(`SELECT * FROM ${table} WHERE id = ${ph(1)}`, [id]);
      return rows[0] ? fromRow(rows[0]) : undefined;
    },

    async create(data) {
      const id = randomUUID();
      const now = new Date().toISOString();
      const insertCols = fields.map(colFor);
      const insertVals = fields.map((f) => {
        if (f === "createdAt" || f === "updatedAt") return now;
        return (data as Record<string, unknown>)[f as string] ?? null;
      });
      const allVals = [id, ...insertVals];
      const placeholders = allVals.map((_, idx) => ph(idx + 1)).join(", ");
      await dialect.query(
        `INSERT INTO ${table} (id, ${insertCols.join(", ")}) VALUES (${placeholders})`,
        allVals
      );
      return (await this.get(id))!;
    },

    async update(id: string, data) {
      const keys = (Object.keys(data) as (keyof Omit<T, "id">)[]).filter((k) => fields.includes(k));
      const setVals = keys.map((k) => (data as Record<string, unknown>)[k as string] ?? null);
      if (fields.includes("updatedAt" as never)) {
        keys.push("updatedAt" as keyof Omit<T, "id">);
        setVals.push(new Date().toISOString());
      }
      const setCols = keys.map((k, idx) => `${colFor(k)} = ${ph(idx + 1)}`);
      await dialect.query(
        `UPDATE ${table} SET ${setCols.join(", ")} WHERE id = ${ph(keys.length + 1)}`,
        [...setVals, id]
      );
      return (await this.get(id))!;
    },

    async delete(id: string) {
      await dialect.query(`DELETE FROM ${table} WHERE id = ${ph(1)}`, [id]);
    },
  };
}
