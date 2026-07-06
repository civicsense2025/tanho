"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getImporter, type ImporterInputSpec } from "../registry";

/**
 * A generous, self-owned ceiling on each uploaded file, checked before ANY parsing.
 * (This shouldn't depend on next.config's serverActions.bodySizeLimit, which is set
 * for an unrelated media-upload feature and could change independently.)
 */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB — covers a large Substack/Medium zip

/**
 * The ONE import screen. Driven entirely by the importer's registry descriptor: it
 * renders an input per `descriptor.inputs` (file/url/toggle), runs the two-step
 * dry-run → confirm flow (nothing is written until the operator reviews the preview
 * and clicks Confirm), and delegates the summary panel to `descriptor.renderSummary`.
 * The single screen for every importer — no per-importer screen components.
 */
export function ImportScreen({ importerId }: { importerId: string }) {
  const router = useRouter();
  const importer = getImporter(importerId);
  const [pending, start] = useTransition();
  const [values, setValues] = useState<Record<string, unknown>>(() => initialValues(importer?.inputs ?? []));
  const [summary, setSummary] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  if (!importer) return <p>Unknown importer.</p>;

  const setValue = (key: string, v: unknown) => setValues((prev) => ({ ...prev, [key]: v }));

  const onFile = (spec: Extract<ImporterInputSpec, { kind: "file" }>, file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`);
      return;
    }
    setError(null);
    if (spec.read === "text") {
      file.text().then((t) => setValue(spec.key, t)).catch(() => setError("Could not read that file"));
    } else if (spec.read === "json") {
      file
        .text()
        .then((t) => setValue(spec.key, JSON.parse(t)))
        .catch(() => setError("Could not read that file as JSON"));
    } else {
      // arrayBuffer → pass a File through (server actions can receive File/Blob).
      setValue(spec.key, file);
    }
  };

  /** Validate required inputs are present, returning an error message or null. */
  const missingRequired = (): string | null => {
    for (const spec of importer.inputs) {
      if (spec.kind === "toggle") continue;
      if (spec.required && (values[spec.key] === undefined || values[spec.key] === "" || values[spec.key] === null)) {
        return `${spec.label} is required.`;
      }
    }
    return null;
  };

  const runDryRun = () => {
    const miss = missingRequired();
    if (miss) return setError(miss);
    setError(null);
    setSummary(null);
    setReceiptId(null);
    start(async () => {
      try {
        const res = await importer.dryRun(values);
        if (!res.ok) return setError(res.error);
        setSummary(res.data ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Preview failed unexpectedly.");
      }
    });
  };

  const confirmImport = () => {
    start(async () => {
      try {
        const res = await importer.commit(values);
        if (!res.ok) return setError(res.error);
        setReceiptId(res.data!.receiptId);
        setSummary(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed unexpectedly — check the server logs.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 640 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {importer.inputs.map((spec) => (
          <label key={spec.key} style={fieldLabel}>
            {spec.label}
            {spec.hint ? <span style={{ color: "var(--text-faint)", fontSize: "var(--text-xs)" }}>{spec.hint}</span> : null}
            {spec.kind === "file" ? (
              <input type="file" accept={spec.accept} onChange={(e) => onFile(spec, e.target.files?.[0])} />
            ) : spec.kind === "url" ? (
              <input
                type="url"
                placeholder={spec.placeholder}
                onChange={(e) => setValue(spec.key, e.target.value)}
                style={urlInput}
              />
            ) : (
              <input
                type="checkbox"
                defaultChecked={spec.default}
                onChange={(e) => setValue(spec.key, e.target.checked)}
                style={{ alignSelf: "flex-start" }}
              />
            )}
          </label>
        ))}
        <div>
          <button type="button" onClick={runDryRun} disabled={pending} style={primaryBtn}>
            Preview import
          </button>
        </div>
      </div>

      {error ? <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>{error}</p> : null}

      {summary ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-5)" }}>
          <h3 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", fontWeight: 600 }}>Preview</h3>
          {importer.renderSummary(summary)}
          <div style={{ marginTop: "var(--space-5)" }}>
            <button type="button" onClick={confirmImport} disabled={pending} style={primaryBtn}>
              Confirm import
            </button>
          </div>
        </div>
      ) : null}

      {receiptId ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text)" }}>
          Import complete. See the safety receipt for redirect status and counts.
        </p>
      ) : null}
    </div>
  );
}

function initialValues(inputs: ImporterInputSpec[]): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const spec of inputs) if (spec.kind === "toggle") v[spec.key] = spec.default;
  return v;
}

const fieldLabel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: "var(--text-sm)",
  color: "var(--text-muted)",
};
const urlInput: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  background: "var(--surface)",
  color: "var(--text)",
};
const primaryBtn: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  fontWeight: 500,
  color: "var(--bg)",
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-2) var(--space-4)",
  cursor: "pointer",
};

/** A shared issues list many `renderSummary` implementations can reuse. */
export function IssueList({ issues }: { issues: Array<{ detail: string }> }) {
  if (issues.length === 0) return null;
  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: 4 }}>
        {issues.length} item(s) need attention:
      </div>
      <ul style={{ margin: 0, paddingLeft: "1.2em", display: "flex", flexDirection: "column", gap: 4 }}>
        {issues.map((issue, i) => (
          <li key={i} style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {issue.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A shared stat-line for summary panels. */
export function StatLine({ children }: { children: React.ReactNode }) {
  return <li style={{ fontSize: "var(--text-sm)", color: "var(--text)", listStyle: "none" }}>{children}</li>;
}
