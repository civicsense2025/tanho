"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateTableBackedTypeSchema,
  deleteTableBackedType,
} from "@/modules/content-schema/actions";
import {
  setTableBackedBasePath,
  setTableBackedPresentation,
  setTableBackedPublished,
} from "./table-type-actions";
import type { CustomTypeRow } from "../schema";
import type { FieldDef } from "../validation";
import { Button } from "@/components/core/Button";
import { FieldRow } from "./FieldRow";
import { DataTypeMeta, type DataTypeMetaValue } from "./DataTypeMeta";
import styles from "./types.module.css";

const emptyField = (): FieldDef => ({ key: "", label: "", kind: "text" });

/**
 * One saved **data-backed** content type (a real `ct_*` table). Edits the
 * field definitions (which run ALTER TABLE through updateTableBackedTypeSchema
 * — a change that drops column data prompts a confirm, then re-runs with
 * confirmDataLoss), the public metadata (base path / plural / title-slug
 * pickers), the publish toggle, and delete (force when published). Distinct
 * from TypeCard, which edits legacy JSON-backed types.
 */
export function DataTypeCard({ type }: { type: CustomTypeRow }) {
  const router = useRouter();
  const [fields, setFields] = useState<FieldDef[]>(type.fields);
  const [meta, setMeta] = useState<DataTypeMetaValue>({
    pluralName: type.pluralName ?? "",
    basePath: type.basePath ?? "",
    titleField: type.titleField ?? "title",
    slugField: type.slugField ?? "slug",
  });
  const published = type.status === "published";
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

  const flashOk = (msg: string) => {
    setError(null);
    setFlash(msg);
    setTimeout(() => setFlash(null), 1600);
    router.refresh();
  };

  /** Persist field changes (ALTER TABLE) + the base-path/meta changes. */
  const save = () =>
    startTransition(async () => {
      // 1) Fields → schema DDL. On a data-dropping change, confirm then retry.
      let res = await updateTableBackedTypeSchema(type.id, fields);
      if (!res.ok && res.error.includes("drops data")) {
        const proceed = window.confirm(`${res.error}\n\nDrop the column(s) and their data?`);
        if (!proceed) return;
        res = await updateTableBackedTypeSchema(type.id, fields, { confirmDataLoss: true });
      }
      if (!res.ok) {
        setError(res.error);
        return;
      }

      // 2) Base path (metadata-only, route-guarded).
      const baseRes = await setTableBackedBasePath(type.id, meta.basePath);
      if (!baseRes.ok) {
        setError(baseRes.error);
        return;
      }

      // 3) Presentation metadata (plural + title/slug pickers). The DDL action
      // only writes `fields`, so these go through a dedicated wrapper.
      const metaRes = await setTableBackedPresentation(type.id, {
        pluralName: meta.pluralName,
        titleField: meta.titleField,
        slugField: meta.slugField,
      });
      if (!metaRes.ok) {
        setError(metaRes.error);
        return;
      }
      flashOk("Saved ✓");
    });

  const togglePublish = () =>
    startTransition(async () => {
      const res = await setTableBackedPublished(type.id, !published);
      if (!res.ok) setError(res.error);
      else flashOk(published ? "Unpublished" : "Published ✓");
    });

  const remove = () =>
    startTransition(async () => {
      if (!window.confirm(`Delete data-backed type "${type.name}" and DROP its table?`)) return;
      let res = await deleteTableBackedType(type.id);
      if (!res.ok && res.error.toLowerCase().includes("published")) {
        const force = window.confirm(`${res.error}\n\nForce-delete anyway?`);
        if (!force) return;
        res = await deleteTableBackedType(type.id, { force: true });
      }
      if (!res.ok) setError(res.error);
      else router.refresh();
    });

  return (
    <div className={styles.typeCard} data-testid="data-type-card">
      <div className={styles.typeHead}>
        <strong style={{ fontSize: "var(--text-sm)" }}>{type.name}</strong>
        <span className={styles.badge}>Data-backed</span>
        <span className={styles.tableName}>{type.tableName}</span>
        <span style={{ flex: 1 }} />
        <Link href={`/admin/content/types/${type.id}/rows`} className={styles.cardLink}>
          Manage rows
        </Link>
        <Link href={`/admin/content/types/${type.id}/template/index`} className={styles.cardLink}>
          Index template
        </Link>
        <Link href={`/admin/content/types/${type.id}/template/detail`} className={styles.cardLink}>
          Detail template
        </Link>
        <span className={published ? styles.badge : `${styles.badge} ${styles.badgeMuted}`}>
          {published ? "Published" : "Draft"}
        </span>
        <Button variant="outline" size="sm" onClick={togglePublish} loading={pending}>
          {published ? "Unpublish" : "Publish"}
        </Button>
      </div>

      <DataTypeMeta value={meta} fields={fields} onChange={setMeta} />

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
