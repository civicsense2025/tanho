import Link from "next/link";
import { Guide } from "@/lib/db";
import { GuideMeta } from "@/components/GuideMeta";

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group flex flex-col gap-3 py-6 border-b transition-colors"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-medium" style={{ color: "var(--foreground)" }}>{guide.title}</h3>
        <span className="text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--muted)" }}>→</span>
      </div>
      <p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
        {guide.source_platform} → {guide.target_platform}
      </p>
      {guide.tagline && <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{guide.tagline}</p>}
      <GuideMeta guide={guide} />
    </Link>
  );
}
