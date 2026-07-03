"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteBlockPack, exportBlockPack, importBlockPack } from "../actions";
import type { EntryRow } from "@/modules/entries/schema";

/**
 * The Block Packs screen — lists every saved/imported block pack with import
 * (upload .pack.json), export (download .pack.json), and delete actions.
 * Import is fail-safe: unknown block types render as placeholders, so a pack
 * never breaks the site. Diagnostics (missingTypes/dropped) are surfaced after
 * import so the owner knows what to install or fix.
 */
export function BlockPacksScreen({ packs }: { packs: EntryRow[] }) {
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
          const res = await importBlockPack(json, "imported");
          if (!res.ok) {
            setMsg(`Import failed: ${res.error}`);
            window.alert(res.error);
          } else {
            const d = res.data!;
            const notes: string[] = [];
            if (d.missingTypes.length) notes.push(`${d.missingTypes.length} unknown block type(s): ${d.missingTypes.join(", ")}`);
            if (d.dropped.length) notes.push(`${d.dropped.length} invalid block(s) dropped`);
            setMsg(notes.length ? `Imported with notes — ${notes.join(" · ")}` : "Imported.");
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
      const res = await exportBlockPack(id);
      if (!res.ok) return window.alert(res.error);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pack.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

  const remove = (id: string) =>
    start(async () => {
      if (!window.confirm("Delete this block pack?")) return;
      const res = await deleteBlockPack(id);
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
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={onFile}
        />
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          A pack never breaks your site — unknown block types render as placeholders.
        </span>
      </div>
      {msg ? <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{msg}</p> : null}

      {packs.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>
          No block packs yet. Export a page&apos;s blocks as a pack (coming soon) or import a .pack.json.
        </p>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          {packs.map((p, i) => {
            const data = p.data as { source?: string; packVersion?: number; requiredTypes?: string[] };
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>{p.title}</span>
                    <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", padding: "1px 7px" }}>
                      {data.source ?? "local"}
                    </span>
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                    {(data.requiredTypes ?? []).length} block type{(data.requiredTypes ?? []).length === 1 ? "" : "s"} · v{data.packVersion ?? 1}
                  </div>
                </div>
                <button type="button" onClick={() => exportPack(p.id, p.title)} disabled={pending} style={btnStyle}>
                  Export
                </button>
                <Link href={`/admin/block-packs/${p.id}`} style={{ ...btnLinkStyle }}>
                  Open
                </Link>
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

const btnLinkStyle: React.CSSProperties = {
  ...btnStyle,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};
