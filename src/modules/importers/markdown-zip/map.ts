import { htmlToBlocks } from "@/modules/importers/shared/html-to-blocks";
import type { PageCandidate } from "@/modules/importers/shared/commit-pages";
import type { ParseIssue } from "@/modules/importers/shared/types";
import { detectMarkdownCard } from "./card-detect";
import type { MdDoc } from "./parse";

/**
 * Map one parsed markdown document to a page candidate. The heavy lifting — chunking
 * the already-sanitized body HTML into blocks (image cards via detectMarkdownCard,
 * everything else coalesced into richtext) — is the shared htmlToBlocks engine, so
 * markdown behaves exactly like every other importer. Markdown imports become OYS
 * pages (not posts); frontmatter aliases (Jekyll `redirect_from` / Hugo `aliases`)
 * flow through as `redirectFrom` so the shared commit loop can 301 old paths → new.
 */
export async function mapMarkdownDoc(
  doc: MdDoc,
  nextId: () => string,
): Promise<{ page: PageCandidate; issues: ParseIssue[] }> {
  const { blocks, issues } = await htmlToBlocks(doc.html, {
    detectCard: detectMarkdownCard,
    idPrefix: "md",
    nextId,
  });

  const page: PageCandidate = {
    title: doc.title,
    slug: doc.slug,
    route: `/${doc.slug}`,
    kind: "page",
    status: doc.status,
    blocks,
    redirectFrom: doc.aliases,
    tags: doc.tags,
  };

  return { page, issues };
}

/** The Markdown-zip dry-run summary — defined HERE (a non-"use server" module) so both the
 *  review-actions ("use server") and the importer.tsx descriptor can import it. */
export type MarkdownDryRunSummary = {
  pageCount: number;
  publishedCount: number;
  issues: ParseIssue[];
};
