import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { payments } from "@/adapters/payments";
import { getEcommerceSettings } from "@/modules/commerce/ecommerce-settings";
import {
  hasAnyProduct,
  hasAnyShippingZone,
  listCollectionsWithCounts,
} from "@/modules/commerce/queries";
import { CollectionsScreen } from "@/modules/commerce/admin/CollectionsScreen";
import { LockedStore } from "@/modules/commerce/admin/LockedStore";
import { setupChecklistItems } from "@/modules/commerce/admin/setup-checklist-items";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Collections" };

export default function CollectionsPage() {
  return (
    <Suspense fallback={null}>
      <CollectionsPageInner />
    </Suspense>
  );
}

async function CollectionsPageInner() {
  const user = await requireUser();
  const { unlocked } = await getEcommerceSettings();
  if (!unlocked) return <LockedStore isOwner={user.role === "owner"} />;

  const [collections, hasProduct, hasShippingZone] = await Promise.all([
    listCollectionsWithCounts(),
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
      <CollectionsScreen collections={collections} setupItems={setupItems} />
    </AdminPage>
  );
}
