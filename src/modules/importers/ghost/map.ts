import type { GhostMember, GhostPost, ParseIssue } from "./parse";
import { detectCard } from "./card-detect";
import { htmlToBlocks } from "../shared/html-to-blocks";
import { makeBlockIdFactory } from "../shared/block-id";

export type MappedPost = {
  ghostId: string;
  title: string;
  /** Lamina route: "/<slug>" — matches Ghost's default post permalink shape
   *  closely enough that a redirect from the old URL is a straight map. */
  route: string;
  slug: string;
  /** One or more richtext blocks holding the post body, in order — a post
   *  longer than richtextSchema's per-block cap is split across sequential
   *  blocks (see chunk-html.ts) rather than truncated or rejected, so a
   *  post of any length imports intact. v1 does not attempt a full
   *  Ghost-card-to-LAM-block converter; that's disproportionate scope for
   *  an importer whose job is "get the content in," not "perfectly
   *  recreate every Ghost card type." */
  blocks: Array<{ id: string; type: string; content: Record<string, unknown> }>;
  status: "draft" | "published";
  /** null = no gate (public); "" = any active member; a tier name = that tier.
   *  Ghost's CSV carries no tier-level detail, so a "paid" post always maps
   *  to the untiered gate — see MappedMember for the matching caveat. */
  gateTier: string | null;
};

export type MappedMember = {
  ghostId: string;
  email: string;
  name: string;
  /** "member" when paying or complimentary, else "subscriber". */
  kind: "member" | "subscriber";
  /** Only set for a paying (non-complimentary) member with a Stripe
   *  customer id — Ghost's CSV has no tier-level detail, so every imported
   *  paying member lands in a single untiered "member" tier; reconciling to
   *  the site's real tier catalog is a manual step the receipt should
   *  surface, not something this importer should guess at. */
  grantMembership: boolean;
  note: string;
};

// Block-id factory (was a module-global counter; now a shared factory instance).
// The `ghost-import-<n>` shape + 1-based counter are a tested contract.
const blockIds = makeBlockIdFactory("ghost");
const nextBlockId = blockIds.nextId;

/** Reset the block-id counter — call between imports (e.g. in tests) so ids
 *  don't leak state across runs; production runs are one-shot per process. */
export function resetBlockIdCounter(): void {
  blockIds.reset();
}

/**
 * Ghost's `visibility` maps directly onto Lamina's paywall tier model:
 * "public" → no gate, "members" → any active member, "paid" → also any
 * active member (Ghost's CSV carries no finer tier detail than that).
 */
function gateTierFor(visibility: GhostPost["visibility"]): string | null {
  switch (visibility) {
    case "public":
      return null;
    case "members":
    case "paid":
      return "";
  }
}

/**
 * Splits a post's html into top-level elements, maps each recognizable
 * Ghost card (image/gallery/callout/button/bookmark/embed — see
 * card-detect.ts) to its native Lamina block, and coalesces consecutive
 * unrecognized elements back into chunked richtext blocks (so a run of 5
 * plain paragraphs still becomes one or two richtext blocks, not 5). Runs
 * sequentially, not via Promise.all, because detectCard's embed path can
 * make a real network call (SoundCloud's oEmbed) — a post with many embeds
 * should resolve them one at a time, not fire N concurrent third-party
 * requests from one import.
 */
function mapPostBody(html: string): Promise<{ blocks: MappedPost["blocks"]; issues: ParseIssue[] }> {
  return htmlToBlocks(html, { detectCard, idPrefix: "ghost", nextId: nextBlockId });
}

/**
 * Map one Ghost post to Lamina's page + block-tree shape. Prefers `html`
 * (richtext accepts html directly, sanitized at render — see
 * blocks/richtext/fields.ts) over `lexical`, since this codebase has no
 * lexical renderer; a lexical-only post's body is dropped with an issue
 * raised rather than silently emitting an empty page. A post whose html
 * exceeds one richtext block's cap is split across multiple sequential
 * richtext blocks (never truncated, never rejected) — see chunk-html.ts.
 */
export async function mapGhostPost(post: GhostPost): Promise<{ mapped: MappedPost; issues: ParseIssue[] }> {
  const issues: ParseIssue[] = [];
  const blocks: MappedPost["blocks"] = [];

  if (post.html) {
    const bodyBlocks = await mapPostBody(post.html);
    for (const b of bodyBlocks.blocks) blocks.push(b);
    issues.push(...bodyBlocks.issues);
  } else if (post.lexical) {
    issues.push({
      kind: "lexical-only-post",
      detail: `Post "${post.title}" has only lexical content (no html) — body was not imported`,
    });
  }

  const gateTier = gateTierFor(post.visibility);
  if (gateTier !== null) {
    blocks.unshift({
      id: nextBlockId(),
      type: "paywall",
      content: { tier: gateTier, title: "The rest is for members" },
    });
  }

  return {
    mapped: {
      ghostId: post.id,
      title: post.title,
      route: `/${post.slug}`,
      slug: post.slug,
      blocks,
      status: post.status,
      gateTier,
    },
    issues,
  };
}

/**
 * Map one Ghost Members CSV row to Lamina's people/memberships shape.
 * `complimentary_plan` OR a non-empty `stripe_customer_id` both count as
 * "was a paying/comp member" — Ghost's export doesn't otherwise flag "this
 * row is on the paid tier" any more precisely than that.
 */
export function mapGhostMember(member: GhostMember): MappedMember {
  const wasPaying = member.complimentary_plan || member.stripe_customer_id.trim().length > 0;
  return {
    ghostId: member.id,
    email: member.email,
    name: member.name || member.email,
    kind: wasPaying ? "member" : "subscriber",
    grantMembership: wasPaying,
    note: member.note,
  };
}

/** The Ghost dry-run summary — defined HERE (a non-"use server" module) so both the
 *  review-actions ("use server") and the importer.tsx descriptor can import it. */
export type GhostDryRunSummary = {
  postCount: number;
  memberCount: number;
  payingMemberCount: number;
  posts: MappedPost[];
  members: MappedMember[];
  issues: ParseIssue[];
};
