import type { DataSourceFilter, FilterOp, QuerySpec } from "../types";

/** Server-enforced hard cap — applies even if a caller requests more via `spec.limit`. */
export const HARD_ROW_CAP = 500;

const OP_SQL: Record<FilterOp, string> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  in: "IN",
  contains: "ILIKE",
};

/**
 * Double-quotes a Postgres identifier, escaping any embedded quote. Callers
 * MUST have already validated the identifier shape (see
 * modules/data-sources/validation.ts's identifierSchema) — this only
 * prevents a validated-but-quoted-oddly name from breaking out of its
 * quoting, it is not the injection defense by itself.
 */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Translates a `QuerySpec` into a parameterized Postgres statement. Every
 * value is a placeholder (`$1..$n`) bound via the `params` array — never
 * string-concatenated. Table/column names are identifiers, not values, so
 * they are quoted (after upstream allowlist validation), never parameterized.
 */
export function buildPostgresSelect(
  spec: QuerySpec,
): { text: string; params: unknown[] } {
  const params: unknown[] = [];
  const columnsSql = spec.columns.map(quoteIdent).join(", ");
  const tableSql = quoteIdent(spec.table);

  const whereClauses: string[] = [];
  for (const filter of spec.filters ?? []) {
    whereClauses.push(buildFilterClause(filter, params));
  }
  const whereSql = whereClauses.length ? ` WHERE ${whereClauses.join(" AND ")}` : "";

  const orderSql = (spec.sort ?? [])
    .map((s) => `${quoteIdent(s.column)} ${s.dir === "desc" ? "DESC" : "ASC"}`)
    .join(", ");
  const orderClause = orderSql ? ` ORDER BY ${orderSql}` : "";

  const limit = Math.min(Math.max(1, spec.limit), HARD_ROW_CAP);
  // The limit itself is a fixed server-computed number, never client text —
  // still bound as a parameter for consistency rather than interpolated.
  params.push(limit);
  const limitClause = ` LIMIT $${params.length}`;

  const text = `SELECT ${columnsSql} FROM ${tableSql}${whereSql}${orderClause}${limitClause}`;
  return { text, params };
}

function buildFilterClause(filter: DataSourceFilter, params: unknown[]): string {
  const column = quoteIdent(filter.column);
  const op = OP_SQL[filter.op];

  if (filter.op === "in") {
    const values = Array.isArray(filter.value) ? filter.value : [filter.value];
    const placeholders = values.map((v) => {
      params.push(v);
      return `$${params.length}`;
    });
    return `${column} ${op} (${placeholders.join(", ")})`;
  }

  if (filter.op === "contains") {
    params.push(`%${String(filter.value)}%`);
    return `${column} ${op} $${params.length}`;
  }

  params.push(filter.value);
  return `${column} ${op} $${params.length}`;
}
