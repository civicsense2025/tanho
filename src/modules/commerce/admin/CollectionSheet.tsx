"use client";

import { useState, useTransition } from "react";
import { Section, Row } from "@/components/admin/Section";
import { Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/core/Button";
import { MediaPicker } from "@/modules/media/admin/MediaPicker";
import {
  createCollection,
  deleteCollection,
  updateCollection,
} from "../collection-actions";
import type { CollectionWithCount } from "../queries";
import styles from "./commerce.module.css";

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
}

/** Inline create/edit panel for one collection. */
export function CollectionSheet({
  collection,
  onDone,
  onCancel,
}: {
  collection: CollectionWithCount | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = collection !== null;
  const [name, setName] = useState(collection?.name ?? "");
  const [slug, setSlug] = useState(collection?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(collection?.description ?? "");
  const [cover, setCover] = useState(collection?.coverMediaId ?? "");
  const [visible, setVisible] = useState(collection?.visible ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setError(null);
      const input = {
        name,
        slug,
        description,
        coverMediaId: cover || null,
        visible,
        seo: { title: "", description: "" },
      };
      const res = isEdit
        ? await updateCollection(collection.id, input)
        : await createCollection(input);
      if (!res.ok) return setError(res.error);
      onDone();
    });

  const remove = () =>
    startTransition(async () => {
      if (!collection) return;
      if (!window.confirm(`Delete "${collection.name}"?`)) return;
      const res = await deleteCollection(collection.id);
      if (res.ok) onDone();
      else setError(res.error);
    });

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <strong>{isEdit ? "Edit collection" : "New collection"}</strong>
        <span style={{ flex: 1 }} />
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>
      <Section title="Details">
        <Row label="Name">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Row>
        <Row label="Slug">
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
          />
        </Row>
        <Row label="Description" stack>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Row>
        <Row label="Cover" stack>
          <MediaPicker value={cover} onChange={setCover} />
        </Row>
        <Row label="Visible">
          <Toggle value={visible} onChange={setVisible} />
        </Row>
      </Section>
      <div className={styles.actions}>
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          {isEdit ? "Save" : "Create"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <span style={{ flex: 1 }} />
        {isEdit ? (
          <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
