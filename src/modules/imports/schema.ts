import { createId } from "@paralleldrive/cuid2";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { ImportPlan } from "./plan";

/** The phases a job walks through, in strict order. `stepImportJob` advances one at a time. */
export type ImportJobStatus =
  | "pending"
  | "discovering"
  | "creating_types"
  | "importing_rows"
  | "redirects"
  | "completed"
  | "failed";

/**
 * How planned content types are reconciled against the DB:
 *  - `map_existing`   — do NOT create types; map onto EXISTING types by slug (error if missing).
 *  - `propose_confirm`— create types from the plan, but only after `confirmImportJob` sets `confirmed`.
 *  - `auto`           — create everything and run straight through.
 */
export type ImportControlMode = "map_existing" | "propose_confirm" | "auto";

/** One content type this job created, recorded so a resume can skip re-creating it. */
export type CreatedTypeRef = { slug: string; typeId: string; tableName: string };

/**
 * A resumable large-import job (10k–100k rows). ONE row is the durable
 * checkpoint for a whole ingest: the discovered `plan` (types + rows), the
 * `controlMode`, and a progress cursor (`typesCreated`/`rowCursor`/`rowsDone`/
 * `redirectsDone`). `stepImportJob` advances a single bounded chunk of work and
 * saves the cursor; a crash/restart re-reads this row and continues from the
 * last committed offset — no single long HTTP request is required.
 *
 * `plan` holds the FULL normalized plan (types + rows) as JSON. That is the
 * simplest correct choice for the target range: even 100k lean rows fit a JSON
 * column, and keeping the payload in the job row means a resume needs nothing
 * but the row (no scratch-file coordination). A caller with rows an order of
 * magnitude larger than that should instead stream rows from a source file and
 * keep only a manifest here — but that is out of scope for this phase.
 *
 * `sourceBatch` equals the job id, so every redirect this job writes shares that
 * batch tag and the whole migration's redirects can roll back as a unit
 * (redirects/actions.ts rollbackRedirectBatch).
 */
export const importJobs = sqliteTable(
  "import_jobs",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    /** Provenance label, e.g. "generic" | "wordpress-xl". */
    source: text("source").notNull().default("generic"),
    status: text("status").$type<ImportJobStatus>().notNull().default("pending"),
    controlMode: text("control_mode").$type<ImportControlMode>().notNull().default("auto"),
    /** `propose_confirm` gate: type creation waits until this flips true. */
    confirmed: integer("confirmed", { mode: "boolean" }).notNull().default(false),

    /** The discovered plan: ordered content types (with fields) + the row set. */
    plan: text("plan", { mode: "json" }).$type<ImportPlan>().notNull(),

    /** Checkpoint — types already created (rebuildable from the DB on resume). */
    typesCreated: text("types_created", { mode: "json" })
      .$type<CreatedTypeRef[]>()
      .notNull()
      .default([]),
    /** Total rows the plan will import (set at creation). */
    rowsTotal: integer("rows_total").notNull().default(0),
    /** Rows successfully imported so far. */
    rowsDone: integer("rows_done").notNull().default(0),
    /** Offset into the parents-first row order; the resume point. */
    rowCursor: integer("row_cursor").notNull().default(0),
    /** Redirects written so far. */
    redirectsDone: integer("redirects_done").notNull().default(0),

    /** Non-fatal per-row/parse problems (ParseIssue-like), collected across ticks. */
    errors: text("errors", { mode: "json" })
      .$type<Array<{ kind: string; detail: string }>>()
      .notNull()
      .default([]),
    /** Shared redirect batch tag = the job id (set on create); rollback key. */
    sourceBatch: text("source_batch"),

    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(() => Date.now()),
    startedAt: integer("started_at"),
    completedAt: integer("completed_at"),
  },
  (t) => [index("import_jobs_status_idx").on(t.status)],
);

export type ImportJobRow = typeof importJobs.$inferSelect;
