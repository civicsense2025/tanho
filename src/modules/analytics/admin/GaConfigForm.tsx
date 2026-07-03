"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import type { ConnectState } from "../connect-actions";
import styles from "./analytics.module.css";

/**
 * Small owner-only config field for the non-secret GA4 property id / GSC site
 * URL the ga4 adapter needs to know which property/site to query. Shared
 * between OverviewScreen (GA4) and TrafficScreen (GSC) — same shape, just a
 * different label/placeholder/save action wired in by the caller.
 */
export function GoogleConfigField({
  label,
  placeholder,
  value,
  save,
}: {
  label: string;
  placeholder: string;
  value: string;
  save: (value: string) => Promise<ConnectState>;
}) {
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSave = () =>
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const res = await save(draft);
      if (res.error) setError(res.error);
      else setNotice("Saved.");
    });

  return (
    <div className={styles.gate} style={{ padding: "var(--space-4)" }}>
      <span className={styles.gateNote}>{label}</span>
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          style={{ maxWidth: "360px" }}
        />
        <Button variant="outline" size="sm" onClick={onSave} loading={pending}>
          Save
        </Button>
      </div>
      {error ? <span className={styles.gateNote}>{error}</span> : null}
      {notice ? <span className={styles.gateNote}>{notice}</span> : null}
    </div>
  );
}
