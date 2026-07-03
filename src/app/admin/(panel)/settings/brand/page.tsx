import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { getTheme } from "@/modules/theme/queries";
import { BrandEditor } from "@/modules/theme/admin/BrandEditor";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Brand" };

/**
 * Brand — the theming surface. Owner edits the four base colors + type/spacing
 * scalars; the whole site restyles from them (deriveTokens → CSS vars). Save-as/
 * import/export and the Themes library live below the editor and on the Themes
 * sub-screen.
 */
export default function BrandSettingsPage() {
  return (
    <Suspense fallback={null}>
      <BrandSettingsPageInner />
    </Suspense>
  );
}

async function BrandSettingsPageInner() {
  await requireUser("owner");
  const theme = await getTheme();
  return (
    <AdminPage width="wide">
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)" }}>
          Brand
        </h1>
        <Link href="/admin/settings/brand/themes" style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}>
          Saved themes →
        </Link>
      </div>
      <BrandEditor initial={theme} />
    </AdminPage>
  );
}
