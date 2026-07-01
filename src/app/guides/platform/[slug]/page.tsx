import { listGuides, listPlatforms } from "@/lib/db";
import { GuideCard } from "@/components/GuideCard";
import { notFound } from "next/navigation";
import { TextLink } from "@/components/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function PlatformGuidesPage({ params }: Props) {
  const { slug } = await params;
  const platforms = await listPlatforms();
  const platform = platforms.find((p) => p.slug === slug);
  if (!platform) notFound();

  const [fromGuides, toGuides] = await Promise.all([
    listGuides({ publishedOnly: true, sourcePlatform: slug }),
    listGuides({ publishedOnly: true, targetPlatform: slug }),
  ]);

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/guides" style={{ fontSize: "var(--text-xs)" }}>
          All guides
        </TextLink>
      </div>

      <header style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          {platform.name}
        </h1>
        {platform.description && (
          <p style={{ margin: 0, fontSize: "var(--text-lg)", lineHeight: "var(--leading-normal)", maxWidth: "var(--width-prose)", color: "var(--text-muted)" }}>
            {platform.description}
          </p>
        )}
      </header>

      {fromGuides.length > 0 && (
        <section style={{ marginBottom: "var(--space-10)" }}>
          <h2 style={{ margin: "0 0 var(--space-4)", fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--text-muted)" }}>
            Migrate from {platform.name}
          </h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {fromGuides.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        </section>
      )}

      {toGuides.length > 0 && (
        <section>
          <h2 style={{ margin: "0 0 var(--space-4)", fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--text-muted)" }}>
            Migrate to {platform.name}
          </h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {toGuides.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        </section>
      )}

      {fromGuides.length === 0 && toGuides.length === 0 && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No guides for this platform yet.</p>
      )}
    </main>
  );
}
