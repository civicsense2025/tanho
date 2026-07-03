"use client";

import { useCart } from "./CartProvider";
import styles from "./shop.module.css";

/** Header cart affordance — opens the drawer, shows a live item count. */
export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button
      type="button"
      className={styles.cartButton}
      onClick={() => setOpen(true)}
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      Cart
      {count > 0 ? <span className={styles.badge}>{count}</span> : null}
    </button>
  );
}
