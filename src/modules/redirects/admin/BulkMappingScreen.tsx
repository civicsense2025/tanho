"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Section } from "@/components/admin/Section";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/core/Button";
import { commitBulkRedirects, proposeBulkRedirects, rollbackRedirectBatch } from "../actions";
import type { MappingProposal } from "../bulk-mapping";
import type { SafetyIssue, SafetyReport } from "../safety";
import styles from "./bulk-mapping.module.css";

type Mode = "paste" | "csv" | "sitemap-url";

/** A review row = a proposal plus the operator's edits (kept flag, edited to). */
type ReviewRow = {
  from: string;
  to: string; // "" means a Gone (410) row
  confidence: number;
  reason: MappingProposal["reason"];
  note?: string;
  keep: boolean;
};

const MODE_LABEL: Record<Mode, string> = {
  paste: "Paste list",
  csv: "CSV",
  "sitemap-url": "Sitemap URL",
};

function toReviewRows(proposals: MappingProposal[]): ReviewRow[] {
  return proposals.map((p) => ({
    from: p.from,
    to: p.to ?? "",
    confidence: p.confidence,
    reason: p.reason,
    note: p.note,
    // Identity rows do nothing — default them to skipped.
    keep: p.reason !== "identity",
  }));
}

function badgeClass(reason: MappingProposal["reason"]): string {
  switch (reason) {
    case "identity":
      return `${styles.badge} ${styles.badgeIdentity}`;
    case "exact-existing":
      return `${styles.badge} ${styles.badgeExact}`;
    case "similar":
      return `${styles.badge} ${styles.badgeSimilar}`;
    case "none-gone":
      return `${styles.badge} ${styles.badgeGone}`;
  }
}

function badgeText(reason: MappingProposal["reason"]): string {
  switch (reason) {
    case "identity":
      return "identity";
    case "exact-existing":
      return "exact";
    case "similar":
      return "similar";
    case "none-gone":
      return "gone (410)";
  }
}

function IssueBlock({
  variant,
  title,
  issues,
}: {
  variant: "error" | "warn";
  title: string;
  issues: SafetyIssue[];
}) {
  if (issues.length === 0) return null;
  return (
    <div
      className={`${styles.issueBlock} ${
        variant === "error" ? styles.issueBlockError : styles.issueBlockWarn
      }`}
    >
      <p className={styles.issueHeading}>
        {title} ({issues.length})
      </p>
      <ul className={styles.issueList}>
        {issues.map((issue, i) => (
          <li key={i} className={styles.issueItem}>
            {issue.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Bulk redirect mapping — a review-then-commit migration screen. Paste a URL
 * list / CSV, or point at a remote sitemap; the server proposes exact
 * redirects (with confidence + a reason), runs author-safety validators, and
 * only writes on Commit. A committed batch can be rolled back as a unit.
 */
export function BulkMappingScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");

  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [safety, setSafety] = useState<SafetyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ count: number; batch: string } | null>(null);
  const [pending, start] = useTransition();

  const hasErrors = (safety?.errors.length ?? 0) > 0;
  const keptCount = useMemo(() => rows?.filter((r) => r.keep).length ?? 0, [rows]);

  const resetResults = () => {
    setRows(null);
    setSafety(null);
    setReceipt(null);
  };

  const analyze = () => {
    setError(null);
    resetResults();
    start(async () => {
      const res = await proposeBulkRedirects({
        mode,
        text: mode === "sitemap-url" ? undefined : text,
        url: mode === "sitemap-url" ? url : undefined,
      });
      if (!res.ok) return setError(res.error);
      setRows(toReviewRows(res.data!.proposals));
      setSafety(res.data!.safety);
    });
  };

  const commit = () => {
    if (!rows) return;
    setError(null);
    const payload = rows
      .filter((r) => r.keep)
      .map((r) => ({ from: r.from, to: r.to.trim() === "" ? null : r.to.trim() }));
    if (payload.length === 0) return setError("No rows are selected to commit.");
    start(async () => {
      const res = await commitBulkRedirects({ rows: payload });
      if (!res.ok) return setError(res.error);
      setReceipt(res.data!);
      setRows(null);
      setSafety(null);
      router.refresh();
    });
  };

  const rollback = (batch: string) => {
    setError(null);
    start(async () => {
      const res = await rollbackRedirectBatch(batch);
      if (!res.ok) return setError(res.error);
      setReceipt(null);
      router.refresh();
    });
  };

  const setRow = (from: string, patch: Partial<ReviewRow>) =>
    setRows((prev) => (prev ? prev.map((r) => (r.from === from ? { ...r, ...patch } : r)) : prev));

  return (
    <div className={styles.screen}>
      <Section
        title="Bulk redirects"
        desc="Paste a list of old URLs (one per line, or from → to), a 2-column CSV, or a sitemap URL. Nothing is written until you review and commit."
      >
        <div className={styles.modeRow}>
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ""}`}
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
                resetResults();
              }}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "var(--space-4)" }}>
          {mode === "sitemap-url" ? (
            <Field label="Sitemap URL" hint="https:// only — fetched server-side with SSRF protection.">
              <Input
                type="url"
                placeholder="https://old-site.example.com/sitemap.xml"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Field>
          ) : (
            <Field
              label={mode === "csv" ? "CSV (from,to)" : "URL list"}
              hint={
                mode === "csv"
                  ? "First row may be a header (from,to). Quoted fields supported."
                  : "One per line: `/old`, `/old,/new`, or `/old → /new`."
              }
            >
              <Textarea
                className={styles.textarea}
                value={text}
                placeholder={mode === "csv" ? "from,to\n/old-page,/new-page" : "/old-page → /new-page\n/gone-page"}
                onChange={(e) => setText(e.target.value)}
              />
            </Field>
          )}
        </div>

        <div style={{ marginTop: "var(--space-4)" }}>
          <Button variant="accent" size="sm" onClick={analyze} loading={pending}>
            Analyze
          </Button>
        </div>
      </Section>

      {error ? <p className={styles.error}>{error}</p> : null}

      {receipt ? (
        <div className={styles.receipt}>
          <p style={{ margin: 0 }}>
            Committed {receipt.count} redirect{receipt.count === 1 ? "" : "s"}.
          </p>
          <p className={styles.batchId}>Batch: {receipt.batch}</p>
          <Button variant="ghost" size="sm" onClick={() => rollback(receipt.batch)} loading={pending}>
            Roll back this batch
          </Button>
        </div>
      ) : null}

      {safety && (safety.errors.length > 0 || safety.warnings.length > 0) ? (
        <div className={styles.issues}>
          <IssueBlock variant="error" title="Errors — fix before committing" issues={safety.errors} />
          <IssueBlock variant="warn" title="Warnings" issues={safety.warnings} />
        </div>
      ) : null}

      {rows ? (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem" }} aria-label="keep" />
                <th>From</th>
                <th>To (blank = 410 Gone)</th>
                <th>Reason</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.from} className={r.keep ? "" : styles.rowSkipped}>
                  <td>
                    <input
                      type="checkbox"
                      checked={r.keep}
                      aria-label={`Keep redirect for ${r.from}`}
                      onChange={(e) => setRow(r.from, { keep: e.target.checked })}
                    />
                  </td>
                  <td className={styles.from} title={r.note}>
                    {r.from}
                  </td>
                  <td>
                    <input
                      className={`${styles.toInput}`}
                      value={r.to}
                      placeholder="/new-path (blank = 410)"
                      onChange={(e) => setRow(r.from, { to: e.target.value })}
                    />
                  </td>
                  <td>
                    <span className={badgeClass(r.reason)}>{badgeText(r.reason)}</span>
                  </td>
                  <td className={styles.confidence}>{Math.round(r.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.commitBar}>
            <Button
              variant="accent"
              size="sm"
              onClick={commit}
              loading={pending}
              disabled={hasErrors || keptCount === 0}
            >
              Commit {keptCount} redirect{keptCount === 1 ? "" : "s"}
            </Button>
            {hasErrors ? (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)" }}>
                Resolve the errors above to enable commit.
              </span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
