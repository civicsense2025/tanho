import { search } from "@/adapters/search";
import type { SearchDocumentType } from "@/adapters/types";
import type { BlockNode } from "@/blocks/types";
import { resolveTreeGate } from "@/modules/pages/blocks-io";
import { indexBlockTree } from "./extract";

/**
 * Publish-time indexing hooks — one function per content type, called from
 * that type's own publish action (modules/pages/actions.ts's `publishPage`,
 * modules/entries/actions.ts's `publishEntryBlocks`, modules/commerce/
 * product-actions.ts's `createProduct`/`updateProduct`/
 * `publishProductBlocks`) and delete action. Mirrors the existing
 * `rebuildMediaUsage(ownerType, id, route, blocks)` call already made at
 * every one of those same call sites — same shape, same "recompute a
 * derived artifact from the just-published tree" idea, just for search
 * instead of media references.
 *
 * Scope: indexes each document's TITLE (the entity's own name/title field)
 * plus its BLOCK-TREE body (via indexBlockTree, which already limits body
 * text to what an anonymous viewer can see — see that file's own doc
 * comment). Entity `data` JSON fields (e.g. a resource's `summary`) are NOT
 * indexed in this pass — that's a per-entity-schema field-extraction
 * concern, deliberately out of scope for the core block-tree search feature
 * this module builds; every content type still gets full-text search over
 * its title + page-content body uniformly.
 *
 * A document with an empty title AND empty body (e.g. a fresh page with no
 * content yet) is still indexed — an empty/near-empty document just never
 * matches a real query, which is harmless and simpler than special-casing
 * "skip empty documents" for no real benefit.
 */
function documentId(type: SearchDocumentType, sourceId: string): string {
  return `${type}:${sourceId}`;
}

export async function indexPage(input: {
  id: string;
  route: string;
  title: string;
  blocks: BlockNode[];
}): Promise<void> {
  await search.index({
    id: documentId("page", input.id),
    type: "page",
    sourceId: input.id,
    title: input.title,
    body: indexBlockTree(input.blocks),
    path: input.route,
    gate: resolveTreeGate(input.blocks),
    updatedAt: Date.now(),
  });
}

export async function removePageFromIndex(id: string): Promise<void> {
  await search.remove(documentId("page", id));
}

/**
 * `entryType` decides whether this entry is indexable at all: taxonomy-only
 * types (hub/platform/matrix_pair/block_pack/design_pack — see
 * entities/types.ts's `taxonomy` flag) are never real standalone public
 * content, so indexing them would surface search hits for internal
 * organizational records rather than genuine pages. An entity type with no
 * registered schema (a deleted custom type) is skipped the same way.
 *
 * `getEntitySchema` is imported dynamically, HERE ONLY (not at this file's
 * module top level), because `@/entities/registry-async` starts with
 * `import "server-only"` — a Next.js bundler-only marker package with no
 * real npm resolution outside Next's build, which throws under plain
 * Vitest. Keeping the import scoped to this function means importing
 * indexPage/indexProduct (which never need it) doesn't transitively trip
 * that resolution failure — this matters in practice: the Ghost importer's
 * own test suite (review-actions.test.ts) calls the real publishPage
 * end-to-end, and previously had no reason to touch entity-schema lookups
 * at all.
 */
export async function indexEntry(input: {
  id: string;
  entryType: string;
  slug: string;
  title: string;
  blocks: BlockNode[];
}): Promise<void> {
  const { getEntitySchema } = await import("@/entities/registry-async");
  const schema = await getEntitySchema(input.entryType);
  if (!schema || schema.taxonomy) return;

  await search.index({
    id: documentId("entry", input.id),
    type: "entry",
    sourceId: input.id,
    title: input.title,
    body: indexBlockTree(input.blocks),
    path: `${schema.basePath}/${input.slug}`,
    gate: resolveTreeGate(input.blocks),
    updatedAt: Date.now(),
  });
}

export async function removeEntryFromIndex(id: string): Promise<void> {
  await search.remove(documentId("entry", id));
}

/**
 * Products carry no paywall/gate concept anywhere in their schema (see
 * modules/commerce/schema.ts — always public storefront listings), so `gate`
 * is unconditionally null. Called ONLY from publishProductBlocks, not
 * createProduct/updateProduct — a product's own row (name/slug/price/etc.)
 * has no separate publish step, but its optional page-content BLOCKS do
 * (mirrors pages/entries exactly), and those blocks are the only thing this
 * function needs beyond the row's own name/slug. A brand-new product with no
 * content published yet simply isn't in the index until its first publish —
 * consistent with how hasPaywall/media-usage rebuilding are already scoped
 * to the publish step alone for every content type.
 */
export async function indexProduct(input: {
  id: string;
  slug: string;
  name: string;
  blocks: BlockNode[];
}): Promise<void> {
  await search.index({
    id: documentId("product", input.id),
    type: "product",
    sourceId: input.id,
    title: input.name,
    body: indexBlockTree(input.blocks),
    path: `/shop/${input.slug}`,
    gate: null,
    updatedAt: Date.now(),
  });
}

export async function removeProductFromIndex(id: string): Promise<void> {
  await search.remove(documentId("product", id));
}

/**
 * Content-type rows (the table-backed custom types — see
 * modules/content-schema) index through a dedicated `content` document type.
 * Unlike pages/entries/products, a row has no block tree of its own by default
 * — its searchable BODY is the concatenation of its own text-ish field values
 * (text/richtext/url/email/select + tags/list values), so a row is findable by
 * its content even without a detail template. `gate` is null in v1 (content-row
 * gating lives in the owner's detail template, not the row).
 *
 * The document id is `content:{type.id}:{slugField}` (NOT the row's own id) so
 * reindex/prune can reason by the stable public slug, and the path points at
 * the row's public detail route `{basePath}/{slug}`.
 */
export type ContentIndexType = {
  id: string;
  basePath: string | null;
  titleField: string | null;
  slugField: string | null;
  fields: Array<{ key: string; kind: string; hidden?: boolean }>;
};

/** Field kinds whose values are worth putting in the search body. */
const TEXTISH_KINDS = new Set(["text", "richtext", "url", "email", "select", "tags"]);

/** Stable content doc id for a row identified by its public slug. Exported for
 *  unit tests (pure — no DB). */
export function contentDocumentId(typeId: string, slug: string): string {
  return `content:${typeId}:${slug}`;
}

/** Concatenate a row's text-ish field values into one plain-text body string.
 *  Exported for unit tests (pure — hidden fields excluded here, no DB). */
export function contentBody(type: ContentIndexType, row: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const f of type.fields) {
    if (f.hidden) continue; // internal fields never enter the search index
    if (!TEXTISH_KINDS.has(f.kind)) continue;
    const v = row[f.key];
    if (v == null) continue;
    if (Array.isArray(v)) parts.push(v.map(String).join(" "));
    else parts.push(String(v));
  }
  return parts.join("\n").trim();
}

export async function indexContentRow(
  type: ContentIndexType,
  row: Record<string, unknown>,
): Promise<void> {
  const slugField = type.slugField ?? "slug";
  const titleField = type.titleField ?? "title";
  const slug = String(row[slugField] ?? "");
  if (!slug || !type.basePath) return;
  await search.index({
    id: contentDocumentId(type.id, slug),
    type: "content",
    sourceId: String(row.id ?? slug),
    title: String(row[titleField] ?? "") || slug,
    body: contentBody(type, row),
    path: `${type.basePath}/${slug}`,
    gate: null,
    updatedAt: Date.now(),
  });
}

export async function removeContentRow(type: ContentIndexType, rowSlug: string): Promise<void> {
  await search.remove(contentDocumentId(type.id, rowSlug));
}

/**
 * Re-index every published row of a content type, upserting each by its stable
 * `content:{type.id}:{slug}` id. Rows passed in by the caller (which already
 * listed them — the module owning content-schema queries can't be imported here
 * without a server-only cycle). Upsert-by-slug means a re-run is idempotent;
 * a row deleted since the last index must be pruned via `removeContentRow` at
 * delete time (the adapter has no prefix-enumeration API to discover orphaned
 * ids here — see the integration note in the handoff).
 */
export async function reindexContentType(
  type: ContentIndexType,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  for (const row of rows) await indexContentRow(type, row);
}
