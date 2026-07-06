import type { ReactNode } from "react";
import type { MenuItem } from "@/modules/menus/validation";
import type { RenderCtx } from "../types";
import { ChromeLink } from "../ChromeLink";
import type { NavMenuContent } from "./fields";
import type { NavMenuResolved } from "./resolve";
import styles from "./nav.module.css";

const VARIANT_CLASS: Record<NavMenuContent["variant"], string> = {
  plain: "",
  underline: styles.underline,
  tabs: styles.tabs,
  pill: styles.pill,
  vertical: "",
};

/** Desktop dropdown — four styles driven by the item's dropdownStyle. Pure port
 *  of DropdownPanel; visibility is CSS-only (:hover / :focus-within). */
function Dropdown({ item }: { item: MenuItem }) {
  const kids = item.children ?? [];
  const style = item.dropdownStyle ?? "simple";
  const Tile = (k: MenuItem) => (
    <span className={styles.ddTile} aria-hidden="true">
      {k.icon || k.label.slice(0, 1).toUpperCase() || "·"}
    </span>
  );

  if (style === "mega") {
    const groups = new Map<string, MenuItem[]>();
    for (const k of kids) {
      const g = k.group ?? "";
      groups.set(g, [...(groups.get(g) ?? []), k]);
    }
    return (
      <div className={`${styles.dd} ${styles.ddMega}`}>
        {[...groups.entries()].map(([g, list]) => (
          <div key={g || "·"} className={styles.ddCol}>
            {g ? <span className={styles.ddGroup}>{g}</span> : null}
            {list.map((k) => (
              <ChromeLink key={k.id} href={k.href} className={styles.ddLink}>
                {k.label}
              </ChromeLink>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (style === "cards") {
    return (
      <div className={`${styles.dd} ${styles.ddCards}`}>
        {kids.map((k) => (
          <ChromeLink key={k.id} href={k.href} className={styles.ddCard}>
            {Tile(k)}
            <span className={styles.ddCardBody}>
              <span className={styles.ddCardTitle}>{k.label}</span>
              {k.desc ? <span className={styles.ddDesc}>{k.desc}</span> : null}
            </span>
          </ChromeLink>
        ))}
      </div>
    );
  }
  if (style === "icons") {
    return (
      <div className={`${styles.dd} ${styles.ddIcons}`}>
        {kids.map((k) => (
          <ChromeLink key={k.id} href={k.href} className={styles.ddIconRow}>
            {Tile(k)}
            <span>{k.label}</span>
          </ChromeLink>
        ))}
      </div>
    );
  }
  return (
    <div className={`${styles.dd} ${styles.ddSimple}`}>
      {kids.map((k) => (
        <ChromeLink key={k.id} href={k.href} className={styles.ddLink}>
          {k.label}
        </ChromeLink>
      ))}
    </div>
  );
}

/** Vertical sidebar nav: children render inline, always expanded (recursive). */
function verticalItems(list: MenuItem[], depth: number): ReactNode {
  return list.map((item) => (
    <span key={item.id} style={{ display: "contents" }}>
      <ChromeLink
        href={item.href}
        className={styles.vLink}
        style={{ paddingLeft: 10 + depth * 16 }}
        data-nav-href={item.href}
      >
        {item.label}
      </ChromeLink>
      {item.children?.length ? verticalItems(item.children, depth + 1) : null}
    </span>
  ));
}

/** Mobile list — nested groups use a no-JS <details> disclosure. */
function MobileList({ items }: { items: MenuItem[] }) {
  return (
    <ul className={styles.mobileList}>
      {items.map((item) =>
        item.children?.length ? (
          <li key={item.id}>
            <details className={styles.mobileGroup}>
              <summary>
                <ChromeLink href={item.href} className={styles.mobileLink} data-nav-href={item.href}>
                  {item.label}
                </ChromeLink>
                <span className={styles.mobileGroupToggle} aria-hidden>
                  ▾
                </span>
              </summary>
              <MobileList items={item.children} />
            </details>
          </li>
        ) : (
          <li key={item.id}>
            <span className={styles.mobileItemRow}>
              <ChromeLink href={item.href} className={styles.mobileLink} data-nav-href={item.href}>
                {item.label}
              </ChromeLink>
            </span>
          </li>
        ),
      )}
    </ul>
  );
}

/**
 * Navigation menu block. Pure — no hooks. Desktop dropdowns open on CSS
 * :hover/:focus-within (no JS); the mobile control is a native <details> so it
 * works and is crawlable with JavaScript disabled. The menu items come from the
 * server resolver (`_resolved.items` for desktop, respecting `content.slice`;
 * `_resolved.mobileItems` for the mobile burger, always the complete menu —
 * see resolve.ts).
 */
export function RenderNavMenu({
  content,
}: {
  content: NavMenuContent & { _resolved?: NavMenuResolved | null };
  ctx: RenderCtx;
}) {
  const items = content._resolved?.items ?? [];
  const mobileItems = content._resolved?.mobileItems ?? items;
  if (items.length === 0 && mobileItems.length === 0) return null;

  const label = content.ariaLabel || "Primary";

  if (content.variant === "vertical") {
    // A sidebar nav has no separate desktop/mobile split to respect `slice`
    // for — it's the one nav either way, so it always shows the full menu.
    return (
      <nav className={styles.navVertical} aria-label={label}>
        {verticalItems(mobileItems, 0)}
      </nav>
    );
  }

  // Desktop inline nav (hidden ≤720px via CSS). Omitted entirely when `slice`
  // leaves this half empty (e.g. "second-half" of a 1-item menu) — an empty
  // <nav> landmark with a label but no content is a real a11y smell for
  // landmark-navigation screen-reader users, not just visually empty.
  const desktop =
    items.length > 0 ? (
      <nav className={`${styles.nav} ${VARIANT_CLASS[content.variant]}`} aria-label={label}>
        <ul className={styles.navList}>
          {items.map((item) =>
            item.children?.length ? (
              <li key={item.id} className={styles.navItem}>
                {/* Anchor toggles: the label links, the dropdown opens on hover/
                    focus-within. A no-JS bar can't do click-to-open, so the parent
                    stays a real link to its own href. */}
                <ChromeLink
                  href={item.href}
                  className={styles.navLink}
                  aria-haspopup="true"
                  data-nav-href={item.href}
                >
                  {item.label}
                  <span aria-hidden className={styles.chev}>
                    ▾
                  </span>
                </ChromeLink>
                <Dropdown item={item} />
              </li>
            ) : (
              <li key={item.id} className={styles.navItem}>
                <ChromeLink href={item.href} className={styles.navLink} data-nav-href={item.href}>
                  {item.label}
                </ChromeLink>
              </li>
            ),
          )}
        </ul>
      </nav>
    ) : null;

  // Mobile disclosure (shown ≤720px via CSS). A native <details> — no JS, fully
  // crawlable. Exactly one <summary> (spec-valid): the burger. When open it's
  // repositioned as a fixed ✕ over the drawer, so the same control opens and
  // closes it; a decorative scrim sits behind the panel. The panel is a
  // drawer/fullscreen/dropdown per mobileStyle.
  //
  // The shared island (data-mobile-nav) LAYERS drawer niceties over this — Esc
  // to close, scrim tap-to-close, body-scroll-lock, focus-trap — all pure
  // enhancement; with JS off the <details> still opens/closes and every link
  // works. `data-mobile-scrim` marks the tap-to-close target.
  const panelClass =
    content.mobileStyle === "fullscreen"
      ? styles.fullscreen
      : content.mobileStyle === "dropdown"
        ? styles.dropdownPanel
        : content.mobileStyle === "drawer-left"
          ? `${styles.drawer} ${styles.drawerLeft}`
          : `${styles.drawer} ${styles.drawerRight}`;
  const withScrim = content.mobileStyle === "drawer-left" || content.mobileStyle === "drawer-right";
  const lockScroll = content.mobileStyle !== "dropdown"; // drawers + fullscreen cover the page

  const mobile = (
    <details
      className={`${styles.mobile} ${styles[`m_${content.mobileStyle.replace("-", "_")}`] ?? ""}`}
      data-mobile-nav
      {...(lockScroll ? { "data-mobile-lock": "" } : {})}
    >
      <summary className={styles.summary} aria-label={`${label} menu`}>
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
      </summary>
      {withScrim ? <span className={styles.scrim} aria-hidden="true" data-mobile-scrim /> : null}
      <div className={panelClass}>
        <MobileList items={mobileItems} />
      </div>
    </details>
  );

  return (
    <>
      {desktop}
      {mobile}
    </>
  );
}
