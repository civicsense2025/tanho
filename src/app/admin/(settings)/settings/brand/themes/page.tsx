import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { listThemePresets } from "@/modules/theme/preset-queries";
import { listPages } from "@/modules/pages/queries";
import { themeInputSchema } from "@/modules/theme/validation";
import { ThemesGrid } from "@/modules/theme/admin/ThemesGrid";
import { ThemeLibrary } from "@/modules/theme/admin/ThemeLibrary";
import { ThemePreviewModal } from "@/modules/theme/admin/ThemePreviewModal";
import { ThemePreviewContent } from "@/modules/theme/admin/ThemePreviewContent";
import { Section } from "@/components/admin/Section";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Themes" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Saved themes + the theme library. Activate a saved theme to make it live,
 * duplicate/delete your own, or import a curated theme from the library. Any
 * card's Preview button opens a modal (URL-param driven: previewTheme carries
 * the candidate theme's scalars + name as JSON, previewPage/previewMode pick
 * what to render it against) so choosing a real page re-renders server-side
 * with that page's actual, resolved blocks.
 */
export default function ThemesPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={null}>
      <ThemesPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function ThemesPageInner({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser("owner");
  const presets = await listThemePresets();
  const sp = await searchParams;

  const previewRaw = one(sp.previewTheme);
  const preview = previewRaw ? parsePreview(previewRaw) : null;
  const previewMode = one(sp.previewMode) === "dark" ? "dark" : "light";
  const previewPageId = one(sp.previewPage) ?? "demo";

  return (
    <AdminPage width="wide">
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never }}>Themes</h1>
        <Link href="/admin/settings/brand/themes" style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}>← Brand editor</Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
        <Section title="Your themes" desc="Saved and imported themes. Activate one to make it the live theme.">
          <ThemesGrid presets={presets} />
        </Section>
        <Section title="Theme library" desc="Curated starter themes you can import with one click.">
          <ThemeLibrary importedNames={presets.map((p) => p.name)} />
        </Section>
      </div>
      {preview ? (
        <ThemePreviewModal themeName={preview.name} pages={await listPages()} mode={previewMode} pageId={previewPageId}>
          <ThemePreviewContent
            theme={preview.theme}
            mode={previewMode}
            pageId={previewPageId === "demo" ? undefined : previewPageId}
          />
        </ThemePreviewModal>
      ) : null}
    </AdminPage>
  );
}

function parsePreview(raw: string): { name: string; theme: ReturnType<typeof themeInputSchema.parse> } | null {
  try {
    // Next's searchParams values are already decoded — no decodeURIComponent here.
    const data = JSON.parse(raw);
    const theme = themeInputSchema.parse(data.theme);
    const name = typeof data.name === "string" && data.name ? data.name : "Theme";
    return { name, theme };
  } catch {
    return null;
  }
}
