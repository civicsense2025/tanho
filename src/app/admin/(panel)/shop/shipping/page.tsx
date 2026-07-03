import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { payments } from "@/adapters/payments";
import { getEcommerceSettings } from "@/modules/commerce/ecommerce-settings";
import { hasAnyProduct, listShippingZones } from "@/modules/commerce/queries";
import { ShippingSettingsScreen } from "@/modules/commerce/admin/ShippingSettingsScreen";
import { LockedStore } from "@/modules/commerce/admin/LockedStore";
import { setupChecklistItems } from "@/modules/commerce/admin/setup-checklist-items";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Shipping" };

export default function ShippingPage() {
  return (
    <Suspense fallback={null}>
      <ShippingPageInner />
    </Suspense>
  );
}

async function ShippingPageInner() {
  const user = await requireUser();
  const settings = await getEcommerceSettings();
  if (!settings.unlocked) return <LockedStore isOwner={user.role === "owner"} />;

  const [zones, hasProduct] = await Promise.all([listShippingZones(), hasAnyProduct()]);
  const setupItems = setupChecklistItems({
    stripeConnected: payments.isConfigured(),
    hasProduct,
    hasShippingZone: zones.length > 0,
  });
  return (
    <AdminPage>
      <ShippingSettingsScreen settings={settings} zones={zones} setupItems={setupItems} />
    </AdminPage>
  );
}
