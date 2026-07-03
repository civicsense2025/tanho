"use client";

import { useState, useTransition } from "react";
import { renameTag, deleteTag } from "../actions";
import type { TagWithCount } from "../queries";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import styles from "./tags.module.css";

/** One tag row: name (inline-editable), mono usage count, rename/delete. */
export function TagRow({ tag, onChanged }: { tag: TagWithCount; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await renameTag({ id: tag.id, name });
      if (!res.ok) setError(res.error);
      else {
        setError(null);
        setEditing(false);
        onChanged();
      }
    });

  const remove = () => {
    const msg =
      tag.usage > 0
        ? `Delete "${tag.name}"? It is used on ${tag.usage} item${tag.usage === 1 ? "" : "s"}; those assignments will be removed.`
        : `Delete "${tag.name}"?`;
    if (!window.confirm(msg)) return;
    startTransition(async () => {
      const res = await deleteTag(tag.id);
      if (!res.ok) setError(res.error);
      else onChanged();
    });
  };

  return (
    <div className={styles.row}>
      {editing ? (
        <Input value={name} onChange={(e) => setName(e.target.value)} invalid={!!error} />
      ) : (
        <span className={styles.name}>{tag.name}</span>
      )}
      <span className={styles.usage}>{tag.usage}</span>
      <div className={styles.actions}>
        {error ? <span className={styles.error}>{error}</span> : null}
        {editing ? (
          <>
            <Button variant="accent" size="sm" onClick={save} loading={pending}>
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setName(tag.name);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Rename
            </Button>
            <Button variant="ghost" size="sm" onClick={remove} loading={pending}>
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
