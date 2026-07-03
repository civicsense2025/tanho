import { and, desc, eq, inArray, like, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pages } from "@/modules/pages/schema";
import { LICENSE_IDS, LICENSES } from "./licenses";
import { media, mediaUsage } from "./schema";

export type MediaRow = typeof media.$inferSelect;
export type MediaUsageRow = typeof mediaUsage.$inferSelect;
/** Usage row + resolved owner title (page titles today; route otherwise). */
export type MediaUsageRef = MediaUsageRow & { title: string };
export type MediaWithUsage = MediaRow & { usage: MediaUsageRef[] };

export type MediaFilters = {
  kind?: "image" | "video" | "doc";
  tag?: string;
  needsAlt?: boolean;
  needsCredit?: boolean;
  q?: string;
};

const CREDIT_REQUIRED = LICENSE_IDS.filter((id) => LICENSES[id].creditRequired);

/** Attach usage refs (with owner titles) to a set of media rows. */
async function withUsage(rows: MediaRow[]): Promise<MediaWithUsage[]> {
  if (!rows.length) return [];
  const usage = await db
    .select()
    .from(mediaUsage)
    .where(inArray(mediaUsage.mediaId, rows.map((r) => r.id)));

  const pageIds = [...new Set(usage.filter((u) => u.ownerType === "page").map((u) => u.ownerId))];
  const titleRows = pageIds.length
    ? await db
        .select({ id: pages.id, title: pages.title })
        .from(pages)
        .where(inArray(pages.id, pageIds))
    : [];
  const titles = new Map(titleRows.map((t) => [t.id, t.title]));

  const byMedia = new Map<string, MediaUsageRef[]>();
  for (const u of usage) {
    const ref: MediaUsageRef = { ...u, title: titles.get(u.ownerId) ?? u.route };
    const list = byMedia.get(u.mediaId);
    if (list) list.push(ref);
    else byMedia.set(u.mediaId, [ref]);
  }
  return rows.map((r) => ({ ...r, usage: byMedia.get(r.id) ?? [] }));
}

/**
 * Admin media list — uncached (admin is dynamic), newest first. Filters
 * compose with AND. `q` and `tag` use parameterized LIKE; SQL wildcards in
 * the needle are tolerated (admin-only convenience search, read-only).
 */
export async function listMedia(filters: MediaFilters = {}): Promise<MediaWithUsage[]> {
  const conds: (SQL | undefined)[] = [];
  if (filters.kind) conds.push(eq(media.kind, filters.kind));
  if (filters.needsAlt) conds.push(eq(media.kind, "image"), eq(media.alt, ""));
  if (filters.needsCredit) {
    conds.push(inArray(media.license, CREDIT_REQUIRED), eq(media.credit, ""));
  }
  // tags is JSON text (`["a","b"]`) — match the quoted serialized form.
  if (filters.tag) conds.push(like(media.tags, `%"${filters.tag}"%`));
  if (filters.q) {
    const needle = `%${filters.q}%`;
    conds.push(
      or(
        like(media.name, needle),
        like(media.alt, needle),
        like(media.credit, needle),
        like(media.source, needle),
        like(media.tags, needle),
      ),
    );
  }
  const rows = await db.query.media.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: [desc(media.createdAt)],
  });
  return withUsage(rows);
}

export async function getMediaById(id: string): Promise<MediaWithUsage | null> {
  const row = await db.query.media.findFirst({ where: eq(media.id, id) });
  if (!row) return null;
  const [withRefs] = await withUsage([row]);
  return withRefs ?? null;
}
