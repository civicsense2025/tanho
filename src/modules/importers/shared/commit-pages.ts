import { db } from "@/lib/db/client";
import { people } from "@/modules/people/schema";
import { redirects } from "@/modules/redirects/schema";
import { createPage, deletePage, publishPage } from "@/modules/pages/actions";
import { saveOwnerBlocks } from "@/modules/blocks/actions";
import { getPublishedPage } from "@/modules/pages/queries";
import { importReceipts } from "@/modules/importers/ghost/schema";
import type { ImportedBlock, ParseIssue } from "./types";

/**
 * ONE page candidate an importer wants to create — the normalized shape the shared
 * commit loop consumes. `redirectFrom` is the item's original source path (a 301 is
 * created old→new); omit for importers with no source URLs (e.g. markdown).
 */
export type PageCandidate = {
  title: string;
  slug: string;
  /** Lamina route, "/<slug>". */
  route: string;
  kind: "page" | "post";
  status: "draft" | "published";
  blocks: ImportedBlock[];
  /** Original permalink path(s) → 301 to `route`. First is the primary. */
  redirectFrom?: string[];
  tags?: string[];
};

/** A person candidate (e.g. a Substack subscriber) — email is the natural key. */
export type PersonCandidate = { email: string; name: string; kind: "member" | "subscriber"; note?: string };

export type CommitPagesResult = { receiptId: string };

/**
 * The shared page-import commit loop, extracted from ghost/review-actions.ts's
 * commitGhostImport so every importer gets the same battle-tested behavior:
 *  - each page isolated in its own try/catch (one bad row never aborts the batch),
 *  - a route collision → skip + `unmapped` issue (idempotent re-runs), never overwrite,
 *  - an invalid/failed page → the orphan empty page is deleted (no blank drafts left),
 *  - 301 redirects via onConflictDoNothing, resolution status tracked,
 *  - optional people upsert (onConflictDoNothing on email),
 *  - one receipt row + audit at the end.
 *
 * `writeReceiptAudit` is injected because writeAudit + the receipt insert are the two
 * things that vary by source; the caller (a `"use server"` action) passes them so this
 * file stays free of the audit import cycle and the source string lives at the call site.
 */
export async function commitPages(args: {
  source: string;
  pages: PageCandidate[];
  people?: PersonCandidate[];
  /** Extra parse-level issues to record on the receipt. */
  issues?: ParseIssue[];
  /** Called once at the end with the assembled receipt — returns the inserted receipt id. */
}): Promise<CommitPagesResult> {
  const { source, pages, people: peopleList = [], issues = [] } = args;

  const peopleCountBefore = (await db.query.people.findMany({ columns: { id: true } })).length;
  const membershipCountBefore = (await db.query.memberships.findMany({ columns: { id: true } })).length;

  const unmapped: Array<{ kind: string; detail: string }> = [...issues];
  const redirectStatuses: Array<{ fromPath: string; toPath: string; status: "resolved" | "broken" }> = [];
  let pagesImported = 0;

  for (const cand of pages) {
    const primaryFrom = cand.redirectFrom?.[0] ?? `/${cand.slug}/`;
    try {
      const created = await createPage({
        title: cand.title,
        slug: cand.slug,
        route: cand.route,
        kind: cand.kind,
        status: "draft",
        tags: cand.tags ?? [],
      });
      if (!created.ok) {
        unmapped.push({ kind: "route-collision", detail: `"${cand.title}" (${cand.route}): ${created.error}` });
        redirectStatuses.push({ fromPath: primaryFrom, toPath: cand.route, status: "broken" });
        continue;
      }

      const saved = await saveOwnerBlocks("page", created.data!.id, cand.blocks);
      if (!saved.ok) {
        await deletePage(created.data!.id); // remove the orphan empty page
        unmapped.push({ kind: "content-invalid", detail: `"${cand.title}" (${cand.route}): ${saved.error}` });
        redirectStatuses.push({ fromPath: primaryFrom, toPath: cand.route, status: "broken" });
        continue;
      }
      if (cand.status === "published") {
        const published = await publishPage(created.data!.id);
        if (!published.ok) {
          await deletePage(created.data!.id);
          unmapped.push({ kind: "publish-failed", detail: `"${cand.title}" (${cand.route}): ${published.error}` });
          redirectStatuses.push({ fromPath: primaryFrom, toPath: cand.route, status: "broken" });
          continue;
        }
      }

      // 301(s) old→new for anyone with the source URL bookmarked/indexed.
      for (const from of cand.redirectFrom ?? [`/${cand.slug}/`]) {
        if (from === cand.route) continue;
        await db.insert(redirects).values({ fromPath: from, toPath: cand.route, code: 301 }).onConflictDoNothing();
      }

      const publishedPage = await getPublishedPage(cand.route);
      redirectStatuses.push({
        fromPath: primaryFrom,
        toPath: cand.route,
        status: cand.status === "published" && publishedPage ? "resolved" : "broken",
      });
      pagesImported++;
    } catch (err) {
      unmapped.push({
        kind: "import-error",
        detail: `"${cand.title}" (${cand.route}): ${err instanceof Error ? err.message : String(err)}`,
      });
      redirectStatuses.push({ fromPath: primaryFrom, toPath: cand.route, status: "broken" });
    }
  }

  let peopleImported = 0;
  for (const person of peopleList) {
    const emailLc = person.email.trim().toLowerCase();
    if (!emailLc) continue;
    try {
      const [row] = await db
        .insert(people)
        .values({ email: emailLc, name: person.name || emailLc, kind: person.kind, notes: person.note ?? "" })
        .onConflictDoNothing()
        .returning({ id: people.id });
      if (!row) {
        unmapped.push({ kind: "email-collision", detail: `${person.email} already exists; skipped` });
        continue;
      }
      peopleImported++;
    } catch (err) {
      unmapped.push({ kind: "person-import-error", detail: `${person.email}: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  const peopleCountAfter = (await db.query.people.findMany({ columns: { id: true } })).length;
  const membershipCountAfter = (await db.query.memberships.findMany({ columns: { id: true } })).length;

  const [receipt] = await db
    .insert(importReceipts)
    .values({
      source,
      tableCounts: { pages: pagesImported, people: peopleImported },
      peopleCountBefore,
      peopleCountAfter,
      membershipCountBefore,
      membershipCountAfter,
      redirectStatuses,
      unmapped,
    })
    .returning({ id: importReceipts.id });

  return { receiptId: receipt!.id };
}
