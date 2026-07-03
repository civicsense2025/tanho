"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/core/Button";
import { Toggle } from "@/components/admin/Seg";
import type { ExtensionsSettings } from "../validation";
import { saveExtensions } from "../admin-actions";
import { ExtensionSettingsFields } from "./ExtensionSettingsFields";
import styles from "./scheduling.module.css";

/** Extensions tab — toggle cards that expand inline settings while on. */
export function ExtensionsTab({ extensions }: { extensions: ExtensionsSettings }) {
  const router = useRouter();
  const [items, setItems] = useState(extensions.items);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const toggle = (id: string, on: boolean) =>
    setItems((cur) => cur.map((e) => (e.id === id ? { ...e, on } : e)));

  const patchSettings = (id: string, patch: Record<string, unknown>) =>
    setItems((cur) =>
      cur.map((e) => (e.id === id ? { ...e, settings: { ...e.settings, ...patch } } : e)),
    );

  const save = async () => {
    setPending(true);
    setError(null);
    setNotice(null);
    const res = await saveExtensions({ items });
    setPending(false);
    if (res.ok) {
      setNotice("Extensions saved.");
      router.refresh();
    } else setError(res.error);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className={styles.cardGrid}>
        {items.map((e) => (
          <div key={e.id} className={styles.card}>
            <div className={styles.headerRow}>
              <span className={styles.label}>{e.label || e.id}</span>
              <span style={{ flex: 1 }} />
              <Toggle value={e.on} onChange={(on) => toggle(e.id, on)} />
            </div>
            <span className={styles.mono}>{e.id}</span>
            {e.on ? (
              <ExtensionSettingsFields
                extension={e}
                onPatch={(patch) => patchSettings(e.id, patch)}
              />
            ) : null}
          </div>
        ))}
      </div>
      {items.length === 0 ? (
        <p className={styles.faint}>No extensions configured.</p>
      ) : null}
      {error ? <span className={styles.error}>{error}</span> : null}
      {notice ? <span className={styles.notice}>{notice}</span> : null}
      <div className={styles.actions}>
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          Save extensions
        </Button>
      </div>
    </div>
  );
}
