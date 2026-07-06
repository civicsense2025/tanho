import { createEntry, saveEntryDraftBlocks, publishEntryBlocks, deleteEntry } from "@/modules/entries/actions";
import { saveCustomType } from "@/modules/custom-types/actions";
import type { WxrItem } from "./parse";
import { mapItemBody, normalizeSlug, mapStatus, type WxrMapOptions } from "./map";
import { commentsTypeInput, cptTypeInput, mapCommentToEntryData, mapCptItemToEntryData, COMMENTS_SLUG } from "./custom-types-def";
import type { ItemPreprocessor } from "./preprocess";

/** A mutable issue sink shared with the commit engine's receipt. */
type Unmapped = Array<{ kind: string; detail: string }>;

/** Post types that are never their own OYS content: post/page are handled as
 *  pages; attachment/nav_menu_item carry no first-class content. */
export const NON_CPT_TYPES = new Set(["post", "page", "attachment", "nav_menu_item"]);

/** Union of postmeta keys seen across a CPT group's items. */
export function metaKeysFor(items: WxrItem[]): string[] {
  const keys = new Set<string>();
  for (const it of items) for (const m of it.postmeta) if (m.key) keys.add(m.key);
  return [...keys];
}

/** Group items by post type, keeping only the custom (non-built-in) types. */
export function groupCpts(items: WxrItem[]): Map<string, WxrItem[]> {
  const groups = new Map<string, WxrItem[]>();
  for (const it of items) {
    if (NON_CPT_TYPES.has(it.postType) || !it.postType) continue;
    const g = groups.get(it.postType) ?? [];
    g.push(it);
    groups.set(it.postType, g);
  }
  return groups;
}

/**
 * Import every `wp:comment` as a `custom:comment` entry (auto-creating the
 * "Comments" content type first). Returns the number imported. The type is
 * saved BEFORE any entry is created — `createEntry` validates the comment's
 * `data` against the type's schema, resolved through the custom-types cache
 * that `saveCustomType`'s `updateTag` refreshes read-your-writes within this
 * request. Never pre-read the type before saving it.
 */
export async function importComments(items: WxrItem[], unmapped: Unmapped): Promise<number> {
  const commentTasks = items.flatMap((it) =>
    it.status === "trash" ? [] : it.comments.map((comment) => ({ comment, sourceItem: it })),
  );
  if (commentTasks.length === 0) return 0;

  const typeResult = await saveCustomType(commentsTypeInput());
  if (!typeResult.ok) {
    unmapped.push({ kind: "comments-type-failed", detail: `Could not create the Comments type: ${typeResult.error}` });
    return 0;
  }

  let imported = 0;
  for (const { comment, sourceItem } of commentTasks) {
    // source_post = the item's normalized page slug (what the reader navigates
    // to); a deterministic entry slug makes re-runs idempotent.
    const postSlug = normalizeSlug(sourceItem.slug, sourceItem.title, sourceItem.postId).slug;
    const data = mapCommentToEntryData(comment, postSlug);
    const entrySlug = `comment-${sourceItem.postId || "x"}-${comment.id || String(imported)}`;
    try {
      const created = await createEntry({
        type: `custom:${COMMENTS_SLUG}`,
        slug: entrySlug,
        title: (comment.content || "Comment").slice(0, 80) || "Comment",
        status: "published",
        sortOrder: 0,
        data,
      });
      if (!created.ok) {
        unmapped.push({ kind: "comment-skipped", detail: `Comment ${comment.id}: ${created.error}` });
        continue;
      }
      imported++;
    } catch (err) {
      unmapped.push({ kind: "comment-import-error", detail: `Comment ${comment.id}: ${err instanceof Error ? err.message : String(err)}` });
    }
  }
  return imported;
}

/**
 * Import every custom-post-type item as an entry of an auto-created custom
 * type: for each CPT group, save the type (fields derived from its postmeta),
 * then create one entry per item with its `content:encoded` as a block tree.
 * Returns the number of entries imported. Same save-type-before-entries
 * ordering rule as importComments.
 */
export async function importCustomPostTypes(
  items: WxrItem[],
  mapOptions: WxrMapOptions,
  preprocessItem: ItemPreprocessor,
  unmapped: Unmapped,
): Promise<number> {
  let imported = 0;
  for (const [type, groupItems] of groupCpts(items)) {
    const live = groupItems.filter((i) => i.status !== "trash");
    if (live.length === 0) continue;

    const typeInput = cptTypeInput(type, metaKeysFor(live));
    if (typeInput.reserved) {
      unmapped.push({ kind: "cpt-slug-reserved", detail: `Custom post type "${type}" renamed to "${typeInput.slug}" to avoid a built-in name` });
    }
    const { reserved, ...typePayload } = typeInput;
    void reserved;
    const typeResult = await saveCustomType(typePayload);
    if (!typeResult.ok) {
      unmapped.push({ kind: "cpt-type-failed", detail: `Could not create type "${type}": ${typeResult.error}` });
      continue;
    }

    for (const item of live) {
      const { slug: entrySlug, changed } = normalizeSlug(item.slug, item.title, item.postId);
      if (changed) unmapped.push({ kind: "slug-normalized", detail: `"${item.title}" slug normalized to "${entrySlug}"` });
      const { status } = mapStatus(item.status, item.title);
      const data = mapCptItemToEntryData(item, typePayload.fields);
      try {
        const created = await createEntry({
          type: `custom:${typePayload.slug}`,
          slug: entrySlug,
          title: item.title || entrySlug,
          status: "draft",
          sortOrder: Number(item.menuOrder) || 0,
          data,
        });
        if (!created.ok) {
          unmapped.push({ kind: "cpt-entry-failed", detail: `"${item.title}" (${type}): ${created.error}` });
          continue;
        }
        const { item: preppedCpt, issues: preIssues } = preprocessItem(item);
        unmapped.push(...preIssues);
        const body = await mapItemBody(preppedCpt.contentHtml, mapOptions);
        const savedBlocks = await saveEntryDraftBlocks(created.data!.id, body.blocks);
        if (!savedBlocks.ok) {
          await deleteEntry(created.data!.id);
          unmapped.push({ kind: "cpt-entry-content-invalid", detail: `"${item.title}" (${type}): ${savedBlocks.error}` });
          continue;
        }
        unmapped.push(...body.issues);
        if (status === "published") {
          const published = await publishEntryBlocks(created.data!.id);
          if (!published.ok) {
            await deleteEntry(created.data!.id);
            unmapped.push({ kind: "cpt-entry-publish-failed", detail: `"${item.title}" (${type}): ${published.error}` });
            continue;
          }
        }
        imported++;
      } catch (err) {
        unmapped.push({ kind: "cpt-entry-error", detail: `"${item.title}" (${type}): ${err instanceof Error ? err.message : String(err)}` });
      }
    }
  }
  return imported;
}
