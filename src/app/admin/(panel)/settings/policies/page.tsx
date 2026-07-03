import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { listPolicies } from "@/modules/policies/queries";
import { PoliciesManager } from "@/modules/policies/admin/PoliciesManager";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "Policies" };

export default function PoliciesSettingsPage() {
  return (
    <Suspense fallback={null}>
      <PoliciesSettingsPageInner />
    </Suspense>
  );
}

async function PoliciesSettingsPageInner() {
  await requireUser("owner");
  const policies = await listPolicies();
  return (
    <SettingsShell title="Policies" subtitle="Privacy, terms, cookies, and store policies.">
      <PoliciesManager policies={policies} />
    </SettingsShell>
  );
}
