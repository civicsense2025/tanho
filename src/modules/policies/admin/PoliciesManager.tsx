"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/core/Button";
import { deletePolicy, savePolicy } from "../actions";
import type { PolicyRow } from "../queries";
import { PolicyEditor } from "./PolicyEditor";
import { emptyDraft, rowToDraft, type PolicyDraft } from "./types";
import styles from "./policies.module.css";

const GROUPS = [
  { id: "site", label: "Site" },
  { id: "store", label: "Store" },
] as const;

/** Two-pane policies admin: grouped list on the left, editor on the right. */
export function PoliciesManager({ policies }: { policies: PolicyRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<PolicyDraft>(
    policies[0] ? rowToDraft(policies[0]) : emptyDraft(),
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const patch = (next: Partial<PolicyDraft>) => {
    setDraft((p) => ({ ...p, ...next }));
    setFlash(null);
  };

  const save = () =>
    startTransition(async () => {
      const res = await savePolicy(draft.id, draft);
      if (res.error) setFlash(res.error);
      else {
        if (res.id) setDraft((p) => ({ ...p, id: res.id! }));
        setFlash("Saved");
        router.refresh();
      }
    });

  const remove = () =>
    startTransition(async () => {
      if (!draft.id) return;
      const res = await deletePolicy(draft.id);
      if (res.error) setFlash(res.error);
      else {
        setDraft(emptyDraft());
        router.refresh();
      }
    });

  return (
    <div className={styles.wrap}>
      <div className={styles.list}>
        {GROUPS.map((g) => (
          <div key={g.id}>
            <p className={styles.groupHead}>{g.label}</p>
            {policies
              .filter((p) => p.group === g.id)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.item} ${draft.id === p.id ? styles.itemActive : ""}`}
                  onClick={() => setDraft(rowToDraft(p))}
                >
                  <span
                    aria-hidden
                    className={`${styles.dot} ${
                      p.status === "published" ? styles.dotPublished : styles.dotDraft
                    }`}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>{p.title}</span>
                </button>
              ))}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setDraft(emptyDraft())}>
          New policy
        </Button>
      </div>

      <div>
        {flash ? (
          <p
            style={{
              margin: "0 0 var(--space-3)",
              fontSize: "var(--text-xs)",
              color: flash === "Saved" ? "var(--success)" : "var(--danger)",
            }}
          >
            {flash}
          </p>
        ) : null}
        <PolicyEditor
          draft={draft}
          onChange={patch}
          onSave={save}
          onDelete={remove}
          saving={pending}
        />
      </div>
    </div>
  );
}
