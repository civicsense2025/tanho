import Link from "next/link";
import type { ReactNode } from "react";
import { AdminPage } from "./AdminPage";

/**
 * Shared settings screen shell — the design's SettingsShell header: a
 * `← Admin / Title` breadcrumb row, then the title + optional subtitle. Wraps
 * children in the standard AdminPage column so every settings screen reads
 * consistently.
 *
 * NOTE: unlike the design's decorative Save button, our screens keep their own
 * REAL Save (wired to the server action with dirty/flash state) inside the form
 * body — so this shell owns the header/breadcrumb only, not the save control.
 */
export function SettingsShell({
  title,
  subtitle,
  children,
  width = "prose",
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: "prose" | "wide";
  /** Optional top-right control (e.g. a link to a sub-screen). */
  action?: ReactNode;
}) {
  return (
    <AdminPage width={width}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
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
        {action ? (
          <>
            <span style={{ flex: 1 }} />
            {action}
          </>
        ) : null}
      </div>
      <h1 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
        {title}
      </h1>
      {subtitle ? (
        <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: "36rem" }}>
          {subtitle}
        </p>
      ) : (
        <div style={{ marginBottom: "var(--space-6)" }} />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>{children}</div>
    </AdminPage>
  );
}
