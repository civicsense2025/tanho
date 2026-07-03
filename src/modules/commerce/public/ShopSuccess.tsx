import Link from "next/link";
import { formatMoney } from "../format-money";
import type { OrderSummary } from "../order-lookup";
import styles from "./shop.module.css";

const STATUS_COPY: Record<string, string> = {
  pending: "We're confirming your payment.",
  paid: "Payment received — thank you.",
  unfulfilled: "Payment received — thank you. We're preparing your order.",
  fulfilled: "Your order has shipped.",
  refunded: "This order was refunded.",
  cancelled: "This order was cancelled.",
};

/**
 * Post-checkout confirmation, looked up by unguessable order code. Shows only
 * non-sensitive status + line items — never the customer's email or address.
 */
export function ShopSuccess({ order }: { order: OrderSummary | null }) {
  if (!order) {
    return (
      <div>
        <header className={styles.hero}>
          <h1 className={styles.heroHeading}>Order not found</h1>
        </header>
        <p className={styles.emptyCart}>
          We couldn&apos;t find that order. <Link href="/shop">Return to the shop</Link>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className={styles.hero}>
        <h1 className={styles.heroHeading}>Thank you</h1>
      </header>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-6)" }}>
        {STATUS_COPY[order.status] ?? "Your order has been received."}
      </p>

      <div className={styles.meta} style={{ borderTop: "none", paddingTop: 0 }}>
        <span className={styles.metaRow}>Order · {order.code}</span>
      </div>

      <div className={styles.drawerBody} style={{ padding: 0, marginTop: "var(--space-6)" }}>
        {order.items.map((i, idx) => (
          <div key={idx} className={styles.cartLine}>
            <span className={styles.cartLineName}>
              {i.name} × {i.qty}
            </span>
            <span>{formatMoney(i.unitCents * i.qty, order.currency)}</span>
          </div>
        ))}
        <div className={styles.subtotal} style={{ marginTop: "var(--space-4)" }}>
          <span>Total</span>
          <span>{formatMoney(order.totalCents, order.currency)}</span>
        </div>
      </div>
    </div>
  );
}
