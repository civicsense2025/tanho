import "server-only";
import type { AnyEntitySchema } from "./types";
import { get, all } from "./registry";
import { getEnabledCustomTypes } from "@/modules/custom-types/queries";
import { buildEntitySchemaForCustomType } from "@/modules/custom-types/entity-schema";

/**
 * Custom-type-aware registry lookups — split from `./registry.ts` because
 * these pull in DB access (`next/cache`'s cacheTag via
 * custom-types/queries.ts), which must never be transitively importable
 * from a client component. `./registry.ts` stays a pure, sync, builtins-only
 * module for exactly that reason (it's imported by client components like
 * pages/admin/DashboardTabs.tsx that only ever need built-in types).
 *
 * Custom types are never written into the registry's Map — they're resolved
 * fresh from `getEnabledCustomTypes()` (cached, tag-invalidated on
 * save/delete) on every call here, so there's no shared-mutable-state or
 * stale-entry risk across concurrent requests as a custom type is edited or
 * deleted while the app is running.
 */

/** The schema for ANY content type, built-in or DB-defined custom type (`custom:<slug>`). Server-only. */
export async function getEntitySchema(entity: string): Promise<AnyEntitySchema | undefined> {
  const builtin = get(entity);
  if (builtin) return builtin;
  if (!entity.startsWith("custom:")) return undefined;
  const slug = entity.slice("custom:".length);
  const customTypes = await getEnabledCustomTypes();
  const row = customTypes.find((t) => t.slug === slug);
  return row ? buildEntitySchemaForCustomType(row) : undefined;
}

/** Every entity schema, built-in + DB-defined custom types. Server-only. */
export async function allEntitySchemas(): Promise<AnyEntitySchema[]> {
  const customTypes = await getEnabledCustomTypes();
  return [...all(), ...customTypes.map(buildEntitySchemaForCustomType)];
}

/** Every content-grid-visible entity schema, built-ins + custom types (custom types are never taxonomy). Server-only. */
export async function contentEntitiesAsync(): Promise<AnyEntitySchema[]> {
  return (await allEntitySchemas()).filter((s) => !s.taxonomy);
}
