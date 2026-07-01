import { listGuides, GuideDifficulty } from "@/lib/db";
import { GuideCard } from "@/components/GuideCard";
import { TextLink, Button } from "@/components/ui";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Self-Hosting Migration Guides",
  description: "Step-by-step walkthroughs for moving off hosted platforms like Squarespace, Webflow, and Shopify onto your own server.",
};

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
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/" style={{ fontSize: "var(--text-xs)" }}>
          Back
        </TextLink>
      </div>

      <header style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          Self-Hosting Migration Guides
        </h1>
        <p style={{ margin: 0, fontSize: "var(--text-lg)", lineHeight: "var(--leading-normal)", maxWidth: "var(--width-prose)", color: "var(--text-muted)" }}>
          Step-by-step walkthroughs for moving off hosted platforms like Squarespace, Webflow, and Shopify onto your own server.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
          <Button as="a" href="/guides/should-i-migrate" variant="accent" size="sm">
            Should I migrate?
          </Button>
          <Button as="a" href="/guides/directory" variant="outline" size="sm">
            Tools directory
          </Button>
          <Button as="a" href="/guides/resources" variant="outline" size="sm">
            Browse resources
          </Button>
        </div>
      </header>

      {guides.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No guides match those filters yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {guides.map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </div>
      )}
    </main>
  );
}
