import type { ParseIssue, WxrAuthor, WxrItem } from "./parse";
import { detectWxrCard, type CardResult } from "./card-detect";
import { htmlToBlocks } from "../shared/html-to-blocks";
import { makeBlockIdFactory } from "../shared/block-id";
import type { ImportedBlock } from "../shared/types";

// Re-export so existing importers of ImportedBlock from wxr/map keep compiling.
export type { ImportedBlock };

export type MappedItem = {
  wpId: string;
  title: string;
  /** Lamina route: "/<normalized-slug>". */
  route: string;
  slug: string;
  /** WP "page" → Lamina page kind "page"; everything else → "post". */
  kind: "page" | "post";
  blocks: ImportedBlock[];
  status: "draft" | "published";
  sortOrder: number;
  /** Category + tag display names, collapsed into the page's tag list. */
  tags: string[];
};

export type MappedAuthor = {
  email: string;
  name: string;
  kind: "subscriber";
};

/**
 * A dependency-injected card detector so the Squarespace importer can layer
 * its own image/gallery handling on top of the shared WordPress detection
 * without forking the whole body pipeline.
 */
export type WxrMapOptions = { detectCard: (elementHtml: string) => Promise<CardResult | null> };

/** The default options — plain WordPress detection. */
export const defaultMapOptions: WxrMapOptions = { detectCard: detectWxrCard };

// ── block-id factory (mirrors Ghost's; shared factory instance) ──────────────
// The `wxr-import-<n>` shape + 1-based counter are a tested contract.
const blockIds = makeBlockIdFactory("wxr");
const nextBlockId = blockIds.nextId;
/** Reset the block-id counter — call at the top of each dry-run/commit action
 *  so ids don't leak across runs (production runs are one-shot per process;
 *  tests call multiple imports in one process). */
export function resetBlockIdCounter(): void {
  blockIds.reset();
}

/**
 * Coerce a WP `wp:post_name` (which may be empty, percent-encoded, uppercase,
 * underscore- or space-separated, or unicode) to a slug matching Lamina's strict
 * slugSchema `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Falls back to a slugified title,
 * then to `post-<id>`. Returns the slug plus whether it had to be changed
 * (so the caller can raise a `slug-normalized` issue).
 */
export function normalizeSlug(rawSlug: string, title: string, postId: string): { slug: string; changed: boolean } {
  const slugify = (input: string): string => {
    let s = input;
    try {
      s = decodeURIComponent(input);
    } catch {
      // Malformed percent-encoding — fall back to the raw string.
    }
    return s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
      .replace(/[^a-z0-9]+/g, "-") // any run of non-slug chars → single dash
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120)
      .replace(/-+$/g, ""); // trim a dash the slice may have left
  };

  const fromSlug = slugify(rawSlug);
  if (fromSlug) return { slug: fromSlug, changed: fromSlug !== rawSlug };

  const fromTitle = slugify(title);
  if (fromTitle) return { slug: fromTitle, changed: true };

  return { slug: `post-${slugify(postId) || "0"}`, changed: true };
}

/**
 * WXR `wp:status` → Lamina status. Only "publish" publishes; everything else
 * (draft/pending/private/future) imports as a draft. Returns the status plus
 * an optional issue for a non-draft, non-publish status the owner should know
 * was downgraded. "trash" is handled by the caller (skipped entirely).
 */
export function mapStatus(wpStatus: string, title: string): { status: "draft" | "published"; issue?: ParseIssue } {
  if (wpStatus === "publish") return { status: "published" };
  if (wpStatus === "draft" || wpStatus === "auto-draft" || wpStatus === "") return { status: "draft" };
  return {
    status: "draft",
    issue: { kind: "status-downgraded", detail: `"${title}" had status "${wpStatus}"; imported as a draft` },
  };
}

/**
 * Split an item's body html into top-level elements, map each recognizable
 * card to its native Lamina block, and coalesce runs of unrecognized elements
 * back into chunked richtext blocks. Runs sequentially (not Promise.all)
 * because the embed path can make a network call — mirrors Ghost's mapPostBody.
 */
export function mapItemBody(
  html: string,
  opts: WxrMapOptions = defaultMapOptions,
): Promise<{ blocks: ImportedBlock[]; issues: ParseIssue[] }> {
  return htmlToBlocks(stripGutenbergComments(html), { detectCard: opts.detectCard, idPrefix: "wxr", nextId: nextBlockId });
}

/**
 * Strip Gutenberg block-delimiter comments (`<!-- wp:image {…} -->` … `<!-- /wp:image -->`)
 * from a WordPress body. Every modern WP export wraps each block in these; they're
 * editor metadata, never rendered, and — being HTML comments — would otherwise glue
 * to the following element and hide it from per-element card detection (the top-level
 * splitter treats a comment as its own node). Only wp: comments are removed, so an
 * author's own `<!-- … -->` notes are left intact.
 */
export function stripGutenbergComments(html: string): string {
  return html.replace(/<!--\s*\/?wp:[\s\S]*?-->/g, "");
}

/**
 * Map one WXR item (a post or page) to Lamina's page + block-tree shape. A body
 * exceeding one richtext block's cap is split across sequential blocks (never
 * truncated). An item with no body html yields no body blocks and an issue,
 * paralleling Ghost's empty/lexical-only handling.
 */
export async function mapWxrItemToPage(
  item: WxrItem,
  opts: WxrMapOptions = defaultMapOptions,
): Promise<{ mapped: MappedItem; issues: ParseIssue[] }> {
  const issues: ParseIssue[] = [];

  const { slug, changed } = normalizeSlug(item.slug, item.title, item.postId);
  if (changed) {
    issues.push({ kind: "slug-normalized", detail: `"${item.title}" slug normalized to "${slug}"` });
  }

  const { status, issue: statusIssue } = mapStatus(item.status, item.title);
  if (statusIssue) issues.push(statusIssue);

  let blocks: ImportedBlock[] = [];
  if (item.contentHtml.trim()) {
    const body = await mapItemBody(item.contentHtml, opts);
    blocks = body.blocks;
    issues.push(...body.issues);
  } else {
    issues.push({ kind: "empty-body", detail: `"${item.title}" had no body content` });
  }

  const tags = Array.from(
    new Set(item.categories.map((c) => c.name.trim()).filter(Boolean).map((t) => t.slice(0, 40))),
  ).slice(0, 20);

  return {
    mapped: {
      wpId: item.postId,
      title: item.title || slug,
      route: `/${slug}`,
      slug,
      kind: item.postType === "page" ? "page" : "post",
      blocks,
      status,
      sortOrder: Number(item.menuOrder) || 0,
      tags,
    },
    issues,
  };
}

/** Map a WXR author (or a bare `dc:creator` with a resolvable email) to Lamina's
 *  people shape. Returns null when there's no usable email — the people table
 *  requires a unique, non-null email, so an email-less author can't be a row. */
export function mapWxrAuthor(author: WxrAuthor): MappedAuthor | null {
  const email = author.email.trim().toLowerCase();
  if (!email) return null;
  return { email, name: author.displayName || author.login || email, kind: "subscriber" };
}
