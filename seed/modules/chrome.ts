import { and, eq } from "drizzle-orm";
import { blockSets } from "../../src/modules/pages/schema";
import { validateBlockTree } from "../../src/modules/pages/blocks-io";
import { CHROME_OWNER_ID, CHROME_OWNER_TYPES } from "../../src/modules/chrome/owners";
import { defaultChromeTree } from "../../src/modules/chrome/templates";
import { log, type SeedDb } from "../lib";

/**
 * Default chrome block trees — the clean-cutover successor to the old chrome
 * settings rows. Writes a default header + footer BLOCK TREE (the nicest
 * template, wired to the seeded Main menu) into `block_sets` under the new
 * ownerTypes `chrome:header` / `chrome:footer`, in BOTH draft and published
 * variants, exactly like the page seed. Idempotent: an owner that already has
 * rows is left untouched.
 *
 * Each tree is run through `validateBlockTree` before it lands — so seeding
 * doubles as a guarantee that the default templates validate against the block
 * schemas (the fail-closed write boundary pages use).
 */
export async function seedChrome(db: SeedDb, mainMenuId: string) {
  for (const ownerType of CHROME_OWNER_TYPES) {
    const existing = await db.query.blockSets.findFirst({
      where: and(eq(blockSets.ownerType, ownerType), eq(blockSets.ownerId, CHROME_OWNER_ID)),
    });
    if (existing) continue;

    const tree = defaultChromeTree(ownerType, mainMenuId);
    const v = validateBlockTree(tree);
    if (!v.ok) {
      throw new Error(`[seed] default ${ownerType} tree failed validation: ${v.error}`);
    }
    for (const variant of ["draft", "published"] as const) {
      await db.insert(blockSets).values({
        ownerType,
        ownerId: CHROME_OWNER_ID,
        variant,
        blocks: v.blocks,
      });
    }
  }
  log("chrome header/footer block trees seeded (skip if present)");
}
