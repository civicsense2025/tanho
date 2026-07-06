import "server-only";
import { search } from "@/adapters/search";
import type { SearchDocumentType, SearchHit } from "@/adapters/types";
import { resolveEntitlement } from "@/modules/entitlements/gate";
import type { RenderViewer } from "@/blocks/types";

/** A hit ready to render — locked/unlocked has already been resolved against the REAL viewer. */
export type SearchResult = {
  title: string;
  path: string;
  snippet: string;
  type: SearchDocumentType;
  /** True when the viewer does NOT currently pass this document's stored gate — show a lock glyph, same convention as postlist/resolve.ts's `locked`. */
  locked: boolean;
};

const MAX_RESULTS = 20;

/**
 * The query-time half of search's paywall safety story (see adapters/types.ts's
 * SearchDocument doc comment): `search.search()` returns hits with a gate that
 * was resolved and cached at INDEX time — it is never trusted as the final
 * word. Every hit's stored gate is re-resolved here against the REAL, current
 * viewer (resolveEntitlement — the same async, full-Gate-shape resolver
 * modules/entitlements/gate.ts already uses for pack purchases), exactly like
 * a page render re-checks viewerPassesPaywall rather than trusting a cached
 * flag. A locked hit still shows its title/path/snippet (a locked postlist
 * row still shows its title — search results work the same way: the reader
 * sees WHAT exists, gated by a lock glyph, and finds out they need to sign in
 * or upgrade by clicking through, not by search silently omitting the result).
 */
export async function searchPublished(rawQuery: string, viewer: RenderViewer): Promise<SearchResult[]> {
  const hits = await search.search(rawQuery, { limit: MAX_RESULTS });
  return Promise.all(hits.map((hit) => toResult(hit, viewer)));
}

async function toResult(hit: SearchHit, viewer: RenderViewer): Promise<SearchResult> {
  const locked = hit.document.gate ? !(await resolveEntitlement(viewer, hit.document.gate)).passed : false;
  return {
    title: hit.document.title,
    path: hit.document.path,
    snippet: hit.snippet,
    type: hit.document.type,
    locked,
  };
}
