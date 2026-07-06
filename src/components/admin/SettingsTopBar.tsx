"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  general: "General",
  brand: "Brand",
  fonts: "Fonts",
  blocks: "Blocks",
  people: "People",
  membership: "Membership",
  payments: "Payments",
  donations: "Donations",
  policies: "Policies",
  ai: "AI & crawlers",
  "data-sources": "Data sources",
  "api-tokens": "API tokens",
  marketplace: "Marketplace",
};

/**
 * Full-width breadcrumb bar for /admin/settings/* — replaces AdminTopBar for
 * this section so settings screens get the whole viewport width instead of
 * competing with the top nav. Title is derived from the first path segment
 * after /admin/settings/ (falls back to "Settings" for the index page).
 */
export function SettingsTopBar() {
  const pathname = usePathname();
  const segment = pathname.split("/admin/settings/")[1]?.split("/")[0] ?? "";
  const title = TITLES[segment] ?? "Settings";

  return (
    <header
      style={{
        padding: "var(--space-6) var(--gutter)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <Link
          href="/admin"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
            fontFamily: "var(--font-label)",
            fontSize: "var(--text-2xs)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            color: "var(--text-muted)",
          }}
        >
          <span aria-hidden>←</span> Admin
        </Link>
        <span style={{ color: "var(--border-strong)" }}>/</span>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>{title}</span>
      </div>
    </header>
  );
}
