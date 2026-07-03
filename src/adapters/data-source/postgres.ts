import { Pool } from "pg";
import type { PostgresConfig } from "@/modules/data-sources/validation";
import type {
  ColumnDesc,
  DataSourceAdapter,
  DataSourceQueryResult,
  QuerySpec,
  TableDesc,
} from "../types";
import { buildPostgresSelect, HARD_ROW_CAP } from "./query-builder";

/** Per-query timeout — a slow/hanging external DB must never hang a page render. */
const QUERY_TIMEOUT_MS = 5000;
const CONNECT_TIMEOUT_MS = 5000;

const PG_TYPE_MAP: Record<string, ColumnDesc["type"]> = {
  integer: "number",
  bigint: "number",
  smallint: "number",
  numeric: "number",
  real: "number",
  "double precision": "number",
  boolean: "boolean",
  date: "date",
  "timestamp without time zone": "date",
  "timestamp with time zone": "date",
  json: "json",
  jsonb: "json",
};

function toColumnType(pgType: string): ColumnDesc["type"] {
  return PG_TYPE_MAP[pgType] ?? "string";
}

/** Builds a `Pool` from a validated PostgresConfig, requiring TLS unless explicitly local dev. */
function buildPool(config: PostgresConfig): Pool {
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    statement_timeout: QUERY_TIMEOUT_MS,
    max: 3,
  });
}

/**
 * Circuit breaker: after enough consecutive failures for a given pool, stop
 * attempting new connections for a cool-down period rather than retrying
 * into a dead/slow external DB on every page render.
 */
const FAILURE_TRIP_THRESHOLD = 5;
const COOL_DOWN_MS = 60_000;
const breakerState = new Map<string, { failures: number; openUntil: number }>();

function breakerKey(config: PostgresConfig): string {
  return `${config.host}:${config.port}/${config.database}`;
}

function isBreakerOpen(key: string): boolean {
  const state = breakerState.get(key);
  return !!state && state.openUntil > Date.now();
}

function recordFailure(key: string): void {
  const state = breakerState.get(key) ?? { failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= FAILURE_TRIP_THRESHOLD) {
    state.openUntil = Date.now() + COOL_DOWN_MS;
    state.failures = 0;
  }
  breakerState.set(key, state);
}

function recordSuccess(key: string): void {
  breakerState.delete(key);
}

export class PostgresDataSourceAdapter implements DataSourceAdapter {
  private pool: Pool;
  private breaker: string;

  constructor(config: PostgresConfig) {
    this.pool = buildPool(config);
    this.breaker = breakerKey(config);
  }

  isConfigured(): boolean {
    return true;
  }

  capabilities(): { read: boolean; write: boolean } {
    return { read: true, write: false };
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (isBreakerOpen(this.breaker)) {
      return { ok: false, error: "temporarily unavailable" };
    }
    try {
      const client = await this.pool.connect();
      try {
        await client.query("SELECT 1");
        recordSuccess(this.breaker);
        return { ok: true };
      } finally {
        client.release();
      }
    } catch {
      recordFailure(this.breaker);
      return { ok: false, error: "connection failed" };
    }
  }

  async listTables(): Promise<TableDesc[]> {
    if (isBreakerOpen(this.breaker)) return [];
    const client = await this.pool.connect();
    try {
      const tablesResult = await client.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         ORDER BY table_name LIMIT 200`,
      );
      const columnsResult = await client.query(
        `SELECT table_name, column_name, data_type FROM information_schema.columns
         WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`,
      );
      const columnsByTable = new Map<string, ColumnDesc[]>();
      for (const row of columnsResult.rows as { table_name: string; column_name: string; data_type: string }[]) {
        const list = columnsByTable.get(row.table_name) ?? [];
        list.push({ name: row.column_name, type: toColumnType(row.data_type) });
        columnsByTable.set(row.table_name, list);
      }
      recordSuccess(this.breaker);
      return (tablesResult.rows as { table_name: string }[]).map((row) => ({
        name: row.table_name,
        columns: columnsByTable.get(row.table_name) ?? [],
      }));
    } catch {
      recordFailure(this.breaker);
      return [];
    } finally {
      client.release();
    }
  }

  async query(spec: QuerySpec): Promise<DataSourceQueryResult> {
    if (isBreakerOpen(this.breaker)) {
      throw new Error("data source temporarily unavailable");
    }
    const requestedLimit = spec.limit;
    const clamped: QuerySpec = { ...spec, limit: Math.min(requestedLimit, HARD_ROW_CAP) };
    const { text, params } = buildPostgresSelect(clamped);

    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      recordSuccess(this.breaker);
      return {
        rows: result.rows as Record<string, unknown>[],
        truncated: result.rows.length >= clamped.limit,
      };
    } catch {
      recordFailure(this.breaker);
      throw new Error("query failed");
    } finally {
      client.release();
    }
  }
}
