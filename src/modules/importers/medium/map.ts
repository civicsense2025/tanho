import { htmlToBlocks } from "@/modules/importers/shared/html-to-blocks";
import type { PageCandidate } from "@/modules/importers/shared/commit-pages";
import type { ParseIssue } from "@/modules/importers/shared/types";
import { detectMediumCard } from "./card-detect";
import type { MediumPost } from "./parse";

/**
 * Map one parsed Medium story to a page candidate. The heavy lifting — chunking
 * the story body HTML into blocks (image/quote/embed cards via detectMediumCard,
 * everything else coalesced into richtext) — is the shared htmlToBlocks engine,
 * so Medium behaves exactly like every other importer. Medium stories become Lamina
 * posts. The 301 source is the story's Medium canonical path (guarded — a
 * malformed canonical falls back to the "/<slug>/" convention Ghost/WXR use), so
 * anyone with the old Medium URL indexed lands on the imported post.
 */
export async function mapMediumPost(
  post: MediumPost,
  nextId: () => string,
): Promise<{ page: PageCandidate; issues: ParseIssue[] }> {
  const { blocks, issues } = await htmlToBlocks(post.html, {
    detectCard: detectMediumCard,
    idPrefix: "medium",
    nextId,
  });

  let redirectFrom: string[] = [`/${post.slug}/`];
  if (post.canonicalUrl) {
    try {
      redirectFrom = [new URL(post.canonicalUrl).pathname];
    } catch {
      // Malformed canonical URL — keep the "/<slug>/" fallback.
    }
  }

  const page: PageCandidate = {
    title: post.title,
    slug: post.slug,
    route: `/${post.slug}`,
    kind: "post",
    status: post.status,
    blocks,
    redirectFrom,
  };

  return { page, issues };
}

/** The Medium dry-run summary — defined HERE (a non-"use server" module) so both the
 *  review-actions ("use server") and the importer.tsx descriptor can import it. */
export type MediumDryRunSummary = {
  postCount: number;
  publishedCount: number;
  issues: ParseIssue[];
};
