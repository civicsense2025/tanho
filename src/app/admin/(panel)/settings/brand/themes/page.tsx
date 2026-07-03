import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { listThemePresets } from "@/modules/theme/preset-queries";
import { ThemesGrid } from "@/modules/theme/admin/ThemesGrid";
import { ThemeLibrary } from "@/modules/theme/admin/ThemeLibrary";
import { Section } from "@/components/admin/Section";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Themes" };

/**
 * Saved themes + the theme library. Activate a saved theme to make it live,
 * duplicate/delete your own, or import a curated theme from the library.
 */
export default function ThemesPage() {
  return (
    <Suspense fallback={null}>
      <ThemesPageInner />
    </Suspense>
  );
}

async function ThemesPageInner() {
  await requireUser("owner");
  const presets = await listThemePresets();
  return (
    <AdminPage width="wide">
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never }}>Themes</h1>
        <Link href="/admin/settings/brand" style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}>← Brand editor</Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <Section title="Your themes" desc="Saved and imported themes. Activate one to make it the live theme.">
          <ThemesGrid presets={presets} />
        </Section>
        <Section title="Theme library" desc="Curated starter themes you can import with one click.">
          <ThemeLibrary />
        </Section>
      </div>
    </AdminPage>
  );
}
