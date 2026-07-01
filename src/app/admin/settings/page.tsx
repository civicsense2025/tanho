import { getAdminSession } from "@/lib/auth";
import { listSiteSettings } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { SettingsForm } from "@/components/SettingsForm";
import { toSettingRow } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");

  const rows = await listSiteSettings();
  const initial = rows.map(toSettingRow);

  return (
    <AdminPageShell title="Settings">
      <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        Site identity, theme, analytics, and integration credentials. Changes take effect on the next
        request — no rebuild or redeploy needed. Secret fields (API keys, tokens) are stored encrypted
        and never shown once saved; leave a secret field blank to keep its current value.
      </p>
      <SettingsForm initial={initial} />
    </AdminPageShell>
  );
}
