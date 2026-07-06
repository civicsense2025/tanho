import { z } from "zod";

/** Reserved keys that enable prototype pollution — never allowed as a column/table name. */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const identifierSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a plain identifier (letters, digits, underscore)")
  .refine((k) => !FORBIDDEN_KEYS.has(k), "Reserved name is not allowed");

/** One table an owner has explicitly exposed for querying, and its allowlisted columns. */
export const dataSourceAllowlistEntrySchema = z.object({
  table: identifierSchema,
  columns: z
    .array(identifierSchema)
    .min(1, "Pick at least one column to allow for this table, or remove the table")
    .max(50),
});
export type DataSourceAllowlistEntry = z.infer<typeof dataSourceAllowlistEntrySchema>;

/**
 * Rejects any connection-string-shaped config that disables TLS. This is
 * where "encryption in transit is mandatory" is structurally enforced, not
 * just documented — a config that would connect in the clear never
 * validates, so it can never be saved.
 */
function assertNoDisabledTls(raw: string, ctx: z.RefinementCtx) {
  const lowered = raw.toLowerCase();
  const disablesTls =
    /sslmode\s*=\s*disable/.test(lowered) ||
    /\bssl\s*=\s*false\b/.test(lowered) ||
    (/^mongodb:\/\//.test(lowered) && !/tls\s*=\s*true/.test(lowered) && !/^mongodb\+srv:\/\//.test(lowered));
  if (disablesTls) {
    ctx.addIssue({
      code: "custom",
      message: "TLS/SSL must not be disabled on external database connections",
    });
  }
}

/**
 * Sync shape + TLS validation only — deliberately does NOT include the
 * async host-blocklist check (see `assertHostNotBlocked` in
 * `validation.server.ts`). Used directly by `connection-string.ts`, which
 * runs client-side to pre-fill form fields from a pasted string; a sync
 * schema is required there (Zod throws if an async refine is hit via
 * `.safeParse()`), and a DNS lookup wouldn't be meaningful or trustworthy
 * from the browser anyway. The real enforcement is server-side:
 * `dataSourceConfigSchema` (validation.server.ts) wraps this with the async
 * check, and every server action parses through THAT — kept in a separate
 * server-only file because it imports ssrf-guard.ts's `node:dns/promises`,
 * which can't be bundled into the client chunk this file is also part of.
 */
export const postgresConfigSchema = z.object({
  provider: z.literal("postgres"),
  host: z.string().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535).default(5432),
  database: z.string().min(1).max(63),
  user: z.string().min(1).max(63),
  password: z.string().min(1).max(256),
  /** Free-form extra params (e.g. "sslmode=require") — validated for TLS below. */
  connectionStringExtra: z
    .string()
    .max(512)
    .optional()
    .superRefine((v, ctx) => {
      if (v) assertNoDisabledTls(v, ctx);
    }),
});
export type PostgresConfig = z.infer<typeof postgresConfigSchema>;

export const supabaseConfigSchema = z.object({
  provider: z.literal("supabase"),
  projectRef: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Must be a Supabase project ref"),
  /**
   * The Postgres `postgres` role's OWN database password (Dashboard >
   * Settings > Database) — NOT the service-role API key. The service-role
   * key is a JWT that only authenticates PostgREST/GoTrue HTTP calls; the
   * Postgres wire protocol has no concept of JWTs and authenticates via
   * SCRAM/password tied to a role, so a service-role key here would simply
   * fail to connect.
   */
  databasePassword: z.string().min(1).max(256),
  /** Use the Supavisor pooler (recommended for serverless) instead of a direct connection. */
  usePooler: z.boolean().default(true),
  region: z.string().min(1).max(64).optional(),
  database: z.string().min(1).max(63).default("postgres"),
});
export type SupabaseConfig = z.infer<typeof supabaseConfigSchema>;

/**
 * Discriminated union of the two provider shapes, sync-only (no host
 * blocklist check — see `dataSourceConfigSchema` in `validation.server.ts`
 * for the version every server action actually parses input through). This
 * type is exported for client code (e.g. `CreateConnectionForm.tsx`) that
 * needs to describe the shape without pulling in the server-only DNS check.
 */
export type DataSourceConfig = PostgresConfig | SupabaseConfig;

const filterOpSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]);
type FilterOp = z.infer<typeof filterOpSchema>;

const SCALAR_OPS: ReadonlySet<FilterOp> = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "contains"]);

const filterValueSchema = z.union([
  z.string().max(500),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string().max(500), z.number()])).max(100),
]);

/**
 * Shared fragment every dynamic-bound block's content schema imports —
 * one shape for "this block reads from an external data source."
 */
export const dataSourceBindingSchema = z.object({
  connectionId: z.string().min(1),
  table: identifierSchema,
  columns: z.array(identifierSchema).min(1).max(50),
  filters: z
    .array(
      z
        .object({
          column: identifierSchema,
          op: filterOpSchema,
          value: filterValueSchema,
        })
        .superRefine((f, ctx) => {
          // Scalar ops (eq/neq/gt/gte/lt/lte/contains) build a single SQL
          // placeholder from `value` (query-builder.ts's buildFilterClause);
          // an array there gets bound as-is to the pg driver, which is a
          // confusing failure mode, not a clean error. "in" is the only op
          // that expects (and query-builder.ts explicitly branches for) an
          // array — reject the mismatch here instead.
          const isArray = Array.isArray(f.value);
          if (f.op === "in" && !isArray) {
            ctx.addIssue({ code: "custom", path: ["value"], message: `"in" requires an array value` });
          } else if (SCALAR_OPS.has(f.op) && isArray) {
            ctx.addIssue({ code: "custom", path: ["value"], message: `"${f.op}" requires a scalar value, not an array` });
          }
        }),
    )
    .max(10)
    .optional(),
  sort: z
    .array(z.object({ column: identifierSchema, dir: z.enum(["asc", "desc"]) }))
    .max(5)
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});
export type DataSourceBinding = z.infer<typeof dataSourceBindingSchema>;
