"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { deleteConnection, suggestAllowlist, testConnection, updateConnection } from "../connection-actions";
import type { DataSourceAllowlistEntry } from "../validation";
import styles from "./data-sources.module.css";

/**
 * Owner-only editor for a connection's table/column allowlist — the actual
 * security boundary for what bound blocks may ever query. Also exposes
 * "test connection" (verifies reachability) and delete.
 */
export function AllowlistEditor({
  connectionId,
  initialAllowlist,
  onSaved,
}: {
  connectionId: string;
  initialAllowlist: DataSourceAllowlistEntry[];
  /** When provided, called after a successful "Save allowlist" instead of just router.refresh (e.g. embedded in the setup wizard). */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<DataSourceAllowlistEntry[]>(initialAllowlist);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [suggestResult, setSuggestResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const addEntry = () => setEntries((prev) => [...prev, { table: "", columns: [] }]);
  const updateTable = (i: number, table: string) =>
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, table } : e)));
  const updateColumns = (i: number, raw: string) =>
    setEntries((prev) =>
      prev.map((e, idx) =>
        idx === i ? { ...e, columns: raw.split(",").map((c) => c.trim()).filter(Boolean) } : e,
      ),
    );
  const removeEntry = (i: number) => setEntries((prev) => prev.filter((_, idx) => idx !== i));

  const save = () =>
    startTransition(async () => {
      const res = await updateConnection({ id: connectionId, allowlist: entries });
      if (!res.ok) setError(res.error);
      else {
        setError(null);
        if (onSaved) onSaved();
        else router.refresh();
      }
    });

  /**
   * Merge introspected table names into `entries` as NEW rows with empty
   * `columns: []` — nothing is pre-checked. Auto-populating the list of
   * available tables is a friction win; auto-approving columns would defeat
   * the allowlist's purpose, so this only ever adds table names the owner
   * still has to fill in themselves. Existing entries (and any columns
   * already chosen for them) are left untouched.
   */
  const mergeSuggestedTables = (tables: { name: string }[]) =>
    setEntries((prev) => {
      const existingTables = new Set(prev.map((e) => e.table));
      const additions = tables
        .filter((t) => !existingTables.has(t.name))
        .map((t) => ({ table: t.name, columns: [] as string[] }));
      return additions.length > 0 ? [...prev, ...additions] : prev;
    });

  const runSuggest = () =>
    startTransition(async () => {
      const res = await suggestAllowlist(connectionId);
      if (!res.ok) {
        setSuggestResult(res.error);
        return;
      }
      mergeSuggestedTables(res.tables);
      setSuggestResult(
        res.tables.length > 0 ? `Found ${res.tables.length} table(s). Review and select columns below.` : "No tables found.",
      );
    });

  const runTest = () =>
    startTransition(async () => {
      const res = await testConnection(connectionId);
      setTestResult(res.ok ? "Connected." : res.error);
      if (res.ok) {
        const suggested = await suggestAllowlist(connectionId);
        if (suggested.ok) {
          mergeSuggestedTables(suggested.tables);
          setSuggestResult(
            suggested.tables.length > 0
              ? `Found ${suggested.tables.length} table(s). Review and select columns below.`
              : "No tables found.",
          );
        } else {
          setSuggestResult(suggested.error);
        }
      }
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      await deleteConnection(connectionId);
      router.push("/admin/settings/data-sources");
    });

  return (
    <div className={styles.form}>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        Only tables and columns listed here can ever be read by a bound block — this list is
        the actual security boundary, re-checked on every query.
      </p>

      {entries.map((entry, i) => (
        <div key={i} className={styles.allowlistEntry}>
          <div className={styles.fieldRow}>
            <Input
              className={styles.grow}
              placeholder="Table name"
              value={entry.table}
              onChange={(e) => updateTable(i, e.target.value)}
            />
            <Button variant="ghost" size="sm" onClick={() => removeEntry(i)}>
              Remove
            </Button>
          </div>
          <Input
            placeholder="Allowed columns (comma-separated)"
            value={entry.columns.join(", ")}
            onChange={(e) => updateColumns(i, e.target.value)}
          />
        </div>
      ))}

      <div className={styles.actions}>
        <Button variant="outline" size="sm" onClick={addEntry}>
          + Add table
        </Button>
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          Save allowlist
        </Button>
      </div>
      {error ? <span className={styles.error}>{error}</span> : null}

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }} className={styles.actions}>
        <Button variant="outline" size="sm" onClick={runTest} loading={pending}>
          Test connection
        </Button>
        {testResult ? <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{testResult}</span> : null}
      </div>

      <div className={styles.actions}>
        <Button variant="outline" size="sm" onClick={runSuggest} loading={pending}>
          Suggest tables
        </Button>
        {suggestResult ? <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{suggestResult}</span> : null}
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={remove} loading={pending}>
          🗑 Delete connection
        </Button>
      </div>
    </div>
  );
}
