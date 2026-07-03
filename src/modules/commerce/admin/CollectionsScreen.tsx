"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/core/Button";
import type { CollectionWithCount } from "../queries";
import { CollectionSheet } from "./CollectionSheet";
import { SetupChecklist, type SetupChecklistItem } from "./SetupChecklist";
import styles from "./commerce.module.css";

/** Collections card grid with an inline create/edit sheet. */
export function CollectionsScreen({
  collections,
  setupItems,
}: {
  collections: CollectionWithCount[];
  setupItems?: SetupChecklistItem[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CollectionWithCount | null>(null);
  const [creating, setCreating] = useState(false);

  const close = () => {
    setEditing(null);
    setCreating(false);
  };
  const done = () => {
    close();
    router.refresh();
  };

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Collections</h1>
        <span style={{ flex: 1 }} />
        <Button
          variant="accent"
          size="sm"
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
        >
          + Collection
        </Button>
      </div>

      {setupItems ? <SetupChecklist items={setupItems} /> : null}

      {creating || editing ? (
        <CollectionSheet collection={editing} onDone={done} onCancel={close} />
      ) : null}

      {collections.length === 0 ? (
        <div className={styles.lockedBody}>No collections yet. Create your first one.</div>
      ) : (
        <div className={styles.cardGrid}>
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.card}
              onClick={() => {
                setCreating(false);
                setEditing(c);
              }}
            >
              {c.coverMediaId ? (
                // eslint-disable-next-line @next/next/no-img-element -- author media cover; next/image needs sizing + loader config
                <img src={c.coverMediaId} alt="" className={styles.cardCover} />
              ) : (
                <span className={styles.cardCoverEmpty} aria-hidden />
              )}
              <span className={styles.cardBody}>
                <span className={styles.cardName}>{c.name}</span>
                <span className={styles.cardMeta}>
                  <span>
                    {c.productCount} {c.productCount === 1 ? "product" : "products"}
                  </span>
                  <span>·</span>
                  <span>{c.visible ? "Visible" : "Hidden"}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
