/**
 * Static-vs-dynamic legibility for pages. A page is rendered dynamically
 * (per-request, reads the viewer cookie) only when it has a paywall block —
 * see the catch-all's `hit.page.hasPaywall ? await getViewer() : null`.
 * Every other page is static: cached via "use cache" + cacheLife("max") and
 * served identically to all visitors until an editor publish invalidates it.
 */
export type PageRenderMode = "static" | "dynamic";

export function pageRenderMode(page: { hasPaywall?: boolean }): PageRenderMode {
  return page.hasPaywall ? "dynamic" : "static";
}

/** Short human explainer for tooltips / admin UI. */
export function renderModeHint(mode: PageRenderMode): string {
  return mode === "dynamic"
    ? "Dynamic — has a paywall, so it reads the viewer per request and isn't cached."
    : "Static — cached at build/first-request and served the same to every visitor.";
}
