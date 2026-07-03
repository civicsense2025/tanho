"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import type { FormRow, FormResponseRow } from "../schema";
import { updateForm, duplicateForm } from "../actions";
import { useFormEditor } from "./use-form-editor";
import { BuildTab } from "./BuildTab";
import { DesignTab } from "./DesignTab";
import { SettingsTab } from "./SettingsTab";
import { ShareTab } from "./ShareTab";
import { ResultsTab } from "./ResultsTab";
import styles from "./forms.module.css";

const TABS = ["Build", "Design", "Settings", "Share", "Results"] as const;
type Tab = (typeof TABS)[number];

/** The [id] form editor — five tabs over one local draft, saved as a whole. */
export function FormBuilder({
  form,
  responses,
  paymentsEnabled,
}: {
  form: FormRow;
  responses: FormResponseRow[];
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const editor = useFormEditor(form);
  const [tab, setTab] = useState<Tab>("Build");
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (status?: FormRow["status"]) => {
    setError(null);
    startSave(async () => {
      const res = await updateForm(form.id, {
        ...editor.draft,
        status: status ?? editor.draft.status,
      });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <Input
          value={editor.draft.name}
          onChange={(e) => editor.patch({ name: e.target.value })}
          className={styles.nameInput}
          aria-label="Form name"
        />
        <span style={{ flex: 1 }} />
        <Button
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() =>
            startSave(async () => {
              const res = await duplicateForm(form.id);
              if (res.ok && res.data) router.push(`/admin/content/forms/${res.data.id}`);
            })
          }
        >
          Duplicate
        </Button>
        <Button variant="outline" size="sm" disabled={saving} onClick={() => save("draft")}>
          Save draft
        </Button>
        <Button variant="accent" size="sm" disabled={saving} onClick={() => save("published")}>
          {editor.draft.status === "published" ? "Update" : "Publish"}
        </Button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <nav className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Build" ? <BuildTab editor={editor} paymentsEnabled={paymentsEnabled} /> : null}
      {tab === "Design" ? <DesignTab editor={editor} /> : null}
      {tab === "Settings" ? <SettingsTab editor={editor} /> : null}
      {tab === "Share" ? <ShareTab form={form} /> : null}
      {tab === "Results" ? <ResultsTab form={form} responses={responses} /> : null}
    </div>
  );
}

export type Editor = ReturnType<typeof useFormEditor>;
