import type { ReactNode } from "react";
import { requireUser } from "@/modules/auth/guards";
import { getEcommerceSettings } from "@/modules/commerce/ecommerce-settings";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

/** Every panel route renders only after real session verification. */
export default async function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const ecommerce = await getEcommerceSettings();
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AdminTopBar user={user} ecomOn={ecommerce.unlocked} />
      {children}
    </div>
  );
}
