import { BUNDLE_FORMAT, CORE_TABLES, PEOPLE_TABLES, STRIPE_FIELD_RE } from "./manifest";
import type { Manifest, SiteContent } from "./manifest";

/** Deep-drops any object key matching STRIPE_FIELD_RE, recursing into plain objects and arrays. */
export function stripSensitiveFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripSensitiveFields(v)) as unknown as T;
  }
  if (value !== null && typeof value === "object" && !(value instanceof Uint8Array)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (STRIPE_FIELD_RE.test(k)) continue;
      out[k] = stripSensitiveFields(v);
    }
    return out as T;
  }
  return value;
}

export type SerializeOptions = { includePeople: boolean; now: number };

/**
 * Pure assembly step: raw rows-by-table in → sensitive fields stripped,
 * manifest counts computed, people tables included/excluded per opts. No DB,
 * no filesystem — the seam export.ts calls after reading each allowlisted
 * table, and what export.test.ts exercises directly.
 */
export function serializeTables(
  rawRowsByTable: Record<string, unknown[]>,
  opts: SerializeOptions,
): SiteContent {
  const tableNames = opts.includePeople ? [...CORE_TABLES, ...PEOPLE_TABLES] : CORE_TABLES;

  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const name of tableNames) {
    const rows = (rawRowsByTable[name] ?? []).map((row) => stripSensitiveFields(row));
    tables[name] = rows;
    counts[name] = rows.length;
  }

  const manifest: Manifest = {
    format: BUNDLE_FORMAT,
    version: 1,
    generatedAt: opts.now,
    counts,
    includesPeople: opts.includePeople,
  };

  return { manifest, tables };
}
