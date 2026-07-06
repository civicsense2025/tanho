import { Pool } from "pg";
import type { PostgresConfig } from "@/modules/data-sources/validation";
import { isLoopbackOrLinkLocalIp, isPrivateRangeIp } from "@/lib/ssrf-guard";
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

/**
 * `connectionStringExtra` is validated (assertNoDisabledTls, ./validation.ts)
 * to never disable TLS, but is otherwise free-form — parse only the small
 * set of params `pg` itself understands and are safe to pass through.
 * `sslmode` is intentionally NOT forwarded: TLS is already enforced below
 * via `ssl: { rejectUnauthorized: true }`, which is stricter than any
 * `sslmode` value could relax it to (the validation only proves the value
 * doesn't say "disable"; it doesn't prove it says "require" with full
 * verification, so we always use the platform's own strict setting instead
 * of trusting the pasted string's exact semantics).
 */
function extraPoolParams(connectionStringExtra: string | undefined): Partial<Pool["options"]> {
  if (!connectionStringExtra) return {};
  const params = new URLSearchParams(connectionStringExtra);
  const extra: Partial<Pool["options"]> = {};
  const applicationName = params.get("application_name") || params.get("options");
  if (applicationName) extra.application_name = applicationName.slice(0, 128);
  return extra;
}

/**
 * True only outside production, for a literal loopback/link-local or
 * RFC1918-private host — i.e. exactly the docker-compose/local-Supabase
 * shape this repo's own dev workflow uses. Checked against the literal host
 * string (no DNS lookup here — this runs on every pool construction, not
 * just the one-shot test path), so a hostname that merely resolves to a
 * private IP still gets full TLS; only an actual loopback/private literal
 * qualifies. NODE_ENV-gated, not an opt-in flag a deployment could leave
 * set: a production build never takes this branch.
 */
function isLocalDevHost(host: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (host === "localhost") return true;
  return isLoopbackOrLinkLocalIp(host) || isPrivateRangeIp(host);
}

/**
 * Builds a `Pool` from a validated PostgresConfig. TLS with full cert
 * verification is required for any real external host; for a local-dev host
 * (see `isLocalDevHost`) TLS is left undefined so `pg` negotiates whatever
 * the server offers — most local docker Postgres containers speak no TLS at
 * all, which would otherwise make this feature untestable against them.
 */
function buildPool(config: PostgresConfig): Pool {
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: isLocalDevHost(config.host) ? undefined : { rejectUnauthorized: true },
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    statement_timeout: QUERY_TIMEOUT_MS,
    max: 3,
    ...extraPoolParams(config.connectionStringExtra),
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

/**
 * Includes `user`, not just host/port/database — a pooled Supabase
 * connection puts every project behind the SAME regional pooler host/port
 * with the SAME default database name ("postgres"); the project's actual
 * identity is only in `user` ("postgres.<projectRef>"). Without it, one
 * failing project would trip the circuit breaker for every other project
 * sharing that pooler.
 */
function breakerKey(config: PostgresConfig): string {
  return `${config.user}@${config.host}:${config.port}/${config.database}`;
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
