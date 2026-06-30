import { listGuides, listPlatforms } from "@/lib/db";
import { GuideCard } from "@/components/GuideCard";
import { notFound } from "next/navigation";
import Link from "next/link";

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
    <main className="max-w-3xl mx-auto px-6 py-20">
      <Link href="/guides" className="text-xs transition-colors mb-12 inline-block" style={{ color: "var(--muted)" }}>← All guides</Link>

      <header className="mb-12">
        <h1 className="text-3xl font-medium tracking-tight mb-3" style={{ color: "var(--foreground)" }}>{platform.name}</h1>
        {platform.description && <p className="text-lg leading-relaxed max-w-xl" style={{ color: "var(--muted)" }}>{platform.description}</p>}
      </header>

      {fromGuides.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>Migrate from {platform.name}</h2>
          <div className="flex flex-col">{fromGuides.map((g) => <GuideCard key={g.id} guide={g} />)}</div>
        </section>
      )}

      {toGuides.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>Migrate to {platform.name}</h2>
          <div className="flex flex-col">{toGuides.map((g) => <GuideCard key={g.id} guide={g} />)}</div>
        </section>
      )}

      {fromGuides.length === 0 && toGuides.length === 0 && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>No guides for this platform yet.</p>
      )}
    </main>
  );
}
