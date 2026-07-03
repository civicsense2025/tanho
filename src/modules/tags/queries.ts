import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tags, taggings } from "./schema";

export type TagWithCount = { id: string; name: string; usage: number };

/**
 * All tags with their usage count, name-sorted. LEFT JOIN so unused tags
 * still appear with a count of 0. Uncached — the admin screen is dynamic.
 */
export async function listTagsWithCounts(): Promise<TagWithCount[]> {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      usage: count(taggings.tagId),
    })
    .from(tags)
    .leftJoin(taggings, eq(taggings.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));
  return rows;
}
