import { storage } from "@/adapters/storage";
import { db } from "@/lib/db/client";
import { CORE_TABLES, PEOPLE_TABLES } from "./manifest";
import type { ExportedFile, SiteContent } from "./manifest";
import { serializeTables } from "./serialize";
import { TABLES } from "./table-registry";

export type BuildSiteExportOptions = {
  /** Include the PII-bearing people tables (people, personActivity, …). */
  includePeople: boolean;
  /** Timestamp (ms) to stamp the manifest with — Date.now() isn't safe to
   *  call in every calling context, so this is always passed in. */
  now: number;
};

export type SiteExport = {
  contentJson: SiteContent;
  files: ExportedFile[];
};

/**
 * Reads every allowlisted table, strips sensitive fields, and collects the
 * bytes for every uploaded file referenced by the `media` table. This is the
 * one function the export route (and any future CLI) calls — it owns no I/O
 * shape decisions (archive format, HTTP headers), just "what is the site."
 */
export async function buildSiteExport(opts: BuildSiteExportOptions): Promise<SiteExport> {
  const tableNames = opts.includePeople ? [...CORE_TABLES, ...PEOPLE_TABLES] : CORE_TABLES;

  const rawRowsByTable: Record<string, unknown[]> = {};
  for (const name of tableNames) {
    // db.select().from(...) never rejects on an empty table — it resolves []. No table may 500 the export.
    rawRowsByTable[name] = await db.select().from(TABLES[name]);
  }

  const contentJson = serializeTables(rawRowsByTable, { includePeople: opts.includePeople, now: opts.now });

  const mediaRows = (rawRowsByTable.media ?? []) as Array<{ storageKey: string }>;
  const files: ExportedFile[] = [];
  for (const row of mediaRows) {
    const file = await storage.read(row.storageKey);
    // A media row whose bytes are missing from storage shouldn't fail the
    // whole export — content.json still lists it; it just won't unpack a file.
    if (file) files.push({ key: row.storageKey, bytes: file.data });
  }

  return { contentJson, files };
}
