import { listPlatforms } from "@/lib/db";
import { PlatformCard } from "@/components/PlatformCard";
import { TextLink, Button } from "@/components/ui";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tools & Platforms Directory — Self-Hosting Migration Guides",
  description: "Hosted platforms, their self-hosted alternatives, and the VPS providers to run them on — with pricing and open-source status.",
};

const CATEGORY_LABEL: Record<string, string> = {
  "website-builder": "Website builders",
  cms: "CMS & blogging",
  ecommerce: "Ecommerce",
  db: "Databases",
  database: "Databases",
  saas: "SaaS workspace tools",
  "project-mgmt": "Project management",
  hosting: "VPS & hosting providers",
};

export default async function DirectoryPage() {
  const platforms = await listPlatforms();
  const byCategory = new Map<string, typeof platforms>();
  for (const p of platforms) {
    const cat = p.category || "other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/guides" style={{ fontSize: "var(--text-xs)" }}>
          All guides
        </TextLink>
      </div>

      <header style={{ marginBottom: "var(--space-8)" }}>
        <h1 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          Tools & Platforms Directory
        </h1>
        <p style={{ margin: 0, fontSize: "var(--text-lg)", lineHeight: "var(--leading-normal)", maxWidth: "var(--width-prose)", color: "var(--text-muted)" }}>
          Hosted platforms, their self-hosted alternatives, and the VPS providers to run them on — with pricing and open-source status.
        </p>
        <div style={{ marginTop: "var(--space-5)" }}>
          <Button as="a" href="/guides/resources" variant="outline" size="sm">
            Browse research corpus
          </Button>
        </div>
      </header>

      {Array.from(byCategory.entries()).map(([category, items]) => (
        <section key={category} style={{ marginBottom: "var(--space-10)" }}>
          <h2 style={{ margin: "0 0 var(--space-2)", fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--text-muted)" }}>
            {CATEGORY_LABEL[category] || category}
          </h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {items.map((p) => (
              <PlatformCard key={p.id} platform={p} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
