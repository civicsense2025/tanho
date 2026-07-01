import { listContentEntries, getContentTypeBySlug } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { TextLink, Button } from "@/components/ui";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Self-Hosting Migration Guides",
  description: "Step-by-step walkthroughs for moving off hosted platforms like Squarespace, Webflow, and Shopify onto your own server.",
};

type Props = { searchParams: Promise<{ source?: string; target?: string; difficulty?: string }> };

function parseData(dataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(dataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default async function GuidesPage({ searchParams }: Props) {
  const { source, target, difficulty } = await searchParams;
  const settings = await getSettings();
  const guideType = await getContentTypeBySlug("guide");

  if (!guideType || !settings.features.guides) {
    return (
      <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
        <TextLink arrow="back" muted href="/" style={{ fontSize: "var(--text-xs)" }}>Back</TextLink>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: "var(--space-8)" }}>Guides are not available.</p>
      </main>
    );
  }

  let guides = await listContentEntries({ contentTypeId: guideType.id, publishedOnly: true });

  // Filter in app code — no JSON-path DB operators (security: prevents NoSQL injection).
  if (source) guides = guides.filter((g) => parseData(g.data).sourcePlatform === source);
  if (target) guides = guides.filter((g) => parseData(g.data).targetPlatform === target);
  if (difficulty) guides = guides.filter((g) => parseData(g.data).difficulty === difficulty);

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
          {guides.map((g) => {
            const data = parseData(g.data);
            return (
              <div key={g.id} style={{ padding: "var(--space-5) 0", borderBottom: "1px solid var(--border)" }}>
                <TextLink arrow="forward" href={`/guides/${g.slug}`} style={{ fontSize: "var(--text-lg)", fontWeight: 500 }}>
                  {g.title}
                </TextLink>
                {data.tagline ? (
                  <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                    {String(data.tagline)}
                  </p>
                ) : null}
                {data.difficulty ? (
                  <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
                    {String(data.difficulty)}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
