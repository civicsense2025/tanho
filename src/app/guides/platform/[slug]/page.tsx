import { listContentEntries, getContentTypeBySlug, getPlatform } from "@/lib/db";
import { notFound } from "next/navigation";
import { TextLink } from "@/components/ui";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function parseData(dataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(dataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default async function PlatformGuidesPage({ params }: Props) {
  const { slug } = await params;
  const settings = await getSettings();
  if (!settings.features.guides) notFound();
  const platform = await getPlatform(slug);
  if (!platform) notFound();

  const guideType = await getContentTypeBySlug("guide");
  const allGuides = guideType ? await listContentEntries({ contentTypeId: guideType.id, publishedOnly: true }) : [];

  const fromGuides = allGuides.filter((g) => parseData(g.data).sourcePlatform === slug);
  const toGuides = allGuides.filter((g) => parseData(g.data).targetPlatform === slug);

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/guides/directory" style={{ fontSize: "var(--text-xs)" }}>
          Back to directory
        </TextLink>
      </div>

      <h1 style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
        {platform.name}
      </h1>

      {fromGuides.length > 0 && (
        <section style={{ marginBottom: "var(--space-10)" }}>
          <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-h2)", fontWeight: 500 }}>Migrate from {platform.name}</h2>
          {fromGuides.map((g) => {
            const data = parseData(g.data);
            return (
              <div key={g.id} style={{ padding: "var(--space-4) 0", borderBottom: "1px solid var(--border)" }}>
                <TextLink arrow="forward" href={`/guides/${g.slug}`} style={{ fontWeight: 500 }}>{g.title}</TextLink>
                {data.tagline ? <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{String(data.tagline)}</p> : null}
              </div>
            );
          })}
        </section>
      )}

      {toGuides.length > 0 && (
        <section style={{ marginBottom: "var(--space-10)" }}>
          <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-h2)", fontWeight: 500 }}>Migrate to {platform.name}</h2>
          {toGuides.map((g) => {
            const data = parseData(g.data);
            return (
              <div key={g.id} style={{ padding: "var(--space-4) 0", borderBottom: "1px solid var(--border)" }}>
                <TextLink arrow="forward" href={`/guides/${g.slug}`} style={{ fontWeight: 500 }}>{g.title}</TextLink>
                {data.tagline ? <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{String(data.tagline)}</p> : null}
              </div>
            );
          })}
        </section>
      )}

      {fromGuides.length === 0 && toGuides.length === 0 && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No guides for this platform yet.</p>
      )}
    </main>
  );
}
