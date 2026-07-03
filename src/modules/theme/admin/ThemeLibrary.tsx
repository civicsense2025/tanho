"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importTheme } from "../actions";
import { Button } from "@/components/core/Button";

/**
 * Theme library — a browsable catalog of curated themes served from the SAME
 * ORIGIN (public/theme-library/index.json), so there's no external host and the
 * CSP/white-label story stays clean. A white-labeler swaps that JSON to ship
 * their own library. One-click Import stores an entry as a preset (validated
 * server-side). Degrades quietly if the catalog is absent.
 */
type LibraryEntry = {
  id: string;
  name: string;
  description?: string;
  previewColors?: string[];
  theme: Record<string, unknown>;
};

export function ThemeLibrary() {
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
      {entries.map((e) => (
        <div key={e.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--surface-card)" }}>
          <div style={{ display: "flex", height: 56 }}>
            {(e.previewColors ?? ["#ccc", "#999", "#666", "#333"]).map((c, i) => (
              <span key={i} style={{ flex: 1, background: c }} />
            ))}
          </div>
          <div style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{e.name}</span>
            {e.description ? <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{e.description}</span> : null}
            <Button variant="outline" size="sm" onClick={() => add(e)} loading={pending}>Import</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
