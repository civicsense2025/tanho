"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAsTheme, importTheme } from "../actions";
import { exportThemeJson } from "../portable";
import type { ThemeInput } from "../validation";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";

/**
 * Save-as-theme / export / import controls for the Brand editor. Export builds
 * a .theme.json Blob download client-side (same pattern as the account export);
 * import reads a file, parses it, and hands the object to the server action,
 * which validates it fail-closed before storing.
 */
export function ThemeActionsBar({ current }: { current: ThemeInput }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const saveAs = () =>
    start(async () => {
      const res = await saveAsTheme(name, current);
      if (!res.ok) setMsg(res.error);
      else {
        setName("");
        setMsg("Saved to your themes ✓");
        router.refresh();
      }
    });

  const doExport = () => {
    const payload = exportThemeJson(name || "My theme", current, Date.now());
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(payload.name || "theme").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      start(async () => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(String(reader.result));
        } catch {
          setMsg("That file isn't valid JSON");
          return;
        }
        const res = await importTheme(parsed, "imported");
        if (!res.ok) setMsg(res.error);
        else {
          setMsg("Imported ✓ — find it in Themes");
          router.refresh();
        }
      });
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border)" }}>
      <Input placeholder="Theme name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 180 }} />
      <Button variant="outline" size="sm" onClick={saveAs} loading={pending}>Save as theme</Button>
      <Button variant="outline" size="sm" onClick={doExport}>Export .theme.json</Button>
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Import</Button>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display: "none" }} />
      {msg ? <span style={{ fontSize: "var(--text-xs)", color: msg.includes("✓") ? "var(--success)" : "var(--danger)" }}>{msg}</span> : null}
    </div>
  );
}
