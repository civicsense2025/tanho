import { htmlToBlocks } from "../shared/html-to-blocks";
import type { PageCandidate } from "../shared/commit-pages";
import type { ParseIssue } from "../shared/types";
import { detectFeedCard } from "./card-detect";
import type { FeedItem } from "./parse";

/**
 * Extract the path (+ query) from an item's absolute permalink, for an exact
 * 301 old→new. A feed's `<link>` is the canonical source URL anyone has
 * bookmarked/indexed. Returns null when the link isn't a usable absolute URL so
 * the caller can fall back to the reconstructed `/<slug>/`.
 */
function tryPathname(link: string): string | null {
  if (!link) return null;
  try {
    const u = new URL(link);
    return `${u.pathname}${u.search}` || null;
  } catch {
    return null;
  }
}

/**
 * Map one feed item to a page candidate. The body HTML is chunked into blocks
 * by the shared htmlToBlocks engine (image cards via detectFeedCard, everything
 * else coalesced into richtext), so feed imports behave exactly like every
 * other importer. Feed items become published Lamina posts; the source permalink
 * flows through as `redirectFrom` so the shared commit loop can 301 old → new.
 */
export async function mapFeedItem(
  item: FeedItem,
  nextId: () => string,
): Promise<{ page: PageCandidate; issues: ParseIssue[] }> {
  const { blocks, issues } = await htmlToBlocks(item.contentHtml, {
    detectCard: detectFeedCard,
    idPrefix: "rss",
    nextId,
  });

  if (!item.contentHtml.trim()) {
    issues.push({ kind: "empty-body", detail: `"${item.title || item.slug}" had no body content` });
  }

  const fromPath = tryPathname(item.link);
  const page: PageCandidate = {
    title: item.title || item.slug,
    slug: item.slug,
    route: `/${item.slug}`,
    kind: "post",
    status: "published",
    blocks,
    redirectFrom: fromPath ? [fromPath] : [`/${item.slug}/`],
  };

  return { page, issues };
}

/** The RSS dry-run summary — defined HERE (a non-"use server" module) so both the
 *  review-actions ("use server") and the importer.tsx descriptor can import it. */
export type RssDryRunSummary = {
  itemCount: number;
  issues: ParseIssue[];
};
