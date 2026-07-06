import type { ReactNode } from "react";
import { AdminPage } from "./AdminPage";

/**
 * Shared settings screen shell — title + optional subtitle, then children.
 * The `← Admin / Title` breadcrumb lives in SettingsTopBar (rendered once by
 * the settings route group's layout), so this shell owns the page body only.
 *
 * NOTE: unlike the design's decorative Save button, our screens keep their own
 * REAL Save (wired to the server action with dirty/flash state) inside the form
 * body — so this shell doesn't own a save control either.
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
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-2)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          {title}
        </h1>
        {action ? (
          <>
            <span style={{ flex: 1 }} />
            {action}
          </>
        ) : null}
      </div>
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
