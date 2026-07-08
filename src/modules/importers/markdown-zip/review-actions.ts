"use server";

import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { makeBlockIdFactory } from "@/modules/importers/shared/block-id";
import { commitPages, type PageCandidate } from "@/modules/importers/shared/commit-pages";
import type { ParseIssue, Result } from "@/modules/importers/shared/types";
import { parseMarkdownZip } from "./parse";
import { mapMarkdownDoc } from "./map";
// MarkdownDryRunSummary lives in ./map — a "use server" module may only export async functions.
import type { MarkdownDryRunSummary } from "./map";

/**
 * Preview a Markdown-zip import — parse + map only, no DB writes. Lets the operator
 * see the page/published counts and any parse issues (bad frontmatter, normalized
 * slugs) before committing, matching the two-step flow every other importer uses.
 */
export async function dryRunMarkdownImport(file: File): Promise<Result<MarkdownDryRunSummary>> {
  await requireUser("owner");
  const ids = makeBlockIdFactory("md");
  ids.reset();

  // parseMarkdownZip returns its fields at the top level (a ParsedMarkdownZip),
  // not wrapped under `.data` like the shared Result<T> — see parse.ts.
  const parsed = await parseMarkdownZip(file);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const issues: ParseIssue[] = [...parsed.issues];
  let publishedCount = 0;
  for (const doc of parsed.docs) {
    const { page, issues: docIssues } = await mapMarkdownDoc(doc, ids.nextId);
    issues.push(...docIssues);
    if (page.status === "published") publishedCount++;
  }

  return {
    ok: true,
    data: { pageCount: parsed.docs.length, publishedCount, issues },
  };
}

/**
 * Commit a Markdown-zip import: one Lamina page per markdown file (skipping a route
 * that's already taken rather than overwriting), 301s from any frontmatter aliases,
 * then one safety receipt + audit row. Idempotent on re-runs — a route that already
 * exists is reported as a collision, never duplicated (via the shared commit loop).
 */
export async function commitMarkdownImport(file: File): Promise<Result<{ receiptId: string }>> {
  const user = await requireUser("owner");
  const ids = makeBlockIdFactory("md");
  ids.reset();

  const parsed = await parseMarkdownZip(file);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const issues: ParseIssue[] = [...parsed.issues];
  const pages: PageCandidate[] = [];
  for (const doc of parsed.docs) {
    const { page, issues: docIssues } = await mapMarkdownDoc(doc, ids.nextId);
    pages.push(page);
    issues.push(...docIssues);
  }

  const { receiptId } = await commitPages({ source: "markdown-zip", pages, issues });

  await writeAudit({
    userId: user.id,
    action: "import.markdown",
    ownerType: "import_receipt",
    ownerId: receiptId,
    meta: { pages: pages.length },
  });

  return { ok: true, data: { receiptId } };
}
