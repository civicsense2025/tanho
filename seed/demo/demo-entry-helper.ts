import { eq, and } from "drizzle-orm";
import { entries } from "../../src/modules/entries/schema";
import { get as getEntitySchema } from "../../src/entities/registry";
import type { SeedDb } from "../lib";
import { putBlockSets, type Block } from "./demo-blocks";

/**
 * Upsert one entry (validated against its entity schema) plus optional block
 * set. Returns the entry id. Idempotent on (type, slug).
 */
export async function upsertEntry(
  db: SeedDb,
  type: string,
  slug: string,
  title: string,
  data: unknown,
  opts: { sortOrder?: number; status?: "draft" | "published"; blocks?: Block[] } = {},
): Promise<string> {
  const schema = getEntitySchema(type);
  if (!schema) throw new Error(`demo seed: unknown entity type ${type}`);
  const parsed = schema.dataSchema.parse(data) as Record<string, unknown>;

  const existing = await db.query.entries.findFirst({
    where: and(eq(entries.type, type), eq(entries.slug, slug)),
  });
  const row = {
    type,
    slug,
    title,
    status: opts.status ?? ("published" as const),
    sortOrder: opts.sortOrder ?? 0,
    data: parsed,
    updatedAt: Date.now(),
  };
  let id: string;
  if (existing) {
    await db.update(entries).set(row).where(eq(entries.id, existing.id));
    id = existing.id;
  } else {
    const [ins] = await db.insert(entries).values(row).returning({ id: entries.id });
    id = ins.id;
  }
  if (opts.blocks) await putBlockSets(db, `entry:${type}`, id, opts.blocks);
  return id;
}
