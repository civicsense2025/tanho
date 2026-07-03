"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["Header", "/admin/nav/header"],
  ["Footer", "/admin/nav/footer"],
  ["Menus", "/admin/nav/menus"],
  ["Announcement", "/admin/nav/announcement"],
] as const;

/** Sub-nav shared by the four /admin/nav screens. */
export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        display: "flex",
        gap: "var(--space-4)",
        borderBottom: "1px solid var(--border)",
        marginBottom: "var(--space-6)",
      }}
    >
      {TABS.map(([label, href]) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              textDecoration: "none",
              color: active ? "var(--text)" : "var(--text-faint)",
              padding: "8px 2px 10px",
              boxShadow: active ? "inset 0 -2px 0 var(--accent)" : undefined,
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
