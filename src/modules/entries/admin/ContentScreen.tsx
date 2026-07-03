"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EntitySchemaSummary } from "@/entities/types";
import type { FieldDef } from "@/modules/custom-types/validation";
import type { EntryRow } from "@/modules/entries/schema";
import { deleteEntry } from "@/modules/entries/actions";
import {
  EntityList,
  StatusChip,
  type EntityListColumn,
} from "@/components/admin/EntityList";
import { Button } from "@/components/core/Button";
import { EntryForm } from "./EntryForm";
import styles from "./entry-form.module.css";

/** Renders one list-column cell value from an entry. */
function renderCell(item: EntryRow, key: string): React.ReactNode {
  if (key === "status") return <StatusChip status={item.status} />;

  const value = item.data[key];

  if (Array.isArray(value)) {
    return (
      <span className={styles.cellFaint}>
        {value.map((v) => String(v)).join(" · ")}
      </span>
    );
  }

  if (typeof value === "boolean") {
    const color = value ? "var(--accent-2)" : "var(--text-faint)";
    return (
      <span className={styles.visDot}>
        <span className={styles.dot} style={{ background: color }} />
        {value ? "Public" : "Internal"}
      </span>
    );
  }

  return value === undefined || value === null ? "" : String(value);
}

/**
 * Generic content list screen, reused by the projects / guides / resources
 * routes (and the dynamic /admin/content/[type] route for custom types).
 * Owns the create/edit panel state and refreshes the server list after every
 * mutation. The caller resolves `schema` server-side (via
 * `getEntitySchema`/`entities/registry.ts`) and passes it down — a client
 * component can't await a server lookup mid-render, and custom types are
 * resolved from the DB per-request rather than a static registry Map.
 */
export function ContentScreen({
  schema,
  items,
  customFields,
}: {
  schema: EntitySchemaSummary;
  items: EntryRow[];
  /** For `custom:<slug>` types: threaded through to EntryForm for field-descriptor derivation. */
  customFields?: FieldDef[];
}) {
  const router = useRouter();
  const entity = schema.entity;
  const [editing, setEditing] = useState<EntryRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();

  const label = schema.label;
  const plural = schema.plural;
  const panelOpen = creating || editing !== null;

  const columns: EntityListColumn<EntryRow>[] = schema.listColumns.map((col) => ({
    key: col.key,
    header: col.header,
    width: col.width,
    align: col.align,
    render: (item) => renderCell(item, col.key),
  }));

  const closePanel = () => {
    setCreating(false);
    setEditing(null);
  };

  const onDone = () => {
    closePanel();
    router.refresh();
  };

  const onDelete = (ids: string[]) => {
    startTransition(async () => {
      await Promise.all(ids.map((id) => deleteEntry(id)));
      router.refresh();
    });
  };

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{plural}</h1>
        <span style={{ flex: 1 }} />
        <Button
          variant="accent"
          size="sm"
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
        >
          New {label}
        </Button>
      </div>

      {panelOpen ? (
        <EntryForm
          entity={entity}
          customFields={customFields}
          initial={editing ?? undefined}
          onDone={onDone}
          onCancel={closePanel}
        />
      ) : null}

      <EntityList
        items={items}
        getId={(item) => item.id}
        columns={columns}
        getTitle={(item) => item.title}
        getSubtitle={(item) => item.slug}
        getStatus={(item) => item.status}
        searchValues={(item) => [
          item.title,
          item.slug,
          ...Object.values(item.data).map((v) =>
            Array.isArray(v) ? v.map(String).join(" ") : String(v ?? ""),
          ),
        ]}
        onRowClick={(item) => {
          setCreating(false);
          setEditing(item);
        }}
        selectable
        bulkActions={[
          { label: "Delete", tone: "danger", onAction: (ids) => onDelete(ids) },
        ]}
        emptyLabel={`No ${plural.toLowerCase()} yet. Create your first one.`}
        noun={label}
      />
    </main>
  );
}
