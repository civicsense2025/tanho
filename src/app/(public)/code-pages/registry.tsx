import type { ComponentType } from "react";
import { AboutExample } from "./examples/AboutExample";

/**
 * Code-defined page registry — the escape hatch for pages a developer wants
 * to author as a real server component instead of the block editor (custom
 * layouts, bespoke data fetching, anything the block system can't express).
 *
 * HOW TO ADD ONE:
 *   1. Write a server component under `code-pages/examples/` (or a new
 *      subfolder). Keep it static: never read `cookies()`/`getViewer()` —
 *      the whole point is that these pages stay on the fast, cached path.
 *      If you truly need per-request data, wrap the dynamic part in
 *      <Suspense> rather than making the whole page dynamic.
 *   2. Add an entry to CODE_PAGES below with a `route` that doesn't collide
 *      with a CMS page, an entity route (/work, /guides, /resources), or a
 *      shop route (/shop). resolveCodePage is checked before those, so a
 *      colliding route would shadow real content.
 *   3. That's it — the catch-all in `[[...slug]]/page.tsx` renders it and
 *      uses `title`/`description` for generateMetadata.
 *
 * These pages are read-only from the admin's perspective: they show up as
 * informational rows in the Pages list (see modules/pages/admin/PagesList),
 * but there is nothing to edit or publish — the source file is the content.
 */
export type CodePage = {
  route: string;
  Component: ComponentType;
  title?: string;
  description?: string;
};

export const CODE_PAGES: CodePage[] = [
  {
    route: "/hello-code",
    Component: AboutExample,
    title: "Hello, code page",
    description: "A worked example of a code-defined (server component) public page.",
  },
];

export function resolveCodePage(route: string): CodePage | null {
  return CODE_PAGES.find((p) => p.route === route) ?? null;
}

/**
 * Serializable summary (no Component fn) — safe to pass from a server component
 * into a client one, e.g. the admin Pages list. A React component can't cross
 * the server/client boundary as a prop.
 */
export type CodePageSummary = { route: string; title?: string; description?: string };

export function codePageSummaries(): CodePageSummary[] {
  return CODE_PAGES.map(({ route, title, description }) => ({ route, title, description }));
}
