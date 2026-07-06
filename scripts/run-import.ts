/**
 * run-import.ts — the primary LARGE-import entry point (10k–100k rows). Drives
 * the resumable pipeline (src/modules/imports/runner.ts) OUT of any HTTP
 * request, so there is no request timeout: it creates a job from an ImportPlan
 * and loops `stepImportJob` to completion, checkpointing as it goes.
 *
 * WHY A SCRIPT (not a route): a 100k-row ingest can't ride a single request.
 * The runner checkpoints into the `import_jobs` row after each bounded chunk;
 * this loop just turns the crank. Re-running with the SAME plan is idempotent
 * (existing types/rows are adopted/skipped) — and passing an existing --job id
 * RESUMES that job from its last committed offset instead of starting fresh.
 *
 * RUN:
 *   npx tsx --env-file-if-exists=.env scripts/run-import.ts <plan.json> [--mode auto|propose_confirm|map_existing] [--batch 500]
 *   npx tsx --env-file-if-exists=.env scripts/run-import.ts --demo         # built-in tiny nested demo
 *   npx tsx --env-file-if-exists=.env scripts/run-import.ts --job <id>     # resume an existing job
 */
import { readFileSync } from "node:fs";
import {
  createImportJob,
  runImportToCompletion,
} from "../src/modules/imports/runner";
import type { ImportControlMode } from "../src/modules/imports/schema";
import type { ImportPlan } from "../src/modules/imports/plan";

/** A tiny hierarchical demo plan: one "docs" type + 6 rows, 3 levels deep, with oldPaths. */
function demoPlan(): ImportPlan {
  return {
    types: [
      {
        slug: "importdemo-docs",
        name: "Import Demo Doc",
        pluralName: "Import Demo Docs",
        isHierarchical: true,
        permalinkPattern: "{base}/{parent_path}/{slug}",
        fields: [{ key: "summary", label: "Summary", kind: "text" }],
      },
    ],
    rows: [
      { typeSlug: "importdemo-docs", slug: "guide", title: "Guide", data: { summary: "root" }, status: "published", oldPath: "/old/guide" },
      { typeSlug: "importdemo-docs", slug: "install", title: "Install", parentSlug: "guide", data: { summary: "L2" }, status: "published", oldPath: "/old/guide/install" },
      { typeSlug: "importdemo-docs", slug: "macos", title: "macOS", parentSlug: "install", data: { summary: "L3" }, status: "published", oldPath: "/old/guide/install/macos" },
      { typeSlug: "importdemo-docs", slug: "linux", title: "Linux", parentSlug: "install", data: { summary: "L3" }, status: "published", oldPath: "/importdemo-docs/guide/install/linux" },
      { typeSlug: "importdemo-docs", slug: "usage", title: "Usage", parentSlug: "guide", data: { summary: "L2" }, status: "published", oldPath: "/old/guide/usage" },
      { typeSlug: "importdemo-docs", slug: "faq", title: "FAQ", data: { summary: "root" }, status: "draft" },
    ],
  };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const jobId = arg("--job");
  if (jobId) {
    console.log(`run-import: resuming job ${jobId}\n`);
    const final = await runImportToCompletion(jobId, { batchSize: Number(arg("--batch")) || undefined });
    report(final);
    return;
  }

  const mode = (arg("--mode") as ImportControlMode | undefined) ?? "auto";
  const isDemo = process.argv.includes("--demo");
  const planPath = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : undefined;

  let plan: ImportPlan;
  if (isDemo || !planPath) {
    plan = demoPlan();
    console.log("run-import: using built-in demo plan (namespaced 'importdemo-docs')\n");
  } else {
    plan = JSON.parse(readFileSync(planPath, "utf8")) as ImportPlan;
    console.log(`run-import: loaded plan from ${planPath} (${plan.types.length} types, ${plan.rows.length} rows)\n`);
  }

  const { jobId: id } = await createImportJob(plan, mode, { source: isDemo ? "demo" : "generic" });
  console.log(`Created job ${id} (mode=${mode}). Running to completion:\n`);

  if (mode === "propose_confirm") {
    console.log("  (mode=propose_confirm: types will NOT be created until confirmImportJob() is called — the loop will hold.)\n");
  }

  const final = await runImportToCompletion(id, { batchSize: Number(arg("--batch")) || undefined });
  report(final);
}

function report(final: { id: string; status: string; rowsDone: number; rowsTotal: number; typesCreated: unknown[]; redirectsDone: number; errors: Array<{ kind: string; detail: string }> }) {
  console.log(`\nDone. job=${final.id} status=${final.status}`);
  console.log(`  types created/mapped: ${final.typesCreated.length}`);
  console.log(`  rows imported: ${final.rowsDone}/${final.rowsTotal}`);
  console.log(`  redirects written: ${final.redirectsDone}`);
  if (final.errors.length > 0) {
    console.log(`  issues (${final.errors.length}):`);
    for (const e of final.errors.slice(0, 20)) console.log(`    · [${e.kind}] ${e.detail}`);
    if (final.errors.length > 20) console.log(`    … +${final.errors.length - 20} more`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
