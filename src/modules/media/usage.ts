import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { media, mediaUsage } from "./schema";
import { scanBlocksForMedia } from "./usage-scan";

/**
 * Recomputes the media_usage index for one owner from its block tree.
 * Publish flows call this with the published tree (wired by the lead).
 * Delete + insert run in ONE transaction so readers never see a
 * half-rebuilt index for the owner.
 */
export async function rebuildMediaUsage(
  ownerType: string,
  ownerId: string,
  route: string,
  blocks: unknown[],
): Promise<void> {
  const refs = scanBlocksForMedia(blocks);
  const keys = [...new Set(refs.map((r) => r.storageKey))];
  const rows = keys.length
    ? await db
        .select({ id: media.id, storageKey: media.storageKey })
        .from(media)
        .where(inArray(media.storageKey, keys))
    : [];
  const idByKey = new Map(rows.map((r) => [r.storageKey, r.id]));

  // Keys with no media row (deleted assets, stale URLs) drop out silently.
  const values = refs.flatMap((r) => {
    const mediaId = idByKey.get(r.storageKey);
    return mediaId
      ? [{ mediaId, ownerType, ownerId, whereLabel: r.whereLabel, route }]
      : [];
  });

  await db.transaction(async (tx) => {
    await tx
      .delete(mediaUsage)
      .where(and(eq(mediaUsage.ownerType, ownerType), eq(mediaUsage.ownerId, ownerId)));
    if (values.length) await tx.insert(mediaUsage).values(values);
  });
}
