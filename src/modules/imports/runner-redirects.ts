import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { slugify } from "@/lib/slug";
import { customTypes, type CustomTypeRow } from "@/modules/custom-types/schema";
import { redirects } from "@/modules/redirects/schema";
import { isSameOriginPath } from "@/modules/redirects/validation";
import { getRowByPath, getRowBySlug } from "@/modules/content-schema/crud";
import { computeRowPath } from "@/modules/content-schema/paths";
import { buildIdentityRedirects, type PlannedRow } from "./plan";
import type { CreatedTypeRef, ImportJobRow } from "./schema";
import type { StepResult } from "./runner-types";

/**
 * The redirects phase of an import (extracted from runner.ts). Writes the
 * identity-skipped old→new redirects in one batched insert, tagged with
 * `sourceBatch = jobId` so the whole migration rolls back as a unit. Off-origin
 * sources/targets are dropped; onConflictDoNothing keeps a re-run idempotent
 * (fromPath is unique). `saveProgress` is injected to avoid a circular import
 * back into runner.ts.
 */
export async function stepRedirects(
  job: ImportJobRow,
  saveProgress: (jobId: string, patch: Partial<ImportJobRow>) => Promise<void>,
): Promise<StepResult> {
  const typeBySlug = new Map<string, CreatedTypeRef>(job.typesCreated.map((t) => [t.slug, t]));

  // Resolve each row's NEW path deterministically. Keyed by FULL identity
  // (type + parent + slug), never bare slug: nesting allows the same leaf slug
  // under different parents, so a slug lookup returns the wrong row. Recompute
  // the path the same way insertPlannedRow did (resolve the parent, then
  // computeRowPath) — authoritative without an ambiguous read.
  const typeRowCache = new Map<string, (CustomTypeRow & { tableName: string }) | null>();
  const loadTypeRow = async (typeId: string) => {
    if (typeRowCache.has(typeId)) return typeRowCache.get(typeId)!;
    const row = await db.query.customTypes.findFirst({ where: eq(customTypes.id, typeId) });
    const val = row && row.tableName ? (row as CustomTypeRow & { tableName: string }) : null;
    typeRowCache.set(typeId, val);
    return val;
  };
  const pathCache = new Map<string, string | undefined>();
  const keyFor = (r: PlannedRow) => `${r.typeSlug}|${r.parentPath ?? r.parentSlug ?? ""}|${r.slug}`;
  const resolveNewPath = async (r: PlannedRow): Promise<string | undefined> => {
    const k = keyFor(r);
    if (pathCache.has(k)) return pathCache.get(k);
    const ref = typeBySlug.get(r.typeSlug);
    let path: string | undefined;
    const type = ref ? await loadTypeRow(ref.typeId) : null;
    if (type) {
      let parentId: string | null = null;
      if (type.isHierarchical && (r.parentSlug || r.parentPath)) {
        const parent = r.parentPath
          ? await getRowByPath(type.tableName, r.parentPath)
          : await getRowBySlug(type.tableName, r.parentSlug!);
        parentId = parent && typeof parent.id === "string" ? parent.id : null;
      }
      const rawSlug = (r.slug ? String(r.slug) : "").trim() || slugify(String(r.title ?? "").trim());
      if (rawSlug) {
        path = await computeRowPath(
          {
            tableName: type.tableName,
            basePath: type.basePath,
            permalinkPattern: type.permalinkPattern,
            isHierarchical: type.isHierarchical,
          },
          rawSlug,
          parentId,
        );
      }
    }
    pathCache.set(k, path);
    return path;
  };

  // buildIdentityRedirects wants a sync resolver, so pre-resolve all new paths.
  const withOld = job.plan.rows.filter((r) => r.oldPath);
  const resolved = new Map<string, string | undefined>();
  for (const r of withOld) resolved.set(keyFor(r), await resolveNewPath(r));

  const planned = buildIdentityRedirects(job.plan.rows, (r) => resolved.get(keyFor(r)));
  const values = planned
    .filter((p) => isSameOriginPath(p.from) && isSameOriginPath(p.to))
    .map((p) => ({
      fromPath: p.from,
      toPath: p.to,
      code: 301,
      matchType: "exact" as const,
      kind: "redirect" as const,
      destination: p.to,
      sourceBatch: job.sourceBatch ?? job.id,
      autoCreatedFrom: "import",
    }));

  if (values.length > 0) {
    // Chunk to keep any single INSERT bounded (parameter limits on large jobs).
    for (let i = 0; i < values.length; i += 1000) {
      await db.insert(redirects).values(values.slice(i, i + 1000)).onConflictDoNothing();
    }
  }

  await saveProgress(job.id, {
    status: "completed",
    redirectsDone: values.length,
    completedAt: Date.now(),
  });
  return { done: true, status: "completed", rowsDone: job.rowsDone, rowsTotal: job.rowsTotal };
}
