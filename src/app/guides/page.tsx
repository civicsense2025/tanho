import { listGuides, GuideDifficulty } from "@/lib/db";
import { GuideCard } from "@/components/GuideCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ source?: string; target?: string; difficulty?: string }> };

export default async function GuidesPage({ searchParams }: Props) {
  const { source, target, difficulty } = await searchParams;
  const guides = await listGuides({
    publishedOnly: true,
    sourcePlatform: source,
    targetPlatform: target,
    maxDifficulty: difficulty as GuideDifficulty | undefined,
  });

  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <Link href="/" className="text-xs transition-colors mb-12 inline-block" style={{ color: "var(--muted)" }}>← Back</Link>

      <header className="mb-12">
        <h1 className="text-3xl font-medium tracking-tight mb-3" style={{ color: "var(--foreground)" }}>Self-Hosting Migration Guides</h1>
        <p className="text-lg leading-relaxed max-w-xl" style={{ color: "var(--muted)" }}>
          Step-by-step walkthroughs for moving off hosted platforms like Squarespace, Webflow, and Shopify onto your own server.
        </p>
        <div className="flex gap-4 mt-6">
          <Link href="/guides/should-i-migrate" className="text-xs uppercase tracking-wider px-3 py-1.5 transition-colors" style={{ color: "var(--background)", background: "var(--foreground)" }}>
            Should I migrate? →
          </Link>
          <Link href="/guides/resources" className="text-xs uppercase tracking-wider px-3 py-1.5 transition-colors" style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
            Browse resources
          </Link>
        </div>
      </header>

      {guides.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>No guides match those filters yet.</p>
      ) : (
        <div className="flex flex-col">
          {guides.map((g) => <GuideCard key={g.id} guide={g} />)}
        </div>
      )}
    </main>
  );
}
