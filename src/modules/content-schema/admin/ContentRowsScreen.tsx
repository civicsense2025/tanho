"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/core/Button";
import btn from "@/components/core/Button.module.css";
import type { FieldDef } from "@/modules/custom-types/validation";
import type { ContentRow } from "../crud";
import { deleteRowData, setRowStatus, syncTypeSearchIndex } from "../row-actions";
import { ContentRowForm } from "./ContentRowForm";
import styles from "./content-rows.module.css";

/**
 * Admin screen to manage the ROWS of a table-backed content type: list them,
 * add/edit (ContentRowForm), publish/unpublish, delete, and re-sync the search
 * index. Mirrors entries' ContentScreen shape (a list with a form panel that
 * opens over it), but drives the type's real ct_* table via the row-actions.
 */
export function ContentRowsScreen({
  typeId,
  typeName,
  basePath,
  fields,
  rows,
}: {
  typeId: string;
  typeName: string;
  basePath: string | null;
  fields: FieldDef[];
  rows: ContentRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ContentRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    setEditing(null);
    setCreating(false);
    router.refresh();
  };

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setMsg(res.error ?? "Action failed");
      else {
        if (ok) setMsg(ok);
        router.refresh();
      }
    });
  };

  if (creating || editing) {
    return (
      <ContentRowForm
        typeId={typeId}
        fields={fields}
        initial={editing ?? undefined}
        onDone={refresh}
        onCancel={() => {
          setEditing(null);
          setCreating(false);
        }}
      />
    );
  }

  return (
    <main className={styles.screen}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{typeName} rows</h1>
          {basePath ? (
            <p className={styles.sub}>
              Public at <code>{basePath}</code>
            </p>
          ) : (
            <p className={styles.sub}>Set a base path &amp; publish the type to make these public.</p>
          )}
        </div>
        <span style={{ flex: 1 }} />
        {msg ? <span className={styles.msg}>{msg}</span> : null}
        <Button variant="outline" size="sm" onClick={() => act(() => syncTypeSearchIndex(typeId), "Search synced")} loading={pending}>
          Sync search
        </Button>
        <Button variant="accent" size="sm" onClick={() => setCreating(true)}>
          New row
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>No rows yet. Click “New row” to add one.</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((r) => {
            const id = String(r.id);
            const published = r.status === "published";
            return (
              <li key={id} className={styles.row}>
                <button type="button" className={styles.rowMain} onClick={() => setEditing(r)}>
                  <span className={styles.rowTitle}>{String(r.title) || String(r.slug) || "Untitled"}</span>
                  <span className={styles.rowSlug}>/{String(r.slug)}</span>
                </button>
                <span className={published ? styles.pub : styles.draft}>{published ? "Published" : "Draft"}</span>
                <Link href={`/admin/content/types/${typeId}/rows/${id}/design`} className={`${btn.btn} ${btn.ghost} ${btn.sm}`}>
                  Design layout
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => act(() => setRowStatus(typeId, id, published ? "draft" : "published"))}
                  disabled={pending}
                >
                  {published ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Delete “${String(r.title) || String(r.slug)}”? This can't be undone.`)) {
                      act(() => deleteRowData(typeId, id));
                    }
                  }}
                  disabled={pending}
                >
                  Delete
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
