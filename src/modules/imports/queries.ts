import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { importJobs, type ImportJobRow } from "./schema";

/** A slim projection of an import job for the admin migration panel. */
export type ImportJobSummary = Pick<
  ImportJobRow,
  "id" | "source" | "status" | "controlMode" | "confirmed" | "rowsTotal" | "rowsDone" | "redirectsDone" | "createdAt"
> & { typesCreated: number; errors: number };

/** Recent import jobs, newest-first — for the SEO hub's migration status panel. */
export async function listImportJobs(limit = 20): Promise<ImportJobSummary[]> {
  const rows = await db.query.importJobs.findMany({
    orderBy: [desc(importJobs.createdAt)],
    limit,
  });
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    status: r.status,
    controlMode: r.controlMode,
    confirmed: r.confirmed,
    rowsTotal: r.rowsTotal,
    rowsDone: r.rowsDone,
    redirectsDone: r.redirectsDone,
    createdAt: r.createdAt,
    typesCreated: r.typesCreated.length,
    errors: r.errors.length,
  }));
}
