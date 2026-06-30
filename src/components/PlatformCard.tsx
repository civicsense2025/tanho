import { Platform } from "@/lib/db";
import Link from "next/link";

const KIND_LABEL: Record<Platform["kind"], string> = {
  source: "Hosted SaaS",
  target: "Self-hosted",
  both: "Hosted or self-hosted",
};

export function PlatformCard({ platform }: { platform: Platform }) {
  return (
    <div className="flex flex-col gap-2 py-5 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-medium" style={{ color: "var(--foreground)" }}>{platform.name}</h3>
        <Link href={`/guides/platform/${platform.slug}`} className="text-xs flex-shrink-0 transition-colors" style={{ color: "var(--muted)" }}>Guides →</Link>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
          {KIND_LABEL[platform.kind]}
        </span>
        {!!platform.is_open_source && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: "#1f9d55", border: "1px solid #1f9d55" }}>
            Open source
          </span>
        )}
      </div>
      {platform.description && <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{platform.description}</p>}
      {platform.pricing_notes && <p className="text-xs" style={{ color: "var(--muted)" }}>$ {platform.pricing_notes}</p>}
      <div className="flex gap-4">
        {platform.official_url && (
          <a href={platform.official_url} target="_blank" rel="noopener noreferrer" className="text-xs transition-colors" style={{ color: "var(--foreground)" }}>Official site ↗</a>
        )}
        {platform.github_url && (
          <a href={platform.github_url} target="_blank" rel="noopener noreferrer" className="text-xs transition-colors" style={{ color: "var(--foreground)" }}>GitHub ↗</a>
        )}
      </div>
    </div>
  );
}
