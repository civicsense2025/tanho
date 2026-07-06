import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { ImportPlan } from "./plan";

/**
 * Runner tests against a migrated libSQL db (same harness the content-schema
 * row-action tests use). The runner drives the real DDL + ct_ CRUD primitives,
 * so this exercises the WHOLE pipeline end-to-end in-process: type creation →
 * parents-first row tree → old→new redirects → checkpoint + resume. Only the db
 * client + next/cache are mocked (the runner deliberately avoids the "use
 * server" auth/cache-coupled wrappers, so no auth mock needed).
 *
 * A FILE-backed temp DB (not :memory:) so reads after `db.transaction()` share
 * the same DB — libSQL :memory: gives a transaction its own connection, which
 * loses visibility of tables not written during that tx (mirrors the note in
 * auth/first-owner.test.ts). The row phase runs inside a transaction, so this
 * matters here.
 */
let client: Client;
let testDb: ReturnType<typeof drizzle<typeof schema>>;
let tmpDir: string;

vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));
vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return { ...actual, updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() };
});

const nestedPlan = (): ImportPlan => ({
  types: [
    {
      slug: "docs",
      name: "Doc",
      pluralName: "Docs",
      isHierarchical: true,
      permalinkPattern: "{base}/{parent_path}/{slug}",
      fields: [{ key: "summary", label: "Summary", kind: "text" }],
    },
  ],
  rows: [
    // Deliberately out of order: children before parents.
    { typeSlug: "docs", slug: "macos", title: "macOS", parentSlug: "install", data: { summary: "leaf" }, status: "published", oldPath: "/old/guide/install/macos" },
    { typeSlug: "docs", slug: "install", title: "Install", parentSlug: "guide", data: { summary: "mid" }, status: "published", oldPath: "/old/guide/install" },
    { typeSlug: "docs", slug: "guide", title: "Guide", data: { summary: "root" }, status: "published", oldPath: "/old/guide" },
    { typeSlug: "docs", slug: "faq", title: "FAQ", data: { summary: "root2" }, status: "draft" },
  ],
});

beforeEach(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "imports-runner-"));
  client = createClient({ url: `file:${join(tmpDir, "test.db")}` });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

afterEach(() => {
  client.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("import runner", () => {
  it("runs a nested plan to completion: type + parents-first rows + redirects", async () => {
    const { createImportJob, runImportToCompletion } = await import("./runner");
    const { jobId } = await createImportJob(nestedPlan(), "auto");
    const final = await runImportToCompletion(jobId, { batchSize: 500, log: () => {} });

    expect(final.status).toBe("completed");
    expect(final.rowsDone).toBe(4);
    expect(final.typesCreated).toHaveLength(1);

    // The ct_docs table exists with the right materialized paths.
    const { getRowBySlug } = await import("@/modules/content-schema/crud");
    const table = final.typesCreated[0]!.tableName;
    const guide = await getRowBySlug(table, "guide");
    const install = await getRowBySlug(table, "install");
    const macos = await getRowBySlug(table, "macos");
    expect(guide?.path).toBe("/docs/guide");
    expect(install?.path).toBe("/docs/guide/install");
    expect(macos?.path).toBe("/docs/guide/install/macos"); // 3 levels deep, parent resolved
    // parent_id wiring is correct (adjacency edge).
    expect(install?.parent_id).toBe(guide?.id);
    expect(macos?.parent_id).toBe(install?.id);
  });

  it("drives createRow with parents before children (batchSize 1 across many ticks)", async () => {
    const { createImportJob, stepImportJob } = await import("./runner");
    const { getRowBySlug } = await import("@/modules/content-schema/crud");
    const { jobId } = await createImportJob(nestedPlan(), "auto");

    // Step one row at a time; assert no child is ever inserted before its parent.
    let guard = 0;
    for (;;) {
      const before = await stepImportJob(jobId, { batchSize: 1 });
      // Whenever a child exists, its parent must already exist.
      const table = "ct_docs";
      const macos = await getRowBySlug(table, "macos").catch(() => null);
      if (macos) {
        const install = await getRowBySlug(table, "install");
        expect(install).not.toBeNull();
      }
      if (before.done) break;
      if (++guard > 100) throw new Error("too many ticks");
    }
    const job = await testDb.query.importJobs.findFirst({ where: eq(schema.importJobs.id, jobId) });
    expect(job?.status).toBe("completed");
    expect(job?.rowsDone).toBe(4);
  });

  it("writes identity-skipped old→new redirects tagged with the job id", async () => {
    const { createImportJob, runImportToCompletion } = await import("./runner");
    const { jobId } = await createImportJob(nestedPlan(), "auto");
    const final = await runImportToCompletion(jobId, { log: () => {} });

    const rows = await testDb.query.redirects.findMany();
    const batchRows = rows.filter((r) => r.sourceBatch === jobId);
    // 3 published rows carry oldPaths (guide/install/macos); the draft faq has none.
    expect(batchRows).toHaveLength(3);
    const fromPaths = batchRows.map((r) => r.fromPath).sort();
    expect(fromPaths).toContain("/old/guide");
    expect(fromPaths).toContain("/old/guide/install");
    for (const r of batchRows) {
      expect(r.code).toBe(301);
      expect(r.autoCreatedFrom).toBe("import");
    }
  });

  it("drops an identity redirect (oldPath already equals the new path)", async () => {
    const { createImportJob, runImportToCompletion } = await import("./runner");
    const plan: ImportPlan = {
      types: [{ slug: "docs", name: "Doc", isHierarchical: false, fields: [] }],
      rows: [
        // oldPath == the path this row will get ("/docs/a") → identity, skipped.
        { typeSlug: "docs", slug: "a", title: "A", data: {}, status: "published", oldPath: "/docs/a" },
        { typeSlug: "docs", slug: "b", title: "B", data: {}, status: "published", oldPath: "/legacy/b" },
      ],
    };
    const { jobId } = await createImportJob(plan, "auto");
    const final = await runImportToCompletion(jobId, { log: () => {} });
    expect(final.redirectsDone).toBe(1); // only /legacy/b → /docs/b
  });

  it("is idempotent: re-running the same plan creates no duplicate rows/types", async () => {
    const { createImportJob, runImportToCompletion } = await import("./runner");
    const { listRows } = await import("@/modules/content-schema/crud");

    const plan = nestedPlan();
    const first = await runImportToCompletion((await createImportJob(plan, "auto")).jobId, { log: () => {} });
    expect(first.status).toBe("completed");
    const afterFirst = (await listRows("ct_docs", { limit: 500 })).length;

    // A SECOND job with the same plan: adopts the existing type, skips existing rows.
    const second = await runImportToCompletion((await createImportJob(plan, "auto")).jobId, { log: () => {} });
    expect(second.status).toBe("completed");
    const afterSecond = (await listRows("ct_docs", { limit: 500 })).length;

    expect(afterSecond).toBe(afterFirst); // no dupes
    // Only one content type exists for the slug.
    const types = await testDb.query.customTypes.findMany({ where: eq(schema.customTypes.slug, "docs") });
    expect(types).toHaveLength(1);
  });

  it("resumes from the checkpoint after a simulated crash mid-rows", async () => {
    const { createImportJob, stepImportJob } = await import("./runner");
    const { listRows } = await import("@/modules/content-schema/crud");
    const { jobId } = await createImportJob(nestedPlan(), "auto");

    // Tick until the type is made and SOME rows are in (status importing_rows/redirects), then stop.
    let ticks = 0;
    for (;;) {
      const res = await stepImportJob(jobId, { batchSize: 1 });
      ticks++;
      const job = await testDb.query.importJobs.findFirst({ where: eq(schema.importJobs.id, jobId) });
      if (job && job.rowsDone >= 2) break; // "crash" here — stop calling
      if (res.done) break;
      if (ticks > 100) throw new Error("runaway");
    }
    const mid = await testDb.query.importJobs.findFirst({ where: eq(schema.importJobs.id, jobId) });
    expect(mid!.rowsDone).toBeGreaterThanOrEqual(2);
    expect(mid!.status).not.toBe("completed");
    const partial = (await listRows("ct_docs", { limit: 500 })).length;
    expect(partial).toBeGreaterThanOrEqual(2);

    // Resume: keep ticking the SAME job to completion.
    let guard = 0;
    for (;;) {
      const res = await stepImportJob(jobId, { batchSize: 1 });
      if (res.done) break;
      if (++guard > 100) throw new Error("resume runaway");
    }
    const done = await testDb.query.importJobs.findFirst({ where: eq(schema.importJobs.id, jobId) });
    expect(done!.status).toBe("completed");
    expect(done!.rowsDone).toBe(4);
    expect((await listRows("ct_docs", { limit: 500 })).length).toBe(4); // no double-insert on resume
  });

  it("propose_confirm holds type creation until confirmed", async () => {
    const { createImportJob, stepImportJob, confirmImportJob } = await import("./runner");
    const { jobId } = await createImportJob(nestedPlan(), "propose_confirm");

    // Ticks while unconfirmed do not create the type; the job holds at creating_types.
    for (let i = 0; i < 3; i++) await stepImportJob(jobId, { batchSize: 1 });
    let job = await testDb.query.importJobs.findFirst({ where: eq(schema.importJobs.id, jobId) });
    expect(job!.status).toBe("creating_types");
    expect(job!.typesCreated).toHaveLength(0);
    const types0 = await testDb.query.customTypes.findMany();
    expect(types0).toHaveLength(0);

    // Confirm → subsequent ticks proceed to completion.
    await confirmImportJob(jobId);
    let guard = 0;
    for (;;) {
      const res = await stepImportJob(jobId, { batchSize: 500 });
      if (res.done) break;
      if (++guard > 50) throw new Error("runaway");
    }
    job = await testDb.query.importJobs.findFirst({ where: eq(schema.importJobs.id, jobId) });
    expect(job!.status).toBe("completed");
    expect(job!.typesCreated).toHaveLength(1);
  });

  it("map_existing fails cleanly when a planned type has no existing match", async () => {
    const { createImportJob, runImportToCompletion } = await import("./runner");
    const { jobId } = await createImportJob(nestedPlan(), "map_existing");
    const final = await runImportToCompletion(jobId, { log: () => {} });
    expect(final.status).toBe("failed");
    expect(final.errors.some((e) => /no existing content type/i.test(e.detail))).toBe(true);
  });

  it("isolates a bad row without aborting the batch", async () => {
    const { createImportJob, runImportToCompletion } = await import("./runner");
    // A row with no title and no slug can't derive a slug → recorded, others still import.
    const plan: ImportPlan = {
      types: [{ slug: "docs", name: "Doc", isHierarchical: false, fields: [] }],
      rows: [
        { typeSlug: "docs", slug: "", title: "", data: {}, status: "published" },
        { typeSlug: "docs", slug: "ok", title: "OK", data: {}, status: "published" },
      ],
    };
    const { jobId } = await createImportJob(plan, "auto");
    const final = await runImportToCompletion(jobId, { log: () => {} });
    expect(final.status).toBe("completed");
    expect(final.rowsDone).toBe(1); // only "ok" landed
    expect(final.errors.some((e) => e.kind === "row-skip")).toBe(true);
  });
});
