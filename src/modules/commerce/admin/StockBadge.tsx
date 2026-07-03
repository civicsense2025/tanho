import styles from "./commerce.module.css";

/** Stock badge: dot + label reflecting inventory vs low-stock threshold. */
export function StockBadge({
  inventory,
  lowStockThreshold,
  trackInventory,
  allowBackorder,
}: {
  inventory: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;
}) {
  if (!trackInventory) {
    return (
      <span className={styles.stockBadge}>
        <span className={styles.dot} style={{ background: "var(--text-faint)" }} />
        Not tracked
      </span>
    );
  }

  let color = "var(--accent-2)";
  let label = `${inventory} in stock`;
  if (inventory <= 0) {
    color = allowBackorder ? "var(--accent)" : "var(--danger)";
    label = allowBackorder ? "Backorder" : "Out of stock";
  } else if (inventory <= lowStockThreshold) {
    color = "var(--accent)";
    label = `Only ${inventory} left`;
  }

  return (
    <span className={styles.stockBadge}>
      <span className={styles.dot} style={{ background: color }} />
      {label}
    </span>
  );
}
