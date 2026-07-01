"use client";

import Link from "next/link";
import { useState } from "react";
import { Guide } from "@/lib/db";
import { GuideMeta } from "@/components/GuideMeta";

export function GuideCard({ guide }: { guide: Guide }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/guides/${guide.slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        padding: "var(--space-5) 0",
        borderBottom: "1px solid var(--border)",
        textDecoration: "none",
        transition: "var(--transition)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-4)" }}>
        <h3 style={{ margin: 0, fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)" }}>{guide.title}</h3>
        <span style={{ fontSize: "var(--text-xs)", flexShrink: 0, color: "var(--text-muted)", opacity: hover ? 1 : 0, transition: "var(--transition)" }}>→</span>
      </div>
      <p style={{ margin: 0, fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>
        {guide.sourcePlatform} → {guide.targetPlatform}
      </p>
      {guide.tagline && <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: "var(--leading-normal)", color: "var(--text-muted)" }}>{guide.tagline}</p>}
      <GuideMeta guide={guide} />
    </Link>
  );
}
