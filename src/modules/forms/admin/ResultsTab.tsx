"use client";

import { isScreen } from "../field-kinds";
import type { FormRow, FormResponseRow } from "../schema";
import styles from "./forms.module.css";

/** Results tab — counters plus a responses table (admin-only data). */
export function ResultsTab({
  form,
  responses,
}: {
  form: FormRow;
  responses: FormResponseRow[];
}) {
  const inputFields = form.fields.filter((f) => !isScreen(f.kind));

  return (
    <div className={styles.results}>
      <div className={styles.counters}>
        <Counter label="Views" value={form.analytics.views} />
        <Counter label="Starts" value={form.analytics.starts} />
        <Counter label="Completions" value={form.analytics.completions} />
        <Counter label="Responses" value={responses.length} />
      </div>

      {responses.length === 0 ? (
        <p className={styles.empty}>No responses yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                {inputFields.map((f) => (
                  <th key={f.id}>{f.label || f.id}</th>
                ))}
                {form.type === "quiz" ? <th>Score</th> : null}
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => (
                <tr key={r.id}>
                  <td className={styles.cellFaint}>{new Date(r.at).toLocaleString()}</td>
                  {inputFields.map((f) => (
                    <td key={f.id}>{formatValue(r.values[f.id])}</td>
                  ))}
                  {form.type === "quiz" ? <td>{r.outcome ?? r.score ?? ""}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.counter}>
      <span className={styles.counterValue}>{value}</span>
      <span className={styles.counterLabel}>{label}</span>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join(", ");
  if (v === undefined || v === null) return "";
  return String(v).slice(0, 120);
}
