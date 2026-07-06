import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { listBlockRegistry } from "@/modules/blocks/registry-queries";
import { BlocksScreen } from "@/modules/blocks/admin/BlocksScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Blocks" };

/**
 * The block registry — every block type this install knows about, with an
 * on/off switch per type. Built-in blocks ship with the platform; the registry
 * is the foundation for imported block packs and (phase 2) plugins.
 */
export default function BlocksSettingsPage() {
  return (
    <Suspense fallback={null}>
      <BlocksSettingsPageInner />
    </Suspense>
  );
}

async function BlocksSettingsPageInner() {
  await requireUser("owner");
  const entries = await listBlockRegistry();
  return (
    <AdminPage width="wide">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-2)", marginTop: "var(--space-2)" }}>
        <Link href="/admin/settings" style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}>← Settings</Link>
      </div>
      <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 640 }}>
        Every block type available in the page builder. Turn a type off to hide it from the picker — existing pages keep
        working. Built-in blocks ship with the platform; imported block packs and plugins will appear here too.
      </p>
      <BlocksScreen entries={entries} />
    </AdminPage>
  );
}
