import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { getTheme } from "@/modules/theme/queries";
import { BrandEditor } from "@/modules/theme/admin/BrandEditor";
import { listFontFamilies } from "@/modules/fonts/actions";
import { mediaPublicUrl } from "@/modules/fonts/queries";
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
  const [familiesRes, faviconPreviewUrl] = await Promise.all([
    listFontFamilies(),
    mediaPublicUrl(theme.faviconMediaId),
  ]);
  const fontFamilies = (familiesRes.ok ? familiesRes.data ?? [] : [])
    .filter((f) => f.status === "active")
    .map((f) => ({ id: f.id, name: f.name }));
  return (
    <AdminPage width="wide">
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-4)", marginBottom: "var(--space-2)", marginTop: "var(--space-2)" }}>
        <Link href="/admin/settings/fonts" style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}>
          Fonts →
        </Link>
        <Link href="/admin/settings/brand/themes" style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}>
          Saved themes →
        </Link>
      </div>
      <BrandEditor initial={theme} fontFamilies={fontFamilies} faviconPreviewUrl={faviconPreviewUrl} />
    </AdminPage>
  );
}
