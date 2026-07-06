import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { people } from "@/modules/people/schema";
import { redirects } from "@/modules/redirects/schema";
import { createPage, deletePage, publishPage } from "@/modules/pages/actions";
import { saveOwnerBlocks } from "@/modules/blocks/actions";
import { getPublishedPage } from "@/modules/pages/queries";
import { importReceipts } from "@/modules/importers/ghost/schema";
import { parseWxr, type ParseIssue, type WxrItem } from "./parse";
import { mapWxrItemToPage, mapWxrAuthor, resetBlockIdCounter, type MappedItem, type WxrMapOptions } from "./map";
import { cptTypeInput } from "./custom-types-def";
import { identityPreprocess, type ItemPreprocessor } from "./preprocess";
import { groupCpts, metaKeysFor, importComments, importCustomPostTypes } from "./import-custom-types";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Import source — the value written to `importReceipts.source` and the audit
 *  action. Both WXR-format importers share this engine; only the label differs. */
export type WxrSource = "wordpress" | "squarespace";

export type WxrImportOptions = {
  /** Import each `wp:comment` as a `custom:comment` entry (auto-creates the type). */
  importComments: boolean;
  /** Import each non-post/page custom-post-type item as a custom-type entry. */
  importCustomPostTypes: boolean;
};

export type { ItemPreprocessor };

export type DetectedCpt = { type: string; slug: string; count: number; fields: string[] };

export type WxrDryRunSummary = {
  postCount: number;
  pageCount: number;
  authorCount: number;
  commentCount: number;
  detectedCpts: DetectedCpt[];
  attachmentCount: number;
  issues: ParseIssue[];
};

/** Extract the pathname of an item's original permalink for the 301 redirect.
 *  Falls back to "/<slug>/" (WP's default permalink shape) when `<link>` is
 *  missing or relative. */
function redirectFromPath(item: WxrItem, slug: string): string {
  if (item.link) {
    try {
      return new URL(item.link).pathname || `/${slug}/`;
    } catch {
      // Not an absolute URL — fall through to the reconstructed default.
    }
  }
  return `/${slug}/`;
}

/**
 * Parse + map only, no DB writes — lets the operator preview counts and
 * anything that would be created/renamed before committing. Mirrors the Ghost
 * importer's dryRun*. Crucially, this does NOT call saveCustomType/createEntry,
 * so a dry run never touches the database (and never trips the custom-type
 * cache-timing path).
 */
export async function dryRunWxrImport(
  xml: string,
  options: WxrImportOptions,
  mapOptions: WxrMapOptions,
  preprocessItem: ItemPreprocessor = identityPreprocess,
): Promise<Result<WxrDryRunSummary>> {
  await requireUser("owner");
  resetBlockIdCounter();

  const parsed = parseWxr(xml);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const issues: ParseIssue[] = [...parsed.issues];
  let postCount = 0;
  let pageCount = 0;
  let attachmentCount = 0;
  let commentCount = 0;

  for (const rawItem of parsed.items) {
    if (rawItem.status === "trash") continue;
    if (rawItem.postType === "attachment") {
      attachmentCount++;
      continue;
    }
    if (rawItem.postType === "nav_menu_item") continue;
    if (rawItem.postType === "post" || rawItem.postType === "page") {
      const { item, issues: preIssues } = preprocessItem(rawItem);
      issues.push(...preIssues);
      const { mapped, issues: itemIssues } = await mapWxrItemToPage(item, mapOptions);
      issues.push(...itemIssues);
      if (mapped.kind === "page") pageCount++;
      else postCount++;
      commentCount += item.comments.length;
    }
  }

  const detectedCpts: DetectedCpt[] = [];
  if (options.importCustomPostTypes) {
    for (const [type, items] of groupCpts(parsed.items)) {
      const live = items.filter((i) => i.status !== "trash");
      if (live.length === 0) continue;
      const { slug, fields } = cptTypeInput(type, metaKeysFor(live));
      detectedCpts.push({ type, slug, count: live.length, fields: fields.map((f) => f.key) });
      for (const it of live) commentCount += it.comments.length;
    }
  }

  const authorCount = parsed.authors.filter((a) => mapWxrAuthor(a) !== null).length;

  return {
    ok: true,
    data: {
      postCount,
      pageCount,
      authorCount,
      commentCount: options.importComments ? commentCount : 0,
      detectedCpts,
      attachmentCount,
      issues,
    },
  };
}

/** Create + (optionally) publish one page for a post/page item, plus its 301
 *  redirect. Returns the outcome for the receipt. */
async function commitPageItem(
  item: WxrItem,
  mapped: MappedItem,
  unmapped: Array<{ kind: string; detail: string }>,
  redirectStatuses: Array<{ fromPath: string; toPath: string; status: "resolved" | "broken" }>,
): Promise<"imported" | "skipped"> {
  const fromPath = redirectFromPath(item, mapped.slug);
  const label = mapped.kind === "page" ? "page" : "post";

  const created = await createPage({
    title: mapped.title,
    slug: mapped.slug,
    route: mapped.route,
    kind: mapped.kind,
    status: "draft",
    tags: mapped.tags,
  });
  if (!created.ok) {
    unmapped.push({ kind: `${label}-route-collision`, detail: `"${mapped.title}" (${mapped.route}): ${created.error}` });
    redirectStatuses.push({ fromPath, toPath: mapped.route, status: "broken" });
    return "skipped";
  }

  const saved = await saveOwnerBlocks("page", created.data!.id, mapped.blocks);
  if (!saved.ok) {
    // Delete the otherwise-empty page so a content-save failure doesn't leave
    // a confusing blank draft behind (mirrors the Ghost importer).
    await deletePage(created.data!.id);
    unmapped.push({ kind: `${label}-content-invalid`, detail: `"${mapped.title}" (${mapped.route}): ${saved.error}` });
    redirectStatuses.push({ fromPath, toPath: mapped.route, status: "broken" });
    return "skipped";
  }

  if (mapped.status === "published") {
    const published = await publishPage(created.data!.id);
    if (!published.ok) {
      await deletePage(created.data!.id);
      unmapped.push({ kind: `${label}-publish-failed`, detail: `"${mapped.title}" (${mapped.route}): ${published.error}` });
      redirectStatuses.push({ fromPath, toPath: mapped.route, status: "broken" });
      return "skipped";
    }
  }

  await db.insert(redirects).values({ fromPath, toPath: mapped.route, code: 301 }).onConflictDoNothing();
  const publishedPage = mapped.status === "published" ? await getPublishedPage(mapped.route) : null;
  redirectStatuses.push({
    fromPath,
    toPath: mapped.route,
    status: mapped.status === "published" && publishedPage ? "resolved" : "broken",
  });
  return "imported";
}

/**
 * Commit a WXR import: pages/posts → OYS pages + blocks (+ redirects), authors
 * → people, and (behind toggles) comments → a `custom:comment` type + entries
 * and custom post types → auto-created custom types + entries (both handled in
 * import-custom-types.ts). One receipt row summarizes it all. Each item is
 * isolated in its own try/catch so one failure never aborts the batch.
 * Idempotent on route/email/entry-slug collisions.
 */
export async function commitWxrImport(
  xml: string,
  options: WxrImportOptions,
  mapOptions: WxrMapOptions,
  source: WxrSource,
  preprocessItem: ItemPreprocessor = identityPreprocess,
): Promise<Result<{ receiptId: string }>> {
  const user = await requireUser("owner");
  resetBlockIdCounter();

  const parsed = parseWxr(xml);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const peopleCountBefore = (await db.query.people.findMany({ columns: { id: true } })).length;
  const membershipCountBefore = (await db.query.memberships.findMany({ columns: { id: true } })).length;

  const unmapped: Array<{ kind: string; detail: string }> = [...parsed.issues];
  const redirectStatuses: Array<{ fromPath: string; toPath: string; status: "resolved" | "broken" }> = [];

  let postsImported = 0;
  let pagesImported = 0;
  let authorsImported = 0;
  let attachmentCount = 0;

  // ── Step 1: posts + pages ──────────────────────────────────────────────
  for (const item of parsed.items) {
    if (item.status === "trash") {
      unmapped.push({ kind: "trashed-skipped", detail: `"${item.title}" was in the trash; skipped` });
      continue;
    }
    if (item.postType === "attachment") {
      attachmentCount++;
      continue;
    }
    if (item.postType === "nav_menu_item") continue;
    if (item.postType !== "post" && item.postType !== "page") continue; // CPTs handled in step 4

    const { item: prepped, issues: preIssues } = preprocessItem(item);
    unmapped.push(...preIssues);
    const { mapped, issues: itemIssues } = await mapWxrItemToPage(prepped, mapOptions);
    unmapped.push(...itemIssues);
    try {
      const outcome = await commitPageItem(prepped, mapped, unmapped, redirectStatuses);
      if (outcome === "imported") {
        if (mapped.kind === "page") pagesImported++;
        else postsImported++;
      }
    } catch (err) {
      unmapped.push({
        kind: "item-import-error",
        detail: `"${mapped.title}" (${mapped.route}): ${err instanceof Error ? err.message : String(err)}`,
      });
      redirectStatuses.push({ fromPath: redirectFromPath(item, mapped.slug), toPath: mapped.route, status: "broken" });
    }
  }

  // ── Step 2: authors → people ───────────────────────────────────────────
  for (const author of parsed.authors) {
    const mappedAuthor = mapWxrAuthor(author);
    if (!mappedAuthor) {
      unmapped.push({ kind: "author-no-email", detail: `Author "${author.displayName || author.login}" has no email; skipped` });
      continue;
    }
    try {
      const [row] = await db
        .insert(people)
        .values({ email: mappedAuthor.email, name: mappedAuthor.name, kind: mappedAuthor.kind, notes: `Imported from ${source}` })
        .onConflictDoNothing()
        .returning({ id: people.id });
      if (!row) {
        unmapped.push({ kind: "author-email-collision", detail: `${mappedAuthor.email} already exists; skipped` });
        continue;
      }
      authorsImported++;
    } catch (err) {
      unmapped.push({ kind: "author-import-error", detail: `${mappedAuthor.email}: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  // ── Steps 3 & 4: comments + custom post types (opt-in) ─────────────────
  const commentsImported = options.importComments ? await importComments(parsed.items, unmapped) : 0;
  const cptEntriesImported = options.importCustomPostTypes
    ? await importCustomPostTypes(parsed.items, mapOptions, preprocessItem, unmapped)
    : 0;

  // ── Step 5: attachments (not imported; one summary issue) ──────────────
  if (attachmentCount > 0) {
    unmapped.push({
      kind: "attachments-skipped",
      detail: `${attachmentCount} attachment item(s) were not imported (media is kept as remote URLs).`,
    });
  }

  // ── Step 6: receipt + audit ────────────────────────────────────────────
  const peopleCountAfter = (await db.query.people.findMany({ columns: { id: true } })).length;
  const membershipCountAfter = (await db.query.memberships.findMany({ columns: { id: true } })).length;

  const tableCounts: Record<string, number> = { posts: postsImported, pages: pagesImported, authors: authorsImported };
  if (options.importComments) tableCounts.comments = commentsImported;
  if (options.importCustomPostTypes) tableCounts.custom_entries = cptEntriesImported;

  const [receipt] = await db
    .insert(importReceipts)
    .values({
      source,
      tableCounts,
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
    action: `import.${source}`,
    ownerType: "import_receipt",
    ownerId: receipt!.id,
    meta: { postsImported, pagesImported, authorsImported, commentsImported, cptEntriesImported },
  });

  return { ok: true, data: { receiptId: receipt!.id } };
}
