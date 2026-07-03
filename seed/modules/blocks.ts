import { eq } from "drizzle-orm";
import { allBlockDefs } from "../../src/blocks/registry";
import { blockRegistry } from "../../src/modules/blocks/schema";
import { log, type SeedDb } from "../lib";

/**
 * Seed the DB-backed block registry from the compiled block definitions in
 * `src/blocks/registry.ts`. Idempotent by `type`: a row that already exists is
 * refreshed (metadata updated to match the current compiled def, `enabled`
 * left untouched so an owner's off-toggle survives re-seeding) and a missing
 * row is inserted as `source: "builtin", builtin: true`.
 */
export async function seedBlockRegistry(db: SeedDb) {
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
  log(`block registry seeded (${defs.length} types — refresh if present)`);
}
