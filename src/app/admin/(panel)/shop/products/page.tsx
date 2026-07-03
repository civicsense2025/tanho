import { requireUser } from "@/modules/auth/guards";
import { payments } from "@/adapters/payments";
import { getEcommerceSettings } from "@/modules/commerce/ecommerce-settings";
import {
  hasAnyProduct,
  hasAnyShippingZone,
  listProducts,
  lowStockProducts,
} from "@/modules/commerce/queries";
import { ProductsScreen } from "@/modules/commerce/admin/ProductsScreen";
import { LockedStore } from "@/modules/commerce/admin/LockedStore";
import { setupChecklistItems } from "@/modules/commerce/admin/setup-checklist-items";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const user = await requireUser();
  const { unlocked } = await getEcommerceSettings();
  if (!unlocked) return <LockedStore isOwner={user.role === "owner"} />;

  const [products, lowStock, hasProduct, hasShippingZone] = await Promise.all([
    listProducts(),
    lowStockProducts(),
    hasAnyProduct(),
    hasAnyShippingZone(),
  ]);
  const stripeConnected = payments.isConfigured();
  return (
    <AdminPage>
      <ProductsScreen
        products={products}
        lowStock={lowStock}
        stripeConnected={stripeConnected}
        setupItems={setupChecklistItems({ stripeConnected, hasProduct, hasShippingZone })}
      />
    </AdminPage>
  );
}
