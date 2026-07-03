import Link from "next/link";
import type { OrderRow } from "@/modules/commerce/queries";
import styles from "./profile.module.css";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const date = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/** A person's order history — id, date, total, status; rows link to the order. */
export function OrderHistory({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) {
    return <p className={styles.faint}>No orders yet.</p>;
  }
  return (
    <div>
      {orders.map((o) => (
        <Link key={o.id} href={`/admin/shop/orders/${o.id}`} className={styles.orderRow}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{o.code}</span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{date(o.placedAt)}</span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{money(o.totalCents)}</span>
          <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
            {o.status}
          </span>
        </Link>
      ))}
    </div>
  );
}
