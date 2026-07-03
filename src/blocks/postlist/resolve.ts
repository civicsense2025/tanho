import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pages } from "@/modules/pages/schema";
import type { PostlistContent } from "./fields";

export type PostlistItem = {
  title: string;
  href: string;
  date: string;
  excerpt: string;
  locked: boolean;
};

const day = (ms: number | null) =>
  ms ? new Date(ms).toISOString().slice(0, 10) : "";

/**
 * Server-only: published posts (kind="post"), newest first, capped by limit.
 * `locked` reads the page row's `hasPaywall` so the list can show a lock glyph
 * without touching gated block content.
 */
export async function resolvePostlist(
  content: PostlistContent,
): Promise<PostlistItem[]> {
  const rows = await db.query.pages.findMany({
    where: and(eq(pages.kind, "post"), eq(pages.status, "published")),
    orderBy: [desc(pages.publishedAt), desc(pages.updatedAt)],
    limit: content.limit,
  });
  return rows.map((r) => ({
    title: r.title,
    href: r.route,
    date: day(r.publishedAt),
    excerpt: r.seoDescription ?? "",
    locked: r.hasPaywall,
  }));
}
