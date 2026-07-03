"use client";

import { useRouter } from "next/navigation";
import { EntityList } from "@/components/admin/EntityList";
import type { OrderRow, OrderTab } from "../queries";
import { orderColumns } from "./orderColumns";
import { SetupChecklist, type SetupChecklistItem } from "./SetupChecklist";
import styles from "./commerce.module.css";

const TABS: { value: OrderTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unfulfilled", label: "Unfulfilled" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "disputed", label: "Disputed" },
  { value: "refunded", label: "Refunded" },
];

/** Orders list: status tabs (URL-driven) + shared EntityList. */
export function OrdersScreen({
  orders,
  tab,
  setupItems,
}: {
  orders: OrderRow[];
  tab: OrderTab;
  setupItems?: SetupChecklistItem[];
}) {
  const router = useRouter();

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Orders</h1>
      </div>

      {setupItems ? <SetupChecklist items={setupItems} /> : null}

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`${styles.tab} ${t.value === tab ? styles.tabActive : ""}`}
            aria-pressed={t.value === tab}
            onClick={() =>
              router.push(t.value === "all" ? "/admin/shop/orders" : `/admin/shop/orders?tab=${t.value}`)
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <EntityList
        items={orders}
        getId={(o) => o.id}
        columns={orderColumns}
        getTitle={(o) => o.code}
        getSubtitle={(o) => o.email}
        searchValues={(o) => [o.code, o.email]}
        editHref={(o) => `/admin/shop/orders/${o.id}`}
        onRowClick={(o) => router.push(`/admin/shop/orders/${o.id}`)}
        emptyLabel="No orders in this view yet."
        noun="Order"
      />
    </main>
  );
}
