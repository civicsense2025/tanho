import type { EntityListColumn } from "@/components/admin/EntityList";
import { StatusChip } from "@/components/admin/EntityList";
import type { ProductListItem } from "../queries";
import { StockBadge } from "./StockBadge";
import { ProductQuickPrice, ProductQuickInventory } from "./ProductQuickEditCell";
import styles from "./commerce.module.css";

/** Columns for the products list: thumbnail, inline price + inventory, status. */
export const productColumns: EntityListColumn<ProductListItem>[] = [
  {
    key: "thumb",
    header: "",
    width: "auto",
    render: (p) =>
      p.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element -- 34px admin thumb of author media; next/image needs sizing + loader config
        <img src={p.images[0]} alt="" className={styles.thumb} />
      ) : (
        <span className={styles.thumbEmpty} aria-hidden />
      ),
  },
  {
    key: "price",
    header: "Price",
    render: (p) => <ProductQuickPrice product={p} />,
  },
  {
    key: "inventory",
    header: "Inventory",
    render: (p) => (
      <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <ProductQuickInventory product={p} />
        <StockBadge
          inventory={p.inventory}
          lowStockThreshold={p.lowStockThreshold}
          trackInventory={p.trackInventory}
          allowBackorder={p.allowBackorder}
        />
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    align: "end",
    render: (p) => <StatusChip status={p.status} />,
  },
];
