"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/forms/Input";
import { Field } from "@/components/forms/Field";
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

  /** Rows with a table name but zero columns — these can never be saved (an
   * empty allowlist for a table is meaningless: nothing would be readable),
   * so catching this client-side avoids a round-trip just to learn that. */
  const incompleteEntries = useMemo(
    () => entries.filter((e) => e.table.trim() && e.columns.length === 0),
    [entries],
  );

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
        res.tables.length > 0
          ? `Found ${res.tables.length} table(s) below — pick which columns each one can expose.`
          : "No tables found in the public schema. You can still type a table name in manually below.",
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
              ? `Found ${suggested.tables.length} table(s) below — pick which columns each one can expose.`
              : "No tables found in the public schema. You can still type a table name in manually below.",
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

      <div className={styles.allowlistStep}>
        <span className={styles.allowlistStepLabel}>1. Confirm the connection works</span>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={runTest} loading={pending}>
            Test connection
          </Button>
          {testResult ? <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{testResult}</span> : null}
        </div>
      </div>

      <div className={styles.allowlistStep}>
        <span className={styles.allowlistStepLabel}>2. Find tables to allow</span>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={runSuggest} loading={pending}>
            Suggest tables
          </Button>
          {suggestResult ? <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{suggestResult}</span> : null}
        </div>
      </div>

      <div className={styles.allowlistStep}>
        <span className={styles.allowlistStepLabel}>3. Pick columns each table may expose</span>

        {entries.length === 0 ? (
          <p className={styles.empty} style={{ margin: 0 }}>
            No tables allowed yet. Click &quot;Suggest tables&quot; above, or &quot;+ Add table&quot; below to
            type one in by hand.
          </p>
        ) : (
          entries.map((entry, i) => {
            const needsColumns = entry.table.trim() && entry.columns.length === 0;
            return (
              <div key={i} className={styles.allowlistEntry}>
                <div className={styles.fieldRow}>
                  <Field label="Table name" className={styles.grow}>
                    <Input
                      placeholder="e.g. products"
                      value={entry.table}
                      onChange={(e) => updateTable(i, e.target.value)}
                    />
                  </Field>
                  <Button variant="ghost" size="sm" onClick={() => removeEntry(i)}>
                    Remove
                  </Button>
                </div>
                <Field
                  label="Allowed columns"
                  hint={needsColumns ? undefined : "Comma-separated, e.g. id, name, price"}
                >
                  <Input
                    placeholder="id, name, price"
                    value={entry.columns.join(", ")}
                    onChange={(e) => updateColumns(i, e.target.value)}
                    invalid={Boolean(needsColumns)}
                  />
                </Field>
                {needsColumns ? (
                  <span className={styles.error}>
                    Add at least one column, or remove this table — an empty column list can&apos;t be saved.
                  </span>
                ) : null}
              </div>
            );
          })
        )}

        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={addEntry}>
            + Add table
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={save}
            loading={pending}
            disabled={incompleteEntries.length > 0}
          >
            Save allowlist
          </Button>
        </div>
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={remove} loading={pending}>
          🗑 Delete connection
        </Button>
      </div>
    </div>
  );
}
