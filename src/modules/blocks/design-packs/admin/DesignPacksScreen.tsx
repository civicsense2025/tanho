"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  activateDesignPack,
  deleteDesignPack,
  exportDesignPack,
} from "../actions";
import type { EntryRow } from "@/modules/entries/schema";

/**
 * The Design Packs screen — theme + page template bundles. Import a .pack.json,
 * export one, or activate a design pack (applies its theme and creates its
 * pages). Imports are fail-safe: unknown block types render as placeholders.
 */
export function DesignPacksScreen({ packs }: { packs: EntryRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    file
      .text()
      .then((text) => JSON.parse(text))
      .then((json) =>
        start(async () => {
          const res = await importDesignPackClient(json);
          if (!res.ok) {
            setMsg(`Import failed: ${res.error}`);
            window.alert(res.error);
          } else {
            setMsg(`Imported — ${res.data!.pages} page(s).`);
            router.refresh();
          }
        }),
      )
      .catch(() => setMsg("Could not read that file as JSON"))
      .finally(() => {
        if (fileRef.current) fileRef.current.value = "";
      });
  };

  const exportPack = (id: string, title: string) =>
    start(async () => {
      const res = await exportDesignPack(id);
      if (!res.ok) return window.alert(res.error);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pack.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

  const activate = (id: string, title: string) =>
    start(async () => {
      if (!window.confirm(`Activate "${title}"? This applies its theme and creates its pages. Existing pages with the same route are skipped.`)) return;
      const res = await activateDesignPack(id);
      if (!res.ok) return window.alert(res.error);
      const d = res.data!;
      const parts: string[] = ["Theme applied"];
      if (d.pagesCreated.length) parts.push(`${d.pagesCreated.length} page(s) created`);
      if (d.pagesSkipped.length) parts.push(`${d.pagesSkipped.length} skipped (route in use)`);
      setMsg(parts.join(" · "));
      router.refresh();
    });

  const remove = (id: string) =>
    start(async () => {
      if (!window.confirm("Delete this design pack?")) return;
      const res = await deleteDesignPack(id);
      if (!res.ok) window.alert(res.error);
      else router.refresh();
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            color: "var(--bg)",
            background: "var(--accent)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2) var(--space-4)",
            cursor: pending ? "default" : "pointer",
          }}
        >
          Import .pack.json
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onFile} />
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          A design pack includes a theme + page templates. Activating applies the theme and creates the pages.
        </span>
      </div>
      {msg ? <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{msg}</p> : null}

      {packs.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>No design packs yet. Import a .pack.json to get started.</p>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          {packs.map((p, i) => {
            const data = p.data as { source?: string; packVersion?: number; pageTemplates?: unknown[]; theme?: { accent?: string } };
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-4)",
                  padding: "var(--space-3) var(--space-5)",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                {data.theme?.accent ? (
                  <span style={{ width: 16, height: 16, borderRadius: "50%", background: data.theme.accent, border: "1px solid var(--border)", flexShrink: 0 }} />
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>{p.title}</span>
                    <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", padding: "1px 7px" }}>
                      {data.source ?? "local"}
                    </span>
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                    {(data.pageTemplates ?? []).length} page(s) · v{data.packVersion ?? 1}
                  </div>
                </div>
                <button type="button" onClick={() => activate(p.id, p.title)} disabled={pending} style={{ ...btnStyle, color: "var(--accent)", borderColor: "var(--accent)" }}>
                  Activate
                </button>
                <button type="button" onClick={() => exportPack(p.id, p.title)} disabled={pending} style={btnStyle}>
                  Export
                </button>
                <button type="button" onClick={() => remove(p.id)} disabled={pending} style={{ ...btnStyle, color: "var(--danger)" }}>
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--text-muted)",
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-1) var(--space-3)",
  cursor: "pointer",
};

// Client-side wrapper that calls the server action via a dynamic import to keep
// the client bundle lean (the server action is already referenced above for
// export/activate/delete; import needs the design-pack action).
async function importDesignPackClient(json: unknown): Promise<
  { ok: true; data: { pages: number } } | { ok: false; error: string }
> {
  const { importDesignPack } = await import("../actions");
  const res = await importDesignPack(json, "imported");
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, data: { pages: res.data!.pages } };
}
