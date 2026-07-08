"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./tabs.module.css";

const TABS = [
  { label: "Overview", href: "/admin/analytics/overview" },
  { label: "Traffic", href: "/admin/analytics/traffic" },
];

/** Sub-nav for the two analytics screens; highlights the active route. */
export function AnalyticsTabs() {
  const pathname = usePathname();
  return (
    <nav className={styles.tabs} aria-label="Analytics sections">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`${styles.tab} ${active ? styles.tabActive : ""}`}
            aria-current={active ? "page" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
