import { Suspense } from "react";
import type { ReactNode } from "react";
import { requireUser } from "@/modules/auth/guards";
import { getEcommerceSettings } from "@/modules/commerce/ecommerce-settings";
import { getOnboardingState } from "@/modules/onboarding/queries";
import { getContentTypesSettings, isTypeDisabled } from "@/modules/custom-types/content-types-settings";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <AdminPanelLayoutInner>{children}</AdminPanelLayoutInner>
    </Suspense>
  );
}

/** Every panel route renders only after real session verification. */
async function AdminPanelLayoutInner({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const [ecommerce, onboarding, contentTypes] = await Promise.all([
    getEcommerceSettings(),
    getOnboardingState(),
    getContentTypesSettings(),
  ]);
  const setupComplete = onboarding.dismissedAt !== null;
  const shopVisible = !isTypeDisabled(contentTypes, "product") || !isTypeDisabled(contentTypes, "collection");
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AdminTopBar
        user={user}
        ecomOn={ecommerce.unlocked}
        setupComplete={setupComplete}
        shopVisible={shopVisible}
      />
      {children}
    </div>
  );
}
