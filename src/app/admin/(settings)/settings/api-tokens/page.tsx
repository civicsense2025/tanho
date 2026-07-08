import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { listApiTokens } from "@/modules/auth/api-tokens/actions";
import { ApiTokensManager } from "@/modules/auth/api-tokens/Manager";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "API tokens" };

export default function ApiTokensPage() {
  return (
    <Suspense fallback={null}>
      <ApiTokensPageInner />
    </Suspense>
  );
}

async function ApiTokensPageInner() {
  await requireUser("owner");
  const res = await listApiTokens();
  return (
    <SettingsShell
      title="API tokens"
      subtitle="Mint bearer tokens so external clients — the Lamina Swift app, scripts — can connect to this site on your behalf."
    >
      <ApiTokensManager initial={res.ok ? res.data! : []} />
    </SettingsShell>
  );
}
