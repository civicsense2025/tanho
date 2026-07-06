import { EDITOR_PLACEHOLDER_STYLE } from "../bound-common";
import type { RenderCtx } from "../types";
import { breadcrumb } from "@/modules/seo/jsonld";
import { JsonLd } from "@/modules/seo/JsonLdScript";
import type { BreadcrumbsContent } from "./fields";
import styles from "./breadcrumbs.module.css";

const SEP: Record<string, string> = {
  slash: '"/"',
  chevron: '"›"',
  dot: '"·"',
  arrow: '"→"',
};

/**
 * Breadcrumb trail from the current page's published ancestor chain
 * (`ctx.page`, resolved by the page route via `getPageAncestors`). Renders a
 * semantic `<nav aria-label="Breadcrumb"><ol>` with `aria-current="page"` on
 * the leaf, and emits schema.org BreadcrumbList JSON-LD through the existing
 * `breadcrumb()` builder — activating structured data that already exists but
 * wasn't wired into the render path.
 */
export function RenderBreadcrumbs({
  content,
  ctx,
}: {
  content: BreadcrumbsContent;
  ctx: RenderCtx;
}) {
  const page = ctx.page;

  if (!page) {
    // Editor preview (no page context): a quiet placeholder.
    if (ctx.mode === "editor") {
      return (
        <div style={EDITOR_PLACEHOLDER_STYLE}>Breadcrumbs — Home › … › this page</div>
      );
    }
    return null;
  }

  // Build the ordered crumb list: [home?] → ancestors → current?
  const crumbs: Array<{ name: string; path: string; isCurrent: boolean }> = [];
  if (content.showHome) crumbs.push({ name: content.homeLabel, path: "/", isCurrent: false });
  for (const a of page.ancestors) crumbs.push({ name: a.title, path: a.route, isCurrent: false });
  if (content.showCurrent) crumbs.push({ name: page.title, path: page.route, isCurrent: true });

  // A trail needs at least two crumbs to BE a trail — a lone "Home" (or lone
  // current page) is meaningless markup plus a degenerate 1-item JSON-LD.
  if (crumbs.length < 2) return null;

  // BreadcrumbList JSON-LD from the same crumbs (schema.org expects the full
  // trail including the current page).
  const jsonLd = breadcrumb(
    crumbs.map((c) => ({ name: c.name, path: c.path })),
    { siteName: page.siteName, siteUrl: page.siteUrl },
  );

  return (
    <nav
      className={styles.nav}
      aria-label="Breadcrumb"
      style={{ ["--sep" as never]: SEP[content.separator] ?? SEP.chevron }}
    >
      <JsonLd schema={jsonLd} />
      <ol className={styles.list}>
        {crumbs.map((c) => (
          <li key={c.path} className={styles.crumb}>
            {c.isCurrent ? (
              <span className={styles.current} aria-current="page">
                {c.name}
              </span>
            ) : (
              <a className={styles.link} href={c.path}>
                {c.name}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
