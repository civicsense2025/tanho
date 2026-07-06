// NOTE: intentionally NOT `import "server-only"` — this module is designed to be
// driven by the plain Node CLI (scripts/run-import.ts) OUTSIDE any Next request,
// which is the whole point of the resumable design. `server-only` can't resolve
// in a bare `tsx` process and would defeat that entry point. It stays server-side
// by what it imports (the DB client), not by a marker.
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { slugify } from "@/lib/slug";
import { customTypes, type CustomTypeRow } from "@/modules/custom-types/schema";
import { fieldListSchema } from "@/modules/custom-types/validation";
import { currentDialect } from "@/modules/content-schema/dialect";
import { createTableStatements, tableNameForSlug } from "@/modules/content-schema/ddl";
import { tableExists } from "@/modules/content-schema/introspect";
import { getRowByPath, getRowBySlug, insertRow, type ContentRow } from "@/modules/content-schema/crud";
import { rowValuesFromInput } from "@/modules/content-schema/coerce";
import { computeRowPath } from "@/modules/content-schema/paths";
import { stepRedirects } from "./runner-redirects";
import type { StepResult } from "./runner-types";
export type { StepResult } from "./runner-types";
import {
  orderRowsParentsFirst,
  topoSortTypes,
  type ImportPlan,
  type PlannedRow,
  type PlannedType,
} from "./plan";
import {
  importJobs,
  type CreatedTypeRef,
  type ImportControlMode,
  type ImportJobRow,
} from "./schema";

/**
 * The RESUMABLE import worker. A large content set (10k–100k rows) is ingested
 * in strict dependency order — create types, then build the row tree
 * parents-first, then write old→new redirects — one bounded chunk per
 * `stepImportJob` tick, checkpointing progress into the `import_jobs` row so a
 * crash/restart resumes from the last committed offset. No single long HTTP
 * request is required: a route can drive one tick per call, or the CLI
 * (scripts/run-import.ts) loops ticks to completion.
 *
 * WHY THIS IS A PLAIN MODULE (not a `"use server"` action): it must run from a
 * background script with NO request scope. The content-schema/redirects
 * `"use server"` wrappers call `requireUser()` (→ `cookies()`) and `updateTag()`,
 * both of which throw outside a Server Action. So the runner drives the SAME
 * low-level primitives those wrappers wrap — the DDL statement builder + the
 * `ct_*` row CRUD + a direct redirects insert — exactly as commit-pages.ts is a
 * plain module the importer actions delegate to. It is a system/background
 * writer (like seed/ and scripts/), not a user request, so it legitimately
 * writes past the per-request auth gate.
 *
 * Resumability comes from IDEMPOTENCY, not a wrapping transaction: types are
 * created one-per-tick (raw `CREATE TABLE` can't share a Drizzle tx anyway) and
 * rows are skip-if-slug-exists, and each phase's checkpoint (typesCreated /
 * rowCursor+rowsDone / redirectsDone) is advanced only AFTER that chunk's writes
 * succeed. A crash mid-chunk leaves the cursor un-advanced, so the resume
 * re-runs the chunk and the already-written types/rows are skipped, never
 * duplicated. Progress writes never throw (mirroring analytics/track.ts
 * recordEvent).
 */

const DEFAULT_ROW_BATCH = 500;

/**
 * Insert a new import job (status "pending", plan stored, rowsTotal set).
 * `sourceBatch` is seeded to the job id so every redirect this job later writes
 * shares that batch tag (roll back as a unit). Returns the job id.
 */
export async function createImportJob(
  plan: ImportPlan,
  controlMode: ImportControlMode = "auto",
  opts: { source?: string } = {},
): Promise<{ jobId: string }> {
  const id = createId();
  const now = Date.now();
  await db.insert(importJobs).values({
    id,
    source: opts.source ?? "generic",
    status: "pending",
    controlMode,
    // `auto` and `map_existing` need no human gate; `propose_confirm` starts unconfirmed.
    confirmed: controlMode !== "propose_confirm",
    plan,
    rowsTotal: plan.rows.length,
    sourceBatch: id,
    createdAt: now,
    updatedAt: now,
  });
  return { jobId: id };
}

/**
 * `propose_confirm` gate: flip a job's `confirmed` flag so `stepImportJob` may
 * proceed to create types. No-op (still ok) for other control modes.
 */
export async function confirmImportJob(jobId: string): Promise<{ ok: boolean }> {
  await db.update(importJobs).set({ confirmed: true, updatedAt: Date.now() }).where(eq(importJobs.id, jobId));
  return { ok: true };
}

/** Best-effort checkpoint write — never throws into the tick (mirrors recordEvent). */
async function saveProgress(jobId: string, patch: Partial<ImportJobRow>): Promise<void> {
  try {
    await db
      .update(importJobs)
      .set({ ...patch, updatedAt: Date.now() })
      .where(eq(importJobs.id, jobId));
  } catch (err) {
    console.error("[imports] saveProgress failed", err);
  }
}

/**
 * Advance ONE bounded chunk of a job and checkpoint. Idempotent and resumable:
 * re-calling after a crash re-reads the row and continues; already-created
 * types/rows are detected and skipped. Returns the post-tick status + counts.
 * A thrown fatal is caught and recorded as status "failed" (never leaves a
 * half-written checkpoint — the checkpoint only advances after a chunk's writes
 * succeed).
 */
export async function stepImportJob(jobId: string, opts: { batchSize?: number } = {}): Promise<StepResult> {
  const job = await db.query.importJobs.findFirst({ where: eq(importJobs.id, jobId) });
  if (!job) {
    return { done: true, status: "failed", rowsDone: 0, rowsTotal: 0 };
  }
  if (job.status === "completed" || job.status === "failed") {
    return { done: true, status: job.status, rowsDone: job.rowsDone, rowsTotal: job.rowsTotal };
  }

  try {
    // First touch: stamp startedAt and move out of "pending".
    if (job.status === "pending" || job.status === "discovering") {
      await saveProgress(jobId, {
        status: "creating_types",
        startedAt: job.startedAt ?? Date.now(),
      });
      return step(job, { ...job, status: "creating_types" }, opts);
    }
    return step(job, job, opts);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await saveProgress(jobId, {
      status: "failed",
      errors: [...job.errors, { kind: "fatal", detail }],
    });
    return { done: true, status: "failed", rowsDone: job.rowsDone, rowsTotal: job.rowsTotal };
  }
}

/** Dispatch one chunk for the CURRENT status. `job` is the freshly-loaded row. */
async function step(
  original: ImportJobRow,
  job: ImportJobRow,
  opts: { batchSize?: number },
): Promise<StepResult> {
  switch (job.status) {
    case "creating_types":
      return stepCreateTypes(job);
    case "importing_rows":
      return stepImportRows(job, opts.batchSize ?? DEFAULT_ROW_BATCH);
    case "redirects":
      return stepRedirects(job, saveProgress);
    default:
      // "pending"/"discovering" were promoted before dispatch; anything else is terminal.
      return { done: true, status: job.status, rowsDone: job.rowsDone, rowsTotal: job.rowsTotal };
  }
}

/* --------------------------------------------------------- phase: types DDL */

/**
 * Create the NEXT not-yet-created type (one per tick). Ordered by
 * topoSortTypes so a referenced type exists before its dependents. On the
 * `map_existing` control mode, no DDL runs — planned types are resolved onto
 * EXISTING types by slug (missing → recorded + the job fails cleanly). On
 * `propose_confirm`, waits until `confirmed`. When all types are created/mapped,
 * transitions to importing_rows.
 */
async function stepCreateTypes(job: ImportJobRow): Promise<StepResult> {
  if (job.controlMode === "propose_confirm" && !job.confirmed) {
    // Not confirmed yet — hold at creating_types without doing work.
    return { done: false, status: "creating_types", rowsDone: job.rowsDone, rowsTotal: job.rowsTotal };
  }

  const ordered = topoSortTypes(job.plan.types);
  const created = new Map(job.typesCreated.map((t) => [t.slug, t]));

  // Find the first planned type we haven't recorded yet.
  const next = ordered.find((t) => !created.has(t.slug));
  if (!next) {
    // All types handled → advance to rows.
    await saveProgress(job.id, { status: "importing_rows" });
    return { done: false, status: "importing_rows", rowsDone: job.rowsDone, rowsTotal: job.rowsTotal };
  }

  const ref = await ensureType(job, next);
  if ("error" in ref) {
    await saveProgress(job.id, {
      status: "failed",
      errors: [...job.errors, { kind: "type-create-failed", detail: `${next.slug}: ${ref.error}` }],
    });
    return { done: true, status: "failed", rowsDone: job.rowsDone, rowsTotal: job.rowsTotal };
  }

  const typesCreated: CreatedTypeRef[] = [...job.typesCreated, ref.value];
  await saveProgress(job.id, { typesCreated });
  // Not done yet — the next tick creates the next type (or advances to rows).
  return { done: false, status: "creating_types", rowsDone: job.rowsDone, rowsTotal: job.rowsTotal };
}

type Ensured = { value: CreatedTypeRef } | { error: string };

/**
 * Create (or, in map_existing mode, resolve) a single content type and return
 * its {slug,typeId,tableName}. Idempotent: an already-existing type/table (from
 * a prior crashed run) is adopted rather than re-created — so a resume that
 * re-attempts the same type is a no-op, not a hard "already exists" failure.
 */
async function ensureType(job: ImportJobRow, planned: PlannedType): Promise<Ensured> {
  // Already in the DB by slug? Adopt it (resume-safe + map_existing path).
  const existing = await db.query.customTypes.findFirst({ where: eq(customTypes.slug, planned.slug) });
  if (existing) {
    if (!existing.tableName) return { error: `existing type "${planned.slug}" is not table-backed` };
    return { value: { slug: planned.slug, typeId: existing.id, tableName: existing.tableName } };
  }
  if (job.controlMode === "map_existing") {
    return { error: `no existing content type with slug "${planned.slug}" to map onto` };
  }

  const parsed = fieldListSchema.safeParse(planned.fields);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid fields" };
  }

  const tableName = tableNameForSlug(planned.slug);
  // 1) DDL first (raw CREATE TABLE — can't be transactional). If the table
  //    already exists from a half-finished prior run, skip the create and just
  //    (re)write the metadata row below.
  if (!(await tableExists(tableName))) {
    for (const stmt of createTableStatements(tableName, parsed.data, currentDialect())) {
      await db.run(stmt);
    }
  }

  // 2) Metadata row (source of truth) — set the routing knobs the row phase needs.
  const now = Date.now();
  const [row] = await db
    .insert(customTypes)
    .values({
      slug: planned.slug,
      name: planned.name,
      pluralName: planned.pluralName ?? planned.name,
      fields: parsed.data,
      tableName,
      basePath: `/${planned.slug}`,
      titleField: planned.titleField ?? "title",
      slugField: planned.slugField ?? "slug",
      permalinkPattern: planned.permalinkPattern ?? (planned.isHierarchical ? "{base}/{parent_path}/{slug}" : "{base}/{slug}"),
      isHierarchical: planned.isHierarchical,
      status: "published",
      updatedAt: now,
    })
    .returning();

  return { value: { slug: planned.slug, typeId: row!.id, tableName } };
}

/* ---------------------------------------------------------- phase: row tree */

/**
 * Insert the next `batchSize` rows in parents-first order, starting at
 * `rowCursor`. Each row is isolated in its own try/catch (one bad row never
 * aborts the batch — mirrors commit-pages.ts). Parent ids are resolved from the
 * parent's ALREADY-inserted row (looked up by slug/path within the parent's
 * table), so a nested child's materialized `path` is computed correctly even
 * across a resume (the map is rebuilt from the DB, not held in memory). The
 * cursor + rowsDone advance and are checkpointed after the batch commits.
 */
async function stepImportRows(job: ImportJobRow, batchSize: number): Promise<StepResult> {
  const typeBySlug = new Map(job.typesCreated.map((t) => [t.slug, t]));
  const ordered = orderRowsParentsFirst(job.plan.rows);
  const start = job.rowCursor;
  const slice = ordered.slice(start, start + batchSize);

  if (slice.length === 0) {
    await saveProgress(job.id, { status: "redirects" });
    return { done: false, status: "redirects", rowsDone: job.rowsDone, rowsTotal: job.rowsTotal };
  }

  const typeRowCache = new Map<string, CustomTypeRow>();
  const loadType = async (typeId: string): Promise<CustomTypeRow | null> => {
    if (typeRowCache.has(typeId)) return typeRowCache.get(typeId)!;
    const t = await db.query.customTypes.findFirst({ where: eq(customTypes.id, typeId) });
    if (t) typeRowCache.set(typeId, t);
    return t ?? null;
  };

  const errors: Array<{ kind: string; detail: string }> = [];

  // No wrapping transaction here — the `ct_*` row CRUD writes through the shared
  // `db` singleton, so an outer tx would just lock the file against its own
  // reads (SQLITE_BUSY). Resumability comes from IDEMPOTENCY instead: each row
  // is skip-if-slug-exists, and the cursor advances only AFTER this whole batch
  // loop finishes. A crash mid-batch leaves the cursor un-advanced, so the
  // resume re-runs the batch and the already-inserted rows are skipped, never
  // duplicated (the same "one bad row never aborts the batch" model as
  // commit-pages.ts / commitGhostImport).
  for (const planned of slice) {
    const ref = typeBySlug.get(planned.typeSlug);
    if (!ref) {
      errors.push({ kind: "row-type-missing", detail: `${planned.typeSlug}/${planned.slug}: type not created` });
      continue;
    }
    try {
      const inserted = await insertPlannedRow(ref, planned, loadType);
      if (!inserted.ok) {
        errors.push({ kind: "row-skip", detail: `${planned.typeSlug}/${planned.slug}: ${inserted.error}` });
      }
    } catch (err) {
      errors.push({
        kind: "row-error",
        detail: `${planned.typeSlug}/${planned.slug}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const nextCursor = start + slice.length; // advance past everything attempted
  const nextErrors = [...job.errors, ...errors];
  // rowsDone is DERIVED from the cursor, not accumulated: every row up to the
  // cursor that didn't record an error. Deriving (rather than `+= done`) keeps it
  // correct on a mid-batch-crash resume — replaying rows that the idempotency
  // check (getRowByPath → {ok:true}, no error pushed) now skips would otherwise
  // double-count. An idempotent re-skip lands a row and records NO error, so it
  // still counts; only rows that pushed an error (row-error / row-type-missing /
  // row-skip = couldn't import) are subtracted.
  const notImported = nextErrors.length;
  const rowsDone = Math.max(0, Math.min(nextCursor - notImported, job.rowsTotal));
  const atEnd = nextCursor >= ordered.length;
  await saveProgress(job.id, {
    rowCursor: nextCursor,
    rowsDone,
    errors: nextErrors,
    status: atEnd ? "redirects" : "importing_rows",
  });

  return {
    done: false,
    status: atEnd ? "redirects" : "importing_rows",
    rowsDone,
    rowsTotal: job.rowsTotal,
  };
}

/**
 * Insert one planned row into its `ct_*` table via the same spine + coercion the
 * row-action uses, resolving `parent_id` from the parent's already-inserted row.
 * Idempotent: a row whose slug already exists in the table is skipped (a resume
 * re-attempting a committed row is a no-op, not a duplicate).
 */
async function insertPlannedRow(
  ref: CreatedTypeRef,
  planned: PlannedRow,
  loadType: (typeId: string) => Promise<CustomTypeRow | null>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const type = await loadType(ref.typeId);
  if (!type || !type.tableName) return { ok: false, error: "type not found" };

  const title = String(planned.title ?? "").trim();
  const rawSlug = (planned.slug ? String(planned.slug) : "").trim() || slugify(title);
  if (!rawSlug) return { ok: false, error: "a slug (or title to derive one) is required" };

  // Resolve the parent row id (hierarchical types only). Prefer parentPath (an
  // unambiguous key); fall back to parentSlug. The parent was inserted earlier
  // this run (rows are ordered parents-first) or exists from a prior run.
  let parentId: string | null = null;
  if (type.isHierarchical && (planned.parentSlug || planned.parentPath)) {
    const parent = planned.parentPath
      ? await getRowByPath(type.tableName, planned.parentPath)
      : await getRowBySlug(type.tableName, planned.parentSlug!);
    parentId = parent && typeof parent.id === "string" ? parent.id : null;
  }

  const path = await computeRowPath(
    {
      tableName: type.tableName,
      basePath: type.basePath,
      permalinkPattern: type.permalinkPattern,
      isHierarchical: type.isHierarchical,
    },
    rawSlug,
    parentId,
  );

  // Idempotency: skip if a row already occupies this PATH (not merely this slug —
  // nesting lets the same leaf slug appear under different parents). A resume
  // re-attempting a committed row is a no-op, not a duplicate.
  if (await getRowByPath(type.tableName, path)) return { ok: true };

  const now = Date.now();
  const status = planned.status === "published" ? "published" : "draft";
  const values: ContentRow = {
    id: createId(),
    slug: rawSlug,
    title,
    status,
    sort_order: 0,
    parent_id: parentId,
    path,
    created_at: now,
    updated_at: now,
    ...rowValuesFromInput(type.fields, planned.data),
  };
  await insertRow(type.tableName, values);
  return { ok: true };
}

/* --------------------------------------------------------------- CLI driver */

/**
 * Loop `stepImportJob` until the job is done or failed (the CLI/script path —
 * no request timeout). Logs progress each tick. Returns the final job row.
 */
export async function runImportToCompletion(
  jobId: string,
  opts: { batchSize?: number; log?: (msg: string) => void } = {},
): Promise<ImportJobRow> {
  const log = opts.log ?? ((msg: string) => console.log(msg));
  let guard = 0;
  const maxTicks = 5_000_000; // safety bound against a pathological non-advancing loop
  for (;;) {
    const res = await stepImportJob(jobId, { batchSize: opts.batchSize });
    log(`  [${res.status}] rows ${res.rowsDone}/${res.rowsTotal}`);
    if (res.done) break;
    if (++guard > maxTicks) throw new Error("runImportToCompletion: exceeded tick budget");
  }
  const job = await db.query.importJobs.findFirst({ where: eq(importJobs.id, jobId) });
  return job!;
}
