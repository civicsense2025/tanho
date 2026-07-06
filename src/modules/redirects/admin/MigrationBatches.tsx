"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/core/Button";
import { rollbackRedirectBatch } from "../actions";
import type { RedirectBatch } from "../queries";
import type { ImportJobSummary } from "@/modules/imports/queries";
import styles from "./redirects.module.css";

/**
 * The migration surface in the SEO hub: import jobs (status of a large ingest)
 * and the redirect batches they (or the bulk mapper) produced, each with a
 * one-click roll back. A batch is a set of redirects sharing a `sourceBatch` id;
 * rolling it back deletes them all — the escape hatch after a bad bulk import.
 */
export function MigrationBatches({
  batches,
  jobs,
}: {
  batches: RedirectBatch[];
  jobs: ImportJobSummary[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [busyBatch, setBusyBatch] = useState<string | null>(null);

  const rollback = (batch: string, count: number) => {
    if (!confirm(`Roll back this batch? ${count} redirect${count === 1 ? "" : "s"} will be deleted.`)) return;
    setBusyBatch(batch);
    startTransition(async () => {
      const res = await rollbackRedirectBatch(batch);
      setBusyBatch(null);
      if (!res.ok) setFlash(res.error);
      else {
        setFlash(null);
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      {jobs.length > 0 ? (
        <section>
          <h3 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" as never }}>
            Import jobs
          </h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Redirects</th>
                <th>Types</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className={styles.path}>{j.source}</td>
                  <td className={styles.code}>
                    {j.status}
                    {j.status === "creating_types" && j.controlMode === "propose_confirm" && !j.confirmed
                      ? " (awaiting confirm)"
                      : ""}
                  </td>
                  <td className={styles.code}>
                    {j.rowsDone}/{j.rowsTotal}
                  </td>
                  <td className={styles.code}>{j.redirectsDone}</td>
                  <td className={styles.code}>{j.typesCreated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section>
        <h3 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" as never }}>
          Redirect batches
        </h3>
        {batches.length === 0 ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            No bulk or imported redirect batches yet. Batches created by the Bulk redirects tab or an
            import appear here and can be rolled back as a unit.
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Redirects</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batch}>
                  <td className={styles.path} style={{ fontFamily: "var(--font-mono)" }}>
                    {b.batch}
                  </td>
                  <td className={styles.code}>{b.count}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => rollback(b.batch, b.count)}
                      loading={pending && busyBatch === b.batch}
                    >
                      Roll back
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {flash ? (
          <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>{flash}</p>
        ) : null}
      </section>
    </div>
  );
}
