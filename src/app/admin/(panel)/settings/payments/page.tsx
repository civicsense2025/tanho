import { requireUser } from "@/modules/auth/guards";
import { payments } from "@/adapters/payments";
import { getPaymentsSettings } from "@/modules/commerce/payments-settings";
import { PaymentsSettingsScreen } from "@/modules/commerce/admin/PaymentsSettingsScreen";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "Payments settings" };

export default async function PaymentsSettingsPage() {
  await requireUser("owner");
  const initial = await getPaymentsSettings();
  return (
    <SettingsShell title="Payments" subtitle="Stripe connection, currency, and tax.">
      <PaymentsSettingsScreen initial={initial} connected={payments.isConfigured()} />
    </SettingsShell>
  );
}
