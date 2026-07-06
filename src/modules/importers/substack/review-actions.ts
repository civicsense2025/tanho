"use server";

import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { commitPages } from "../shared/commit-pages";
import type { Result } from "../shared/types";
import { parseSubstack } from "./parse";
import { mapSubstack, resetBlockIdCounter } from "./map";
// SubstackDryRunSummary lives in ./map — a "use server" module may only export async functions.
import type { SubstackDryRunSummary } from "./map";

/**
 * Preview a Substack import — extract + parse + map only, no DB writes. Lets the
 * operator see exactly what would happen (post/subscriber/paid counts, anything
 * unmappable) before committing, matching the Ghost/WordPress importers' two-step
 * dry-run → confirm flow.
 */
export async function dryRunSubstackImport(file: File): Promise<Result<SubstackDryRunSummary>> {
  await requireUser("owner");
  resetBlockIdCounter();

  const parsed = await parseSubstack(file);
  if (!parsed.ok) return parsed;

  const { people, issues } = await mapSubstack(parsed.data!);

  return {
    ok: true,
    data: {
      postCount: parsed.data!.posts.length,
      subscriberCount: parsed.data!.subscribers.length,
      paidCount: people.filter((p) => p.kind === "member").length,
      issues,
    },
  };
}

/**
 * Commit a Substack import: create + publish a page per post (a paid/free
 * distinction lives on the subscriber, not the post — Substack's post HTML has
 * no paywall marker to gate on), upsert a 301 from the old `/p/<slug>` path,
 * import subscribers as people (paid → "member", free → "subscriber"), then
 * write one safety receipt + an audit row. Idempotent on route/email collisions
 * — a re-run on an existing route or email skips it and reports it, never
 * duplicating or overwriting (see commitPages).
 */
export async function commitSubstackImport(file: File): Promise<Result<{ receiptId: string }>> {
  const user = await requireUser("owner");
  resetBlockIdCounter();

  const parsed = await parseSubstack(file);
  if (!parsed.ok) return parsed;

  const { pages, people, issues } = await mapSubstack(parsed.data!);

  const { receiptId } = await commitPages({ source: "substack", pages, people, issues });

  await writeAudit({
    userId: user.id,
    action: "import.substack",
    ownerType: "import_receipt",
    ownerId: receiptId,
    meta: { posts: pages.length, subscribers: people.length },
  });

  return { ok: true, data: { receiptId } };
}
