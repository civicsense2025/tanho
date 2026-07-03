"use client";

import { useCallback, useMemo, useState } from "react";
import { createId } from "@paralleldrive/cuid2";
import type { FormRow } from "../schema";
import type { FormDesign, FormField, FormSettings, QuizConfig } from "../validation";
import type { FieldKind } from "../field-kinds";
import { hasOptions } from "../field-kinds";

export type FormDraft = {
  name: string;
  type: FormRow["type"];
  status: FormRow["status"];
  fields: FormField[];
  design: FormDesign;
  settings: FormSettings;
  quiz: QuizConfig | null;
};

const emptyField = (kind: FieldKind): FormField => ({
  id: `f_${createId().slice(0, 8)}`,
  kind,
  label: "",
  required: false,
  placeholder: "",
  help: "",
  options: hasOptions(kind) ? [{ label: "Option 1", value: "option-1" }] : [],
  correct: [],
  points: 0,
  default: "",
  pattern: "",
  currency: "usd",
  multi: false,
  accept: "",
  amountCents: 0,
});

/** Local editing state for the FormBuilder — the single source until Save. */
export function useFormEditor(row: FormRow) {
  const [draft, setDraft] = useState<FormDraft>(() => ({
    name: row.name,
    type: row.type,
    status: row.status,
    fields: row.fields,
    design: row.design,
    settings: row.settings,
    quiz: row.quiz ?? null,
  }));

  const patch = useCallback((p: Partial<FormDraft>) => setDraft((d) => ({ ...d, ...p })), []);

  const addField = useCallback(
    (kind: FieldKind) => setDraft((d) => ({ ...d, fields: [...d.fields, emptyField(kind)] })),
    [],
  );

  const updateField = useCallback(
    (id: string, p: Partial<FormField>) =>
      setDraft((d) => ({
        ...d,
        fields: d.fields.map((f) => (f.id === id ? { ...f, ...p } : f)),
      })),
    [],
  );

  const removeField = useCallback(
    (id: string) => setDraft((d) => ({ ...d, fields: d.fields.filter((f) => f.id !== id) })),
    [],
  );

  const moveField = useCallback(
    (id: string, dir: -1 | 1) =>
      setDraft((d) => {
        const i = d.fields.findIndex((f) => f.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= d.fields.length) return d;
        const next = [...d.fields];
        [next[i], next[j]] = [next[j]!, next[i]!];
        return { ...d, fields: next };
      }),
    [],
  );

  const patchSettings = useCallback(
    (p: Partial<FormSettings>) => setDraft((d) => ({ ...d, settings: { ...d.settings, ...p } })),
    [],
  );

  const patchDesign = useCallback(
    (p: Partial<FormDesign>) => setDraft((d) => ({ ...d, design: { ...d.design, ...p } })),
    [],
  );

  const api = useMemo(
    () => ({ patch, addField, updateField, removeField, moveField, patchSettings, patchDesign }),
    [patch, addField, updateField, removeField, moveField, patchSettings, patchDesign],
  );

  return { draft, ...api };
}
