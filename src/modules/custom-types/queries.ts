import { cacheLife, cacheTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customTypes, type CustomTypeRow } from "./schema";

/** All custom types (enabled + disabled), name-sorted. Uncached — admin. */
export async function listCustomTypes(): Promise<CustomTypeRow[]> {
  return db.query.customTypes.findMany({ orderBy: [asc(customTypes.name)] });
}

/**
 * Enabled custom types, cached under "custom_types". The entity registry
 * reads this to register `custom:<slug>` types per request.
 */
export async function getEnabledCustomTypes(): Promise<CustomTypeRow[]> {
  "use cache";
  cacheLife("max");
  cacheTag("custom_types");
  return db.query.customTypes.findMany({
    where: eq(customTypes.enabled, true),
    orderBy: [asc(customTypes.name)],
  });
}
