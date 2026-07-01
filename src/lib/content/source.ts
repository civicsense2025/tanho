import { readFile } from "fs/promises";
import path from "path";
import type { ContentEntry } from "@/lib/db";
import * as db from "@/lib/db";

/**
 * Content-source indirection for the static-vs-dynamic build mode. Data-bound blocks (and any
 * list-consuming page) import THIS instead of "@/lib/db" for their reads:
 *
 *   - dynamic mode (default): each function is a passthrough to the runtime DB query layer.
 *   - static mode: reads the pre-exported JSON snapshot from content/data/*.json (written by
 *     snapshot.ts at build time), so the app renders with NO runtime database.
 *
 * The function signatures MATCH the db query layer, so switching a block over is a one-line
 * import change. `mode` is env-only (NEXT_PUBLIC_SITE_MODE) — it selects a code path at
 * build/boot, not per request, which is why it isn't a runtime setting.
 */

const isStatic = process.env.NEXT_PUBLIC_SITE_MODE === "static";
const DATA_ROOT = path.join(process.cwd(), "content", "data");

async function readSnapshot<T>(name: string): Promise<T[]> {
  try {
    const raw = await readFile(path.join(DATA_ROOT, `${name}.json`), "utf-8");
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export async function getContentEntries(typeSlug: string, publishedOnly = true): Promise<ContentEntry[]> {
  if (!isStatic) {
    const type = await db.getContentTypeBySlug(typeSlug);
    if (!type) return [];
    return db.listContentEntries({ contentTypeId: type.id, publishedOnly });
  }
  const all = await readSnapshot<ContentEntry>(typeSlug);
  return publishedOnly ? all.filter((e) => e.status === "published") : all;
}

export async function getContentEntry(typeSlug: string, slug: string): Promise<ContentEntry | undefined> {
  if (!isStatic) return db.getContentEntry(typeSlug, slug);
  const all = await readSnapshot<ContentEntry>(typeSlug);
  return all.find((e) => e.slug === slug);
}

// Legacy entity reads — experience, skills, awards, education stay as bespoke entities.
export async function getExperience() {
  return db.listExperience();
}
export async function getSkills() {
  return db.listSkills();
}
export async function getAwards() {
  return db.listAwards();
}
export async function getEducation() {
  return db.listEducation();
}
