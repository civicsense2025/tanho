import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { SupabaseProjectPicker } from "@/modules/data-sources/admin/SupabaseProjectPicker";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "Connect Supabase" };

export default function ConnectSupabasePage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; intent?: string; supabase_error?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ConnectSupabasePageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function ConnectSupabasePageInner({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; intent?: string; supabase_error?: string }>;
}) {
  await requireUser("owner");
  const { oauth, intent, supabase_error } = await searchParams;

  return (
    <SettingsShell title="Connect Supabase" subtitle="Create a new database or connect an existing project.">
      {supabase_error ? (
        <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>
          Something went wrong connecting to Supabase. Try again.
        </p>
      ) : !oauth ? (
        <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>
          Missing Supabase connection. Start over from the data sources screen.
        </p>
      ) : (
        <SupabaseProjectPicker
          oauthConnectionId={oauth}
          initialIntent={intent === "create" ? "create" : "connect"}
        />
      )}
    </SettingsShell>
  );
}
