"use client";

import { useState, useTransition } from "react";
import { Section, Row } from "@/components/admin/Section";
import { Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/core/Button";
import { MediaPicker } from "@/modules/media/admin/MediaPicker";
import type { BlockNode } from "@/blocks/types";
import { BlockCanvasEditor } from "@/editor/BlockCanvasEditor";
import { saveOwnerBlocks } from "@/modules/blocks/actions";
import {
  createCollection,
  deleteCollection,
  loadCollectionForContentEdit,
  publishCollectionBlocks,
  updateCollection,
} from "../collection-actions";
import type { CollectionWithCount } from "../queries";
import { slugify, slugifyLive } from "@/lib/slug";
import styles from "./commerce.module.css";
import shell from "@/editor/editor-shell.module.css";

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

  // Content blocks: loaded on demand, only possible once the collection has
  // a real id — a brand-new not-yet-created collection has nothing to key
  // block storage on, same gate EntryForm uses for entries.
  const [contentBlocks, setContentBlocks] = useState<{
    blocks: BlockNode[];
    dirty: boolean;
    headerBlocks: BlockNode[];
    footerBlocks: BlockNode[];
  } | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const openContentEditor = () => {
    if (!collection) return;
    setContentError(null);
    setContentLoading(true);
    startTransition(async () => {
      const res = await loadCollectionForContentEdit(collection.id);
      setContentLoading(false);
      if (!res.ok) {
        setContentError(res.error);
        return;
      }
      setContentBlocks({
        blocks: res.data!.blocks,
        dirty: JSON.stringify(res.data!.blocks) !== JSON.stringify(res.data!.publishedBlocks),
        headerBlocks: res.data!.headerBlocks,
        footerBlocks: res.data!.footerBlocks,
      });
    });
  };

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

  if (collection && contentBlocks) {
    return (
      <BlockCanvasEditor
        ownerType="collection"
        ownerId={collection.id}
        initialBlocks={contentBlocks.blocks}
        initialDraftDiffers={contentBlocks.dirty}
        status={collection.visible ? "published" : "draft"}
        headerBlocks={contentBlocks.headerBlocks}
        footerBlocks={contentBlocks.footerBlocks}
        settingsPanel={<p className={styles.syncLine}>Editing content for {collection.name || "this collection"}.</p>}
        settingsLabel="Collection"
        topBarLeft={
          <button type="button" className={shell.back} onClick={() => setContentBlocks(null)}>
            ← {collection.name || "Collection"}
          </button>
        }
        screenLabel={`Collection content · ${collection.name}`}
        onSaveBlocks={(tree) => saveOwnerBlocks("collection", collection.id, tree)}
        onPublish={() => publishCollectionBlocks(collection.id)}
      />
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <strong>{isEdit ? "Edit collection" : "New collection"}</strong>
        <span style={{ flex: 1 }} />
        {error ? <span className={styles.error}>{error}</span> : null}
        {contentError ? <span className={styles.error}>{contentError}</span> : null}
      </div>
      <Section title="Details">
        <Row label="Name">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              // slugifyLive (not slugify) while typing: keeps a trailing hyphen so
              // hyphenated slugs remain typeable; slugify normalizes on save.
              if (!slugTouched) setSlug(slugifyLive(e.target.value));
            }}
          />
        </Row>
        <Row label="Slug">
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugifyLive(e.target.value));
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
        {isEdit ? (
          <Button variant="outline" size="sm" onClick={openContentEditor} loading={contentLoading}>
            Edit content
          </Button>
        ) : null}
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
