import type { ParsedSubstack, SubstackPost, SubstackSubscriber } from "./parse";
import { detectSubstackCard } from "./card-detect";
import { htmlToBlocks } from "../shared/html-to-blocks";
import { makeBlockIdFactory } from "../shared/block-id";
import type { PageCandidate, PersonCandidate } from "../shared/commit-pages";
import type { ParseIssue } from "../shared/types";

// ── block-id factory (mirrors Ghost's/WXR's; shared factory instance) ─────────
// The `substack-import-<n>` shape + 1-based counter are a tested contract.
const blockIds = makeBlockIdFactory("substack");
const nextBlockId = blockIds.nextId;

/** Reset the block-id counter — call at the top of each dry-run/commit action
 *  so ids don't leak across runs (production runs are one-shot per process;
 *  tests call multiple imports in one process). */
export function resetBlockIdCounter(): void {
  blockIds.reset();
}

/**
 * Map one Substack post to OYS's page + block-tree shape via the shared
 * html→blocks engine (image/button/subscribe cards via detectSubstackCard, the
 * rest coalesced into chunked richtext). A body exceeding one richtext block's
 * cap is split across sequential blocks (never truncated). Substack's canonical
 * post URL is `/p/<slug>`, so a 301 from there closes the gap for anyone with
 * the old link bookmarked or indexed.
 */
export async function mapSubstackPost(
  post: SubstackPost,
  nextId: () => string = nextBlockId,
): Promise<{ page: PageCandidate; issues: ParseIssue[] }> {
  const issues: ParseIssue[] = [];
  let blocks: PageCandidate["blocks"] = [];

  if (post.html.trim()) {
    // Substack wraps a whole post body in `<div class="body markup">…</div>`;
    // unwrap so nested image/subscribe/button cards become top-level and get
    // detected instead of collapsing into one richtext blob.
    const body = await htmlToBlocks(post.html, { detectCard: detectSubstackCard, idPrefix: "substack", nextId, unwrap: true });
    blocks = body.blocks;
    issues.push(...body.issues);
  } else {
    issues.push({ kind: "empty-body", detail: `"${post.title}" had no body content` });
  }

  return {
    page: {
      title: post.title || post.slug,
      slug: post.slug,
      route: `/${post.slug}`,
      kind: "post",
      status: post.status,
      blocks,
      redirectFrom: [`/p/${post.slug}`],
    },
    issues,
  };
}

/**
 * Map one Substack subscriber to OYS's people shape. A paid/active-subscription
 * row becomes a "member"; a free subscriber becomes a "subscriber". (Substack's
 * export carries no tier detail beyond free-vs-paid, so every paid subscriber
 * lands as an untiered member — reconciling to the site's real tier catalog is a
 * manual step the receipt surfaces, not something this importer guesses at.)
 */
export function mapSubstackSubscriber(sub: SubstackSubscriber): PersonCandidate {
  return {
    email: sub.email,
    name: sub.name || sub.email,
    kind: sub.paid ? "member" : "subscriber",
    note: sub.paid ? "Imported from Substack (paid subscriber)" : "Imported from Substack",
  };
}

/** Map every parsed post + subscriber in one call (used by the review actions). */
export async function mapSubstack(
  parsed: ParsedSubstack,
): Promise<{ pages: PageCandidate[]; people: PersonCandidate[]; issues: ParseIssue[] }> {
  const issues: ParseIssue[] = [...parsed.issues];
  const pages: PageCandidate[] = [];
  for (const post of parsed.posts) {
    const { page, issues: postIssues } = await mapSubstackPost(post);
    pages.push(page);
    issues.push(...postIssues);
  }
  const people = parsed.subscribers.map(mapSubstackSubscriber);
  return { pages, people, issues };
}

/** The Substack dry-run summary — defined HERE (a non-"use server" module) so both the
 *  review-actions ("use server") and the importer.tsx descriptor can import it. */
export type SubstackDryRunSummary = {
  postCount: number;
  subscriberCount: number;
  paidCount: number;
  issues: Array<{ kind: string; detail: string }>;
};
