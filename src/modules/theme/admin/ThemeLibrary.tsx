"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importTheme } from "../actions";
import { Button } from "@/components/core/Button";
import { openPreview } from "./open-preview";
import type { ThemeInput } from "../validation";

/**
 * Theme library — a browsable catalog of curated themes served from the SAME
 * ORIGIN (public/theme-library/index.json), so there's no external host and the
 * CSP/white-label story stays clean. A white-labeler swaps that JSON to ship
 * their own library. One-click Import stores an entry as a preset (validated
 * server-side). Degrades quietly if the catalog is absent.
 *
 * `importedNames` is the set of saved preset names (from ThemesGrid's data,
 * fetched by the parent page) — library entries whose name is already saved
 * show "Imported" instead of an active Import button, since a few built-in
 * presets (Midnight, Harbor, Meadow) ship pre-seeded as the same themes.
 */
type LibraryEntry = {
  id: string;
  name: string;
  description?: string;
  previewColors?: string[];
  theme: Record<string, unknown>;
};

export function ThemeLibrary({ importedNames }: { importedNames: string[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    fetch("/theme-library/index.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setEntries(Array.isArray(data?.themes) ? data.themes : []))
      .catch(() => setFailed(true));
  }, []);

  const imported = new Set(importedNames.map((n) => n.toLowerCase()));

  const add = (entry: LibraryEntry) =>
    start(async () => {
      const res = await importTheme({ format: "oys-theme@1", name: entry.name, theme: entry.theme }, "library");
      if (!res.ok) alert(res.error);
      else router.refresh();
    });

  if (failed) return <p style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>No theme library is configured.</p>;
  if (!entries) return <p style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>Loading library…</p>;
  if (entries.length === 0) return <p style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>The theme library is empty.</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
      {entries.map((e) => {
        const isImported = imported.has(e.name.toLowerCase());
        return (
          <div key={e.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--surface-card)" }}>
            <div style={{ display: "flex", height: 56 }}>
              {(e.previewColors ?? ["#ccc", "#999", "#666", "#333"]).map((c, i) => (
                <span key={i} style={{ flex: 1, background: c }} />
              ))}
            </div>
            <div style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{e.name}</span>
                {isImported ? <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-faint)" }}>✓ imported</span> : null}
              </div>
              {e.description ? <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{e.description}</span> : null}
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <Button variant="outline" size="sm" onClick={() => openPreview(router, e.name, e.theme as ThemeInput)}>Preview</Button>
                <Button variant="outline" size="sm" onClick={() => add(e)} loading={pending} disabled={isImported}>
                  {isImported ? "Imported" : "Import"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
