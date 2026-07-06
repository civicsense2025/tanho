"use server";

import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { makeBlockIdFactory } from "@/modules/importers/shared/block-id";
import { commitPages, type PageCandidate } from "@/modules/importers/shared/commit-pages";
import type { ParseIssue, Result } from "@/modules/importers/shared/types";
import { parseMedium } from "./parse";
import { mapMediumPost } from "./map";
// MediumDryRunSummary lives in ./map — a "use server" module may only export async functions.
import type { MediumDryRunSummary } from "./map";

/**
 * Preview a Medium import — parse + map only, no DB writes. Lets the operator
 * see the story/published counts and any parse issues (normalized slugs,
 * unsupported embeds) before committing, matching the two-step flow every other
 * importer uses.
 */
export async function dryRunMediumImport(file: File): Promise<Result<MediumDryRunSummary>> {
  await requireUser("owner");
  const ids = makeBlockIdFactory("medium");
  ids.reset();

  const parsed = await parseMedium(file);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const issues: ParseIssue[] = [...parsed.data!.issues];
  let publishedCount = 0;
  for (const post of parsed.data!.posts) {
    const { page, issues: postIssues } = await mapMediumPost(post, ids.nextId);
    issues.push(...postIssues);
    if (page.status === "published") publishedCount++;
  }

  return {
    ok: true,
    data: { postCount: parsed.data!.posts.length, publishedCount, issues },
  };
}

/**
 * Commit a Medium import: one OYS post per story (skipping a route that's
 * already taken rather than overwriting), 301s from each story's Medium
 * canonical path, then one safety receipt + audit row. Idempotent on re-runs —
 * a route that already exists is reported as a collision, never duplicated (via
 * the shared commit loop).
 */
export async function commitMediumImport(file: File): Promise<Result<{ receiptId: string }>> {
  const user = await requireUser("owner");
  const ids = makeBlockIdFactory("medium");
  ids.reset();

  const parsed = await parseMedium(file);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const issues: ParseIssue[] = [...parsed.data!.issues];
  const pages: PageCandidate[] = [];
  for (const post of parsed.data!.posts) {
    const { page, issues: postIssues } = await mapMediumPost(post, ids.nextId);
    pages.push(page);
    issues.push(...postIssues);
  }

  const { receiptId } = await commitPages({ source: "medium", pages, issues });

  await writeAudit({
    userId: user.id,
    action: "import.medium",
    ownerType: "import_receipt",
    ownerId: receiptId,
    meta: { posts: pages.length },
  });

  return { ok: true, data: { receiptId } };
}
