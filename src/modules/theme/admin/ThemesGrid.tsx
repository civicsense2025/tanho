"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateTheme, duplicateTheme, deleteTheme } from "../actions";
import type { ThemePresetRow } from "../preset-queries";
import { Button } from "@/components/core/Button";

/**
 * Grid of saved themes. Each card shows the four base colors as swatches (a
 * cheap preview without deriving the whole set) and Activate / Duplicate /
 * Delete. Activating copies the preset into the live theme row and refreshes.
 */
export function ThemesGrid({ presets }: { presets: ThemePresetRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok && res.error) alert(res.error);
      else router.refresh();
    });

  if (presets.length === 0) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
        No saved themes yet. Design one in <Link href="/admin/settings/brand" style={{ color: "var(--accent)" }}>Brand</Link> and
        “Save as theme”, or import one below.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
      {presets.map((p) => (
        <div key={p.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--surface-card)" }}>
          <div style={{ display: "flex", height: 64 }}>
            {[p.data.paper, p.data.accent, p.data.accent2, p.data.ink].map((c, i) => (
              <span key={i} style={{ flex: 1, background: c }} />
            ))}
          </div>
          <div style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{p.name}</span>
              {p.builtin ? <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-faint)" }}>built-in</span> : null}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <Button variant="accent" size="sm" onClick={() => run(() => activateTheme(p.id))} loading={pending}>Activate</Button>
              <Button variant="outline" size="sm" onClick={() => run(() => duplicateTheme(p.id))}>Duplicate</Button>
              {!p.builtin ? (
                <Button variant="outline" size="sm" onClick={() => { if (confirm(`Delete “${p.name}”?`)) run(() => deleteTheme(p.id)); }}>
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
