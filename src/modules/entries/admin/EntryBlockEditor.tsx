"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BlockNode } from "@/blocks/types";
import type { EntryRow } from "@/modules/entries/schema";
import type { EntitySchemaSummary } from "@/entities/types";
import type { FieldDef } from "@/modules/custom-types/validation";
import {
  updateEntry,
  saveEntryDraftBlocks,
  publishEntryBlocks,
  deleteEntry,
} from "@/modules/entries/actions";
import { descriptorsFromFieldDefs } from "@/modules/custom-types/admin/descriptors";
import { FIELD_DESCRIPTORS } from "./field-descriptors";
import { BlockCanvasEditor } from "@/editor/BlockCanvasEditor";
import { useAutosave } from "@/editor/useAutosave";
import { EntrySettingsPanel } from "./EntrySettingsPanel";
import shell from "@/editor/editor-shell.module.css";

export type EntryDraft = {
  title: string;
  slug: string;
  status: "draft" | "published";
  data: Record<string, unknown>;
};

const toDraft = (entry: EntryRow): EntryDraft => ({
  title: entry.title,
  slug: entry.slug,
  status: entry.status,
  data: entry.data,
});

/**
 * Fullscreen block editor for an entry (project, guide, resource, or custom type).
 * Mirrors the page-builder experience: the canvas is the entry's block tree,
 * and the right-rail inspector holds the entry's title/slug/status plus its
 * per-type data fields.
 */
export function EntryBlockEditor({
  entry,
  initialBlocks,
  publishedBlocks,
  headerBlocks,
  footerBlocks,
  enabledTypes,
  customFields,
  schema,
}: {
  entry: EntryRow;
  initialBlocks: BlockNode[];
  publishedBlocks: BlockNode[];
  headerBlocks: BlockNode[];
  footerBlocks: BlockNode[];
  enabledTypes?: string[];
  customFields?: FieldDef[];
  schema: EntitySchemaSummary;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<EntryDraft>(() => toDraft(entry));
  const [draftDiffers, setDraftDiffers] = useState(
    JSON.stringify(initialBlocks) !== JSON.stringify(publishedBlocks),
  );
  const [, setPublishState] = useState<string | null>(null);

  const descriptors = useMemo(() => {
    if (entry.type.startsWith("custom:") && customFields) {
      return descriptorsFromFieldDefs(customFields);
    }
    return FIELD_DESCRIPTORS[entry.type] ?? [];
  }, [entry.type, customFields]);

  const { saveState, errorMessage, schedule, resetBaseline, cancel } = useAutosave<EntryDraft>({
    save: async (next) => {
      const res = await updateEntry(entry.id, next);
      return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Save failed" };
    },
  });

  useEffect(() => {
    resetBaseline(toDraft(entry));
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  const patch = useCallback(
    (partial: Partial<EntryDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...partial };
        schedule(next, "text");
        return next;
      });
    },
    [schedule],
  );

  const patchDataField = useCallback(
    (key: string, value: unknown) => {
      setDraft((prev) => {
        const nextData = { ...prev.data, [key]: value };
        const next = { ...prev, data: nextData };
        schedule(next, "text");
        return next;
      });
    },
    [schedule],
  );

  const onPublish = useCallback(async () => {
    const res = await publishEntryBlocks(entry.id);
    if (!res.ok) return { ok: false, error: res.error ?? "Publish failed" };
    const statusRes = await updateEntry(entry.id, { status: "published" });
    if (!statusRes.ok) return { ok: false, error: statusRes.error ?? "Publish failed" };
    setDraft((prev) => ({ ...prev, status: "published" }));
    setDraftDiffers(false);
    return { ok: true };
  }, [entry.id]);

  const onDelete = useCallback(async () => {
    if (!window.confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    setPublishState("Deleting…");
    const res = await deleteEntry(entry.id);
    if (!res.ok) {
      setPublishState(res.error ?? "Delete failed");
      return;
    }
    router.push("/admin");
  }, [entry.id, entry.title, router]);

  return (
    <BlockCanvasEditor
      ownerType={`entry:${entry.type}`}
      ownerId={entry.id}
      initialBlocks={initialBlocks}
      initialDraftDiffers={draftDiffers}
      status={draft.status}
      headerBlocks={headerBlocks}
      footerBlocks={footerBlocks}
      enabledTypes={enabledTypes}
      settingsLabel={schema.label}
      screenLabel={`${schema.label} content · ${draft.title}`}
      topBarLeft={
        <Link href="/admin" className={shell.back}>
          ← {schema.label}
        </Link>
      }
      onSaveBlocks={async (tree) => {
        const res = await saveEntryDraftBlocks(entry.id, tree);
        return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Save failed" };
      }}
      onPublish={onPublish}
      settingsPanel={
        <EntrySettingsPanel
          draft={draft}
          patch={patch}
          patchDataField={patchDataField}
          descriptors={descriptors}
          label={schema.label}
          saveState={saveState}
          errorMessage={errorMessage}
          onDelete={onDelete}
        />
      }
    />
  );
}
