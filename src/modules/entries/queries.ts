import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { BlockNode } from "@/blocks/types";
import { blockSets } from "@/modules/pages/schema";
import { entries, type EntryRow } from "./schema";

/** Admin list of every entry of a type — uncached (admin is dynamic). */
export async function listEntries(type: string): Promise<EntryRow[]> {
  return db.query.entries.findMany({
    where: eq(entries.type, type),
    orderBy: [asc(entries.sortOrder), asc(entries.title)],
  });
}

/** One published entry by (type, slug) — cached. */
export async function getPublishedEntry(
  type: string,
  slug: string,
): Promise<EntryRow | null> {
  "use cache";
  cacheLife("max");
  cacheTag("entries", `entries:${type}`);
  const row = await db.query.entries.findFirst({
    where: and(
      eq(entries.type, type),
      eq(entries.slug, slug),
      eq(entries.status, "published"),
    ),
  });
  return row ?? null;
}

/** All published entries of a type, in sort order — cached. */
export async function listPublishedEntries(type: string): Promise<EntryRow[]> {
  "use cache";
  cacheLife("max");
  cacheTag("entries", `entries:${type}`);
  return db.query.entries.findMany({
    where: and(eq(entries.type, type), eq(entries.status, "published")),
    orderBy: [asc(entries.sortOrder), asc(entries.title)],
  });
}

/** Admin editor load: entry row + draft blocks (falls back to published). */
export async function getEntryForEdit(
  id: string,
): Promise<{ entry: EntryRow; blocks: BlockNode[]; publishedBlocks: BlockNode[] } | null> {
  const entry = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!entry) return null;
  const ownerType = `entry:${entry.type}`;
  const sets = await db.query.blockSets.findMany({
    where: and(eq(blockSets.ownerType, ownerType), eq(blockSets.ownerId, id)),
  });
  const draft = sets.find((s) => s.variant === "draft");
  const published = sets.find((s) => s.variant === "published");
  return {
    entry,
    blocks: (draft?.blocks ?? published?.blocks ?? []) as BlockNode[],
    publishedBlocks: (published?.blocks ?? []) as BlockNode[],
  };
}

/** Published block tree for a public entry page — cached per type. */
export async function getPublishedEntryBlocks(
  type: string,
  id: string,
): Promise<BlockNode[]> {
  "use cache";
  cacheLife("max");
  cacheTag("entries", `entries:${type}`);
  const set = await db.query.blockSets.findFirst({
    where: and(
      eq(blockSets.ownerType, `entry:${type}`),
      eq(blockSets.ownerId, id),
      eq(blockSets.variant, "published"),
    ),
  });
  return (set?.blocks ?? []) as BlockNode[];
}
