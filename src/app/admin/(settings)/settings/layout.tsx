import { Suspense } from "react";
import type { ReactNode } from "react";
import { requireUser } from "@/modules/auth/guards";
import { SettingsTopBar } from "@/components/admin/SettingsTopBar";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SettingsLayoutInner>{children}</SettingsLayoutInner>
    </Suspense>
  );
}

/** Every settings route renders only after real session verification, same as (panel). */
async function SettingsLayoutInner({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <SettingsTopBar />
      {children}
    </div>
  );
}
