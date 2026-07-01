import { listContentEntries, updateContentEntry, getContentTypeById } from "@/lib/db";
import { revalidateContent } from "@/lib/cache";

/**
 * Flips due-scheduled content entries to published. Generic over "whatever content type has
 * scheduledAt" -- makes no assumption about which type(s) actually use scheduling.
 *
 * Filters `scheduledAt <= now` in application code rather than a DB comparison operator, per the
 * same tradeoff already made for filtering generic entries by field values: ListQuery<T>.where
 * only supports equality/`{in:[]}` in all 3 adapters, and extending it is a deferrable investment
 * appropriate to this app's actual scale (a handful of scheduled items at a time for a solo
 * creator), not something worth adding just for this one query.
 */
export async function publishDueScheduledContent(now: Date = new Date()): Promise<{ id: string }[]> {
  const nowIso = now.toISOString();
  const due = (await listContentEntries({ status: "scheduled" })).filter(
    (e) => e.scheduledAt !== null && e.scheduledAt <= nowIso
  );

  const typeSlugs = new Set<string>();
  const published: { id: string }[] = [];

  for (const entry of due) {
    // publishedAt is set to the entry's OWN scheduledAt, not the actual flip time, so publish
    // order matches author intent exactly regardless of cron polling jitter -- a post scheduled
    // for 9:00 shouldn't display as published at 9:04, and two posts scheduled 3 minutes apart
    // shouldn't reorder based on which side of a 15-minute poll window they land on.
    await updateContentEntry(entry.id, { status: "published", scheduledAt: null, publishedAt: entry.scheduledAt });
    published.push({ id: entry.id });
    const type = await getContentTypeById(entry.contentTypeId);
    if (type) typeSlugs.add(type.slug);
  }

  for (const typeSlug of typeSlugs) revalidateContent(typeSlug);
  return published;
}
