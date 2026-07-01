"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Select, Button } from "@/components/ui";

const PLATFORMS = [
  { value: "", label: "Auto-detect" },
  { value: "substack", label: "Substack" },
  { value: "beehiiv", label: "beehiiv" },
  { value: "mailchimp", label: "Mailchimp" },
  { value: "kit", label: "ConvertKit / Kit" },
  { value: "ghost", label: "Ghost" },
  { value: "buttondown", label: "Buttondown" },
];

interface ImportResult {
  platform: string;
  parsed: number;
  created: number;
  updated: number;
  skipped: number;
}

/** Admin subscriber import. Accepts a CSV file exported from any supported platform, sends the
 * raw text to the import API (which normalizes + upserts), and reports the outcome. Bringing an
 * existing list is a first-class path — the whole point of "own your subscribers". */
export function SubscriberImport() {
  const router = useRouter();
  const [platform, setPlatform] = useState("");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsv(await file.text());
    setResult(null);
    setError("");
  }

  async function runImport() {
    if (!csv) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/import/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, platform: platform || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Import failed");
      } else {
        setResult(await res.json());
        router.refresh();
      }
    } catch {
      setError("Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: "var(--space-5)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)" }}>
      <h3 style={{ margin: "0 0 var(--space-4)", fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--text-muted)" }}>
        Import subscribers
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", alignItems: "flex-end" }}>
        <Field label="Platform">
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="CSV export file">
          <input type="file" accept=".csv,text/csv" onChange={onFile} />
        </Field>
        <Button onClick={runImport} variant="accent" size="sm" disabled={busy || !csv}>
          {busy ? "Importing…" : "Import"}
        </Button>
      </div>
      {fileName && <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{fileName}</p>}
      {error && <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-sm)", color: "var(--danger)" }}>{error}</p>}
      {result && (
        <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-sm)", color: "var(--success)" }}>
          Detected {result.platform}: {result.created} added, {result.updated} updated, {result.skipped} skipped.
        </p>
      )}
    </div>
  );
}
