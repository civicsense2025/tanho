import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { allBlockDefs } from "@/blocks/registry";
import { blockRegistry, type BlockRegistryRow } from "./schema";

/**
 * DB-backed block registry reads. The compiled half (schema/Render/make) lives
 * in `@/blocks/registry`; this module owns the metadata half that the picker
 * and Blocks admin screen read.
 *
 * Seeding is self-healing: the first read in a process ensures the table holds
 * a row for every compiled def (idempotent upsert by `type`). This means an
 * existing install that never re-ran `npm run seed` still gets the registry
 * populated the moment any screen reads it — no operator action required.
 */

let ensurePromise: Promise<void> | null = null;

/**
 * Idempotently upsert a registry row for every compiled block def. Runs at
 * most once per process (guarded by `ensurePromise`); re-seeds via the seed
 * script or the admin "refresh" action. `enabled` is preserved on existing
 * rows so an owner's off-toggle survives.
 */
export function ensureBlockRegistrySeeded(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const defs = allBlockDefs();
      for (const def of defs) {
        const existing = await db.query.blockRegistry.findFirst({ where: eq(blockRegistry.type, def.type) });
        const meta = {
          category: def.category,
          label: def.label,
          icon: def.icon,
          blurb: def.blurb,
          version: 1,
          updatedAt: Date.now(),
        };
        if (existing) {
          await db.update(blockRegistry).set(meta).where(eq(blockRegistry.type, def.type));
        } else {
          await db.insert(blockRegistry).values({
            type: def.type,
            ...meta,
            source: "builtin",
            builtin: true,
            enabled: true,
          });
        }
      }
    })().catch((err) => {
      // Allow a later read to retry; never permanently wedge the registry.
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}

export type RegistryEntry = BlockRegistryRow;

/**
 * All registry rows, built-ins first. Cached on "block-registry"; mutations
 * updateTag it. Ensures seeded before reading so a fresh install is never
 * presented with an empty picker.
 */
export async function listBlockRegistry(): Promise<RegistryEntry[]> {
  "use cache";
  cacheLife("max");
  cacheTag("block-registry");
  await ensureBlockRegistrySeeded();
  const rows = await db.query.blockRegistry.findMany();
  return rows.sort((a, b) => (b.builtin ? 1 : 0) - (a.builtin ? 1 : 0) || a.label.localeCompare(b.label));
}

/** A type → row map, for the picker to merge with compiled defs. */
export async function registryMap(): Promise<Map<string, RegistryEntry>> {
  const rows = await listBlockRegistry();
  return new Map(rows.map((r) => [r.type, r]));
}
