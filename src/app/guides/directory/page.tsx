import { listPlatforms } from "@/lib/db";
import { PlatformCard } from "@/components/PlatformCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
    <main className="max-w-3xl mx-auto px-6 py-20">
      <Link href="/guides" className="text-xs transition-colors mb-12 inline-block" style={{ color: "var(--muted)" }}>← All guides</Link>

      <header className="mb-12">
        <h1 className="text-3xl font-medium tracking-tight mb-3" style={{ color: "var(--foreground)" }}>Tools & Platforms Directory</h1>
        <p className="text-lg leading-relaxed max-w-xl" style={{ color: "var(--muted)" }}>
          Hosted platforms, their self-hosted alternatives, and the VPS providers to run them on — with pricing and open-source status.
        </p>
        <Link href="/guides/resources" className="text-xs uppercase tracking-wider px-3 py-1.5 mt-6 inline-block transition-colors" style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
          Browse research corpus
        </Link>
      </header>

      {Array.from(byCategory.entries()).map(([category, items]) => (
        <section key={category} className="mb-12">
          <h2 className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>{CATEGORY_LABEL[category] || category}</h2>
          <div className="flex flex-col">
            {items.map((p) => <PlatformCard key={p.id} platform={p} />)}
          </div>
        </section>
      ))}
    </main>
  );
}
