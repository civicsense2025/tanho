"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  EntityList,
  StatusChip,
  type EntityListColumn,
} from "@/components/admin/EntityList";
import { Button } from "@/components/core/Button";
import type { FormRow } from "../schema";
import { createForm, deleteForm } from "../actions";
import { FORM_DESIGN_DEFAULTS, FORM_SETTINGS_DEFAULTS } from "../validation";
import styles from "./forms.module.css";

const TYPE_LABEL: Record<string, string> = { form: "Form", quiz: "Quiz", signup: "Signup" };

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "0%");

/** Forms list — type pill, funnel counters, status; +New per type. */
export function FormsScreen({ items }: { items: FormRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const onNew = (type: "form" | "quiz" | "signup") => {
    if (busy) return;
    setBusy(true);
    startTransition(async () => {
      const res = await createForm({
        name: `Untitled ${TYPE_LABEL[type].toLowerCase()}`,
        type,
        status: "draft",
        fields: [],
        design: FORM_DESIGN_DEFAULTS,
        settings: FORM_SETTINGS_DEFAULTS,
        quiz: type === "quiz" ? { mode: "score", outcomes: [] } : null,
      });
      setBusy(false);
      if (res.ok && res.data) router.push(`/admin/content/forms/${res.data.id}`);
    });
  };

  const columns: EntityListColumn<FormRow>[] = [
    {
      key: "type",
      header: "Type",
      width: "6rem",
      render: (f) => <span className={styles.typePill}>{TYPE_LABEL[f.type] ?? f.type}</span>,
    },
    { key: "views", header: "Views", width: "5rem", render: (f) => f.analytics.views },
    { key: "starts", header: "Starts", width: "5rem", render: (f) => f.analytics.starts },
    {
      key: "completions",
      header: "Done",
      width: "8rem",
      render: (f) => `${f.analytics.completions} · ${pct(f.analytics.completions, f.analytics.views)}`,
    },
    { key: "status", header: "Status", width: "6rem", render: (f) => <StatusChip status={f.status} /> },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Forms</h1>
        <span style={{ flex: 1 }} />
        <Button variant="outline" size="sm" disabled={pending} onClick={() => onNew("form")}>
          New form
        </Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => onNew("quiz")}>
          New quiz
        </Button>
        <Button variant="accent" size="sm" disabled={pending} onClick={() => onNew("signup")}>
          New signup
        </Button>
      </div>

      <EntityList
        items={items}
        getId={(f) => f.id}
        columns={columns}
        getTitle={(f) => f.name}
        getStatus={(f) => f.status}
        searchValues={(f) => [f.name, f.type, f.status]}
        editHref={(f) => `/admin/content/forms/${f.id}`}
        selectable
        bulkActions={[
          {
            label: "Delete",
            tone: "danger",
            onAction: (ids) =>
              startTransition(async () => {
                await Promise.all(ids.map((id) => deleteForm(id)));
                router.refresh();
              }),
          },
        ]}
        emptyLabel="No forms yet. Create your first one."
        noun="form"
      />
    </main>
  );
}
