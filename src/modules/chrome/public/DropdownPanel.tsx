import type { MenuItem } from "@/modules/menus/validation";
import { SmartLink } from "./SmartLink";
import styles from "./header.module.css";

const Tile = ({ item }: { item: MenuItem }) => (
  <span className={styles.ddTile} aria-hidden="true">
    {item.icon || item.label.slice(0, 1).toUpperCase() || "·"}
  </span>
);

/** Desktop dropdown — four styles driven by the item's dropdownStyle. */
export function DropdownPanel({ item }: { item: MenuItem }) {
  const kids = item.children ?? [];
  const style = item.dropdownStyle ?? "simple";

  if (style === "mega") {
    // Columns grouped by each child's `group` (order of first appearance).
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
              <SmartLink key={k.id} href={k.href} className={styles.ddLink}>
                {k.label}
              </SmartLink>
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
          <SmartLink key={k.id} href={k.href} className={styles.ddCard}>
            <Tile item={k} />
            <span className={styles.ddCardBody}>
              <span className={styles.ddCardTitle}>{k.label}</span>
              {k.desc ? <span className={styles.ddDesc}>{k.desc}</span> : null}
            </span>
          </SmartLink>
        ))}
      </div>
    );
  }

  if (style === "icons") {
    return (
      <div className={`${styles.dd} ${styles.ddIcons}`}>
        {kids.map((k) => (
          <SmartLink key={k.id} href={k.href} className={styles.ddIconRow}>
            <Tile item={k} />
            <span>{k.label}</span>
          </SmartLink>
        ))}
      </div>
    );
  }

  return (
    <div className={`${styles.dd} ${styles.ddSimple}`}>
      {kids.map((k) => (
        <SmartLink key={k.id} href={k.href} className={styles.ddLink}>
          {k.label}
        </SmartLink>
      ))}
    </div>
  );
}
