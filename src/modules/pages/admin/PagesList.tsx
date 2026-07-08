"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { PageRow } from "@/modules/pages/queries";
import { deletePage } from "@/modules/pages/actions";
import { Button } from "@/components/core/Button";
import { pageRenderMode, renderModeHint } from "@/modules/pages/render-mode";
import type { CodePageSummary } from "@/app/(public)/code-pages/registry";
import styles from "./pages-list.module.css";

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-2xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-muted)",
};

/** Static/Dynamic badge — subtle, matches the eyebrow label styling. */
function RenderModeBadge({ hasPaywall }: { hasPaywall?: boolean }) {
  const mode = pageRenderMode({ hasPaywall });
  return (
    <span
      title={renderModeHint(mode)}
      style={{
        ...eyebrow,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        color: mode === "dynamic" ? "var(--accent)" : "var(--text-faint)",
        cursor: "default",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentcolor" }} />
      {mode}
    </span>
  );
}

export function PagesList({
  pages,
  codePages = [],
  onCreate,
}: {
  pages: PageRow[];
  codePages?: CodePageSummary[];
  onCreate?: () => void;
}) {
  const router = useRouter();
  const [, start] = useTransition();

  const remove = (p: PageRow) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    start(async () => {
      await deletePage(p.id);
      router.refresh();
    });
  };

  if (!pages.length && !codePages.length) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "var(--space-10)",
          border: "1px dashed var(--border-strong)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-muted)",
        }}
      >
        <p style={{ margin: "0 0 var(--space-4)" }}>No pages yet.</p>
        {onCreate ? (
          <Button variant="accent" size="sm" onClick={onCreate}>+ New page</Button>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
      <div className={styles.head} style={{ padding: "8px var(--space-4)", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        {["Title", "Route", "Kind", "Mode", "Status", ""].map((h, i) => (
          <span key={i} style={eyebrow}>{h}</span>
        ))}
      </div>
      {pages.map((p, i) => (
        <div
          key={p.id}
          className={styles.row}
          style={{ padding: "10px var(--space-4)", borderBottom: i < pages.length - 1 || codePages.length ? "1px solid var(--border)" : "none" }}
        >
          <span className={styles.cell} data-label="Title">
            <Link href={`/admin/pages/${p.id}`} style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" as never, color: "var(--text)", textDecoration: "none" }}>
              {p.title}
            </Link>
          </span>
          <span className={styles.cell} data-label="Route" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{p.route}</span>
          <span className={styles.cell} data-label="Kind" style={eyebrow}>{p.kind}</span>
          <span className={styles.cell} data-label="Mode">
            <RenderModeBadge hasPaywall={p.hasPaywall} />
          </span>
          <span
            className={styles.cell}
            data-label="Status"
            style={{
              ...eyebrow,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              color: p.status === "published" ? "var(--success)" : "var(--text-faint)",
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentcolor" }} />
            {p.status}
          </span>
          <span className={styles.cell} style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
            <Button variant="ghost" size="sm" onClick={() => remove(p)}>
              Delete
            </Button>
          </span>
        </div>
      ))}
      {codePages.map((cp, i) => (
        <div
          key={cp.route}
          className={styles.row}
          title="Defined in code — not editable in the block editor."
          style={{ padding: "10px var(--space-4)", borderBottom: i < codePages.length - 1 ? "1px solid var(--border)" : "none", opacity: 0.75 }}
        >
          <span className={styles.cell} data-label="Title" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" as never, color: "var(--text)" }}>
            {cp.title ?? cp.route}
          </span>
          <span className={styles.cell} data-label="Route" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{cp.route}</span>
          <span className={styles.cell} data-label="Kind" style={eyebrow}>Code page</span>
          <span className={styles.cell} data-label="Mode" style={{ ...eyebrow, display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-faint)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentcolor" }} />
            static
          </span>
          <span className={styles.cell} data-label="Status" style={eyebrow}>—</span>
          <span className={styles.cell} />
        </div>
      ))}
    </div>
  );
}
