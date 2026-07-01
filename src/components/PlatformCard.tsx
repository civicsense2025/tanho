import { Platform } from "@/lib/db";
import { TextLink, Tag } from "@/components/ui";

const KIND_LABEL: Record<Platform["kind"], string> = {
  source: "Hosted SaaS",
  target: "Self-hosted",
  both: "Hosted or self-hosted",
};

export function PlatformCard({ platform }: { platform: Platform }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", padding: "var(--space-5) 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-4)" }}>
        <h3 style={{ margin: 0, fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)" }}>{platform.name}</h3>
        <TextLink arrow="forward" muted href={`/guides/platform/${platform.slug}`} style={{ fontSize: "var(--text-xs)", flexShrink: 0 }}>
          Guides
        </TextLink>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        <Tag>{KIND_LABEL[platform.kind]}</Tag>
        {!!platform.isOpenSource && <Tag tone="olive">Open source</Tag>}
      </div>
      {platform.description && <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)", color: "var(--text-muted)" }}>{platform.description}</p>}
      {platform.pricingNotes && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>$ {platform.pricingNotes}</p>}
      <div style={{ display: "flex", gap: "var(--space-4)" }}>
        {platform.officialUrl && (
          <a href={platform.officialUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--text-xs)", color: "var(--text)" }}>
            Official site ↗
          </a>
        )}
        {platform.githubUrl && (
          <a href={platform.githubUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--text-xs)", color: "var(--text)" }}>
            GitHub ↗
          </a>
        )}
      </div>
    </div>
  );
}
