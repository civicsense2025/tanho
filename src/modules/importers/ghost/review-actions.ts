"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { people, memberships } from "@/modules/people/schema";
import { redirects } from "@/modules/redirects/schema";
import { createPage, deletePage, publishPage } from "@/modules/pages/actions";
import { saveOwnerBlocks } from "@/modules/blocks/actions";
import { getPublishedPage } from "@/modules/pages/queries";
import { importReceipts } from "./schema";
import { parseGhostContentExport, parseGhostMembersCsv, type ParseIssue } from "./parse";
import { mapGhostMember, mapGhostPost, resetBlockIdCounter, type MappedPost, type GhostDryRunSummary } from "./map";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

// NOTE: GhostDryRunSummary is defined in ./map (a non-"use server" module) — a
// "use server" file may ONLY export async functions, so its type can't live here or
// be re-exported through here (Next's Server-Actions bundler would treat the erased
// type as a missing action → a build-time 500 that tsc/vitest can't catch).

/**
 * Parse + map only — no DB write. Lets the operator see exactly what would
 * happen (counts, gate mapping, anything unmappable) before committing to
 * anything, matching this codebase's own natural-key-upsert caution around
 * imports (see modules/portability/import.ts's applySiteImport).
 */
export async function dryRunGhostImport(
  contentJson: unknown,
  membersCsv: string | null,
): Promise<Result<GhostDryRunSummary>> {
  await requireUser("owner");
  resetBlockIdCounter();

  const content = parseGhostContentExport(contentJson);
  if (!content.ok) return { ok: false, error: content.error };

  const issues: ParseIssue[] = [...content.issues];
  const posts: MappedPost[] = [];
  for (const p of content.posts) {
    const { mapped, issues: postIssues } = await mapGhostPost(p);
    posts.push(mapped);
    issues.push(...postIssues);
  }

  let members: ReturnType<typeof mapGhostMember>[] = [];
  if (membersCsv !== null) {
    const parsedMembers = parseGhostMembersCsv(membersCsv);
    if (!parsedMembers.ok) return { ok: false, error: parsedMembers.error };
    issues.push(...parsedMembers.issues);
    members = parsedMembers.members.map(mapGhostMember);
  }

  return {
    ok: true,
    data: {
      postCount: posts.length,
      memberCount: members.length,
      payingMemberCount: members.filter((m) => m.grantMembership).length,
      posts,
      members,
      issues,
    },
  };
}

/**
 * Commit a previously dry-run import: create + publish a page per post
 * (skipping a post whose route is already taken, rather than failing the
 * whole batch), upsert a redirect from the post's old Ghost-style path,
 * import members as people + comp memberships, then write one receipt row
 * summarizing all of it. Idempotent on route/email collisions — re-running
 * on a route or email that already exists skips that item and reports it as
 * `unmapped`, it does not duplicate or overwrite.
 */
export async function commitGhostImport(
  contentJson: unknown,
  membersCsv: string | null,
): Promise<Result<{ receiptId: string }>> {
  const user = await requireUser("owner");
  resetBlockIdCounter();

  const content = parseGhostContentExport(contentJson);
  if (!content.ok) return { ok: false, error: content.error };

  const peopleCountBefore = (await db.query.people.findMany({ columns: { id: true } })).length;
  const membershipCountBefore = (await db.query.memberships.findMany({ columns: { id: true } })).length;

  const unmapped: Array<{ kind: string; detail: string }> = [...content.issues];
  const redirectStatuses: Array<{ fromPath: string; toPath: string; status: "resolved" | "broken" }> = [];
  let postsImported = 0;

  for (const ghostPost of content.posts) {
    const { mapped, issues: postIssues } = await mapGhostPost(ghostPost);
    unmapped.push(...postIssues);

    // Each post is isolated in its own try/catch: one post hitting an
    // unexpected DB error (e.g. a race on the route's unique constraint)
    // must not abort the rest of the batch or skip writing the receipt —
    // matching the "one bad row never aborts the whole import" philosophy
    // already used for the explicit {ok:false} results below.
    try {
      const created = await createPage({
        title: mapped.title,
        slug: mapped.slug,
        route: mapped.route,
        kind: "post",
        status: "draft",
      });
      if (!created.ok) {
        unmapped.push({ kind: "post-route-collision", detail: `"${mapped.title}" (${mapped.route}): ${created.error}` });
        redirectStatuses.push({ fromPath: `/${mapped.slug}/`, toPath: mapped.route, status: "broken" });
        continue;
      }

      const saved = await saveOwnerBlocks("page", created.data!.id, mapped.blocks);
      if (!saved.ok) {
        // The page row from createPage above is otherwise an empty, content-less
        // orphan — delete it so this post is cleanly absent rather than leaving
        // a confusing blank draft page behind for the admin to notice and clean
        // up manually.
        await deletePage(created.data!.id);
        unmapped.push({ kind: "post-content-invalid", detail: `"${mapped.title}" (${mapped.route}): ${saved.error}` });
        redirectStatuses.push({ fromPath: `/${mapped.slug}/`, toPath: mapped.route, status: "broken" });
        continue;
      }
      if (mapped.status === "published") {
        const published = await publishPage(created.data!.id);
        if (!published.ok) {
          await deletePage(created.data!.id);
          unmapped.push({ kind: "post-publish-failed", detail: `"${mapped.title}" (${mapped.route}): ${published.error}` });
          redirectStatuses.push({ fromPath: `/${mapped.slug}/`, toPath: mapped.route, status: "broken" });
          continue;
        }
      }

      // Ghost's default permalink is "/<slug>/" (trailing slash); Lamina's route
      // for the imported page is "/<slug>" (no trailing slash) — a redirect
      // closes that gap for anyone with the old URL bookmarked or indexed.
      const fromPath = `/${mapped.slug}/`;
      await db.insert(redirects).values({ fromPath, toPath: mapped.route, code: 301 }).onConflictDoNothing();

      const publishedPage = await getPublishedPage(mapped.route);
      redirectStatuses.push({
        fromPath,
        toPath: mapped.route,
        status: mapped.status === "published" && publishedPage ? "resolved" : "broken",
      });
      postsImported++;
    } catch (err) {
      unmapped.push({
        kind: "post-import-error",
        detail: `"${mapped.title}" (${mapped.route}): ${err instanceof Error ? err.message : String(err)}`,
      });
      redirectStatuses.push({ fromPath: `/${mapped.slug}/`, toPath: mapped.route, status: "broken" });
    }
  }

  let membersImported = 0;
  if (membersCsv !== null) {
    const parsedMembers = parseGhostMembersCsv(membersCsv);
    if (!parsedMembers.ok) return { ok: false, error: parsedMembers.error };
    unmapped.push(...parsedMembers.issues);

    for (const ghostMember of parsedMembers.members) {
      const mapped = mapGhostMember(ghostMember);
      const emailLc = mapped.email.toLowerCase();
      try {
        // onConflictDoNothing (not a findFirst-then-insert check) so a concurrent
        // writer taking this email between the check and the write can't throw an
        // uncaught unique-constraint error — the insert itself is the atomic guard.
        const [row] = await db
          .insert(people)
          .values({ email: emailLc, name: mapped.name, kind: mapped.kind, notes: mapped.note })
          .onConflictDoNothing()
          .returning({ id: people.id });
        if (!row) {
          unmapped.push({ kind: "member-email-collision", detail: `${mapped.email} already exists; skipped` });
          continue;
        }
        if (mapped.grantMembership) {
          await db.insert(memberships).values({ personId: row.id, tier: "", status: "active" });
        }
        membersImported++;
      } catch (err) {
        unmapped.push({
          kind: "member-import-error",
          detail: `${mapped.email}: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  }

  const peopleCountAfter = (await db.query.people.findMany({ columns: { id: true } })).length;
  const membershipCountAfter = (await db.query.memberships.findMany({ columns: { id: true } })).length;

  const [receipt] = await db
    .insert(importReceipts)
    .values({
      source: "ghost",
      tableCounts: { posts: postsImported, members: membersImported },
      peopleCountBefore,
      peopleCountAfter,
      membershipCountBefore,
      membershipCountAfter,
      redirectStatuses,
      unmapped,
    })
    .returning({ id: importReceipts.id });

  await writeAudit({
    userId: user.id,
    action: "import.ghost",
    ownerType: "import_receipt",
    ownerId: receipt!.id,
    meta: { postsImported, membersImported },
  });

  return { ok: true, data: { receiptId: receipt!.id } };
}
