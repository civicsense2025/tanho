import Link from "next/link";
import type { getOrder } from "../queries";
import { formatCents } from "../money";
import { StatusChip } from "@/components/admin/EntityList";
import { OrderWorkflow } from "./OrderWorkflow";
import { OrderHistory } from "@/modules/people/admin/OrderHistory";
import type { OrderRow } from "../queries";
import styles from "./commerce.module.css";

type OrderData = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function initials(name: string, email: string): string {
  const src = name.trim() || email;
  const parts = src.split(/\s+|@/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

/** Order detail: items table, customer sidebar (with past orders), and status workflow. */
export function OrderDetail({
  data,
  isOwner,
  pastOrders,
}: {
  data: OrderData;
  isOwner: boolean;
  /** This customer's other orders (current order excluded), newest first. */
  pastOrders: OrderRow[];
}) {
  const { order, items, dispute, person } = data;
  const currency = order.currency;
  const lifetimeSpentCents = pastOrders.reduce((sum, o) => sum + o.totalCents, 0) + order.totalCents;
  const orderCount = pastOrders.length + 1;

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <Link href="/admin/shop/orders" className={styles.back}>
          ← Orders
        </Link>
        <span style={{ flex: 1 }} />
        <StatusChip status={order.status} />
      </div>

      <h1 className={styles.title}>{order.code}</h1>

      <div className={styles.orderGrid}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <section className={styles.card2}>
            <h3 className={styles.cardHead}>Items</h3>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className={styles.right}>Qty</th>
                  <th className={styles.right}>Unit</th>
                  <th className={styles.right}>Line</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td className={styles.right}>{it.qty}</td>
                    <td className={styles.right}>{formatCents(it.unitCents, currency)}</td>
                    <td className={styles.right}>{formatCents(it.unitCents * it.qty, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.totalRow}>
              <strong>Total</strong>
              <strong>{formatCents(order.totalCents, currency)}</strong>
            </div>
          </section>

          <section className={styles.card2}>
            <h3 className={styles.cardHead}>Fulfillment</h3>
            <OrderWorkflow order={order} dispute={dispute} isOwner={isOwner} />
          </section>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <section className={styles.card2}>
            <h3 className={styles.cardHead}>Customer</h3>
            <div className={styles.customerHead}>
              <span className={styles.customerAvatar} aria-hidden>
                {initials(person?.name ?? "", order.email)}
              </span>
              <div style={{ minWidth: 0 }}>
                {person ? (
                  <Link href={`/admin/people/${person.id}`} className={styles.personLink}>
                    {person.name || order.email}
                  </Link>
                ) : (
                  <span>{order.email}</span>
                )}
                <div className={styles.faint}>{order.email}</div>
              </div>
            </div>

            <div className={styles.customerStats}>
              <div>
                <div className={styles.statValue}>{formatCents(lifetimeSpentCents, currency)}</div>
                <div className={styles.statLabel}>Lifetime spent</div>
              </div>
              <div>
                <div className={styles.statValue}>{orderCount}</div>
                <div className={styles.statLabel}>Orders</div>
              </div>
            </div>

            <div className={styles.customerMeta}>
              <div className={styles.customerMetaRow}>
                <span className={styles.faint}>Phone</span>
                <span>{person?.phone || "—"}</span>
              </div>
              <div className={styles.customerMetaRow}>
                <span className={styles.faint}>Location</span>
                <span>{person?.location || "—"}</span>
              </div>
              <div className={styles.customerMetaRow}>
                <span className={styles.faint}>Subscription</span>
                <span>
                  {person
                    ? person.status === "unsubscribed"
                      ? "Unsubscribed"
                      : "Subscribed"
                    : "—"}
                </span>
              </div>
            </div>

            <span className={styles.mono}>Placed {day(order.placedAt)}</span>
          </section>

          {pastOrders.length > 0 ? (
            <section className={styles.card2}>
              <h3 className={styles.cardHead}>Past orders</h3>
              <OrderHistory orders={pastOrders} />
            </section>
          ) : null}

          {order.shippingAddress ? (
            <section className={styles.card2}>
              <h3 className={styles.cardHead}>Ship to</h3>
              {Object.entries(order.shippingAddress).map(([k, v]) => (
                <span key={k} className={styles.faint}>
                  {String(v)}
                </span>
              ))}
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
