"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCustomType, deleteCustomType } from "../actions";
import type { CustomTypeRow } from "../schema";
import type { FieldDef } from "../validation";
import { Toggle } from "@/components/admin/Seg";
import { Button } from "@/components/core/Button";
import { FieldRow } from "./FieldRow";
import styles from "./types.module.css";

const emptyField = (): FieldDef => ({ key: "", label: "", kind: "text" });

/** One saved custom type: field builder, enable toggle, save/delete. */
export function TypeCard({ type }: { type: CustomTypeRow }) {
  const router = useRouter();
  const [fields, setFields] = useState<FieldDef[]>(type.fields);
  const [enabled, setEnabled] = useState(type.enabled);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setField = (i: number, next: FieldDef) => {
    const copy = [...fields];
    copy[i] = next;
    setFields(copy);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const copy = [...fields];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setFields(copy);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveCustomType({ slug: type.slug, name: type.name, fields, enabled });
      if (!res.ok) setError(res.error);
      else {
        setError(null);
        setFlash("Saved ✓");
        setTimeout(() => setFlash(null), 1600);
        router.refresh();
      }
    });

  const remove = () => {
    if (!window.confirm(`Delete content type "${type.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteCustomType(type.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className={styles.typeCard}>
      <div className={styles.typeHead}>
        <strong style={{ fontSize: "var(--text-sm)" }}>{type.name}</strong>
        <span className={styles.slug}>custom:{type.slug}</span>
        <span style={{ flex: 1 }} />
        <Toggle value={enabled} onChange={setEnabled} on="Enabled" off="Disabled" />
      </div>

      <div className={styles.fields}>
        {fields.map((f, i) => (
          <FieldRow
            key={i}
            field={f}
            depth={0}
            onChange={(next) => setField(i, next)}
            onRemove={() => setFields(fields.filter((_, j) => j !== i))}
            onMove={(dir) => move(i, dir)}
          />
        ))}
      </div>

      <div className={styles.actions}>
        <Button variant="outline" size="sm" onClick={() => setFields([...fields, emptyField()])}>
          Add field
        </Button>
        <span style={{ flex: 1 }} />
        {error ? <span className={styles.error}>{error}</span> : null}
        {flash ? (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--success)" }}>{flash}</span>
        ) : null}
        <Button variant="ghost" size="sm" onClick={remove} loading={pending}>
          Delete
        </Button>
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          Save
        </Button>
      </div>
    </div>
  );
}
