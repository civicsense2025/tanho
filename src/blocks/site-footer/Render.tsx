import type { BlockNode, RenderCtx } from "../types";
import type { SiteFooterContent } from "./fields";
import type { SiteFooterResolved } from "./resolve";
import styles from "./footer.module.css";

/**
 * Site footer — the `<footer>` landmark holding the chrome sub-blocks (logo,
 * footer-column, social-links, cta-button). Pure container. The `dark` variant
 * uses semantic paper/ink tokens (not the old hardcoded hex). The bottom bar
 * shows the copyright line: the author's override, or the derived
 * "© {year} {site name}" from the resolver.
 */
export function RenderSiteFooter({ content, ctx }: { content: SiteFooterContent; ctx: RenderCtx }) {
  const kids = (content.blocks as BlockNode[]) ?? [];
  const resolved = (content as { _resolved?: SiteFooterResolved })._resolved;
  const derived =
    resolved ? `© ${resolved.year} ${resolved.siteName}`.trim() : "";
  const copyright = content.copyright || derived;

  const cls = [styles.footer, content.dark ? styles.dark : ""].filter(Boolean).join(" ");
  const mainCls = `${styles.main} ${styles[content.layout] ?? ""}`;

  return (
    <footer className={cls}>
      <div className={mainCls}>{ctx.children(kids)}</div>
      {copyright ? (
        <div className={styles.bottom}>
          <span className={styles.copy}>{copyright}</span>
        </div>
      ) : null}
    </footer>
  );
}
