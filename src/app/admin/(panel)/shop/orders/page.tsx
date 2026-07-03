import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { payments } from "@/adapters/payments";
import { getEcommerceSettings } from "@/modules/commerce/ecommerce-settings";
import {
  hasAnyProduct,
  hasAnyShippingZone,
  listOrders,
  type OrderTab,
} from "@/modules/commerce/queries";
import { OrdersScreen } from "@/modules/commerce/admin/OrdersScreen";
import { LockedStore } from "@/modules/commerce/admin/LockedStore";
import { setupChecklistItems } from "@/modules/commerce/admin/setup-checklist-items";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Orders" };

const TABS: OrderTab[] = ["all", "unfulfilled", "fulfilled", "disputed", "refunded", "donations"];

export default function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <OrdersPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function OrdersPageInner({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { unlocked } = await getEcommerceSettings();
  if (!unlocked) return <LockedStore isOwner={user.role === "owner"} />;

  const { tab: rawTab } = await searchParams;
  const tab: OrderTab = TABS.includes(rawTab as OrderTab) ? (rawTab as OrderTab) : "all";
  const [orders, hasProduct, hasShippingZone] = await Promise.all([
    listOrders(tab),
    hasAnyProduct(),
    hasAnyShippingZone(),
  ]);
  const setupItems = setupChecklistItems({
    stripeConnected: payments.isConfigured(),
    hasProduct,
    hasShippingZone,
  });
  return (
    <AdminPage>
      <OrdersScreen orders={orders} tab={tab} setupItems={setupItems} />
    </AdminPage>
  );
}
