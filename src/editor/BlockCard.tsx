"use client";

import { useState } from "react";
import { blockDef } from "@/blocks/registry";
import { isContainer, kidsOf } from "@/blocks/tree";
import { UnsupportedBlock } from "@/blocks/UnsupportedBlock";
import type { BlockNode } from "@/blocks/types";
import { ValueField } from "./ValueField";
import { EmbedUrlField } from "./EmbedUrlField";
import type { EmbedProvider } from "@/modules/embeds/resolve";
import styles from "./editor.module.css";

/** One block's editing card in the stacked layout. */
export function BlockCard({
  block,
  index,
  total,
  onPatch,
  onMove,
  onDuplicate,
  onRemove,
}: {
  block: BlockNode;
  index: number;
  total: number;
  onPatch: (content: Record<string, unknown>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const def = blockDef(block.type);
  if (!def) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Unsupported block ({block.type})</span>
          <span style={{ flex: 1 }} />
          <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="Remove" onClick={onRemove}>✕</button>
        </div>
        <div className={styles.cardBody}>
          <UnsupportedBlock type={block.type} />
        </div>
      </div>
    );
  }
  const container = isContainer(block);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <button type="button" className={styles.cardTitle} onClick={() => setOpen((o) => !o)}>
          <span className={styles.cardChevron} data-open={open}>
            ▸
          </span>
          {def.label}
          {container ? (
            <span className={styles.cardMeta}>{kidsOf(block).length} inside</span>
          ) : null}
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" className={styles.iconBtn} title="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
          ↑
        </button>
        <button type="button" className={styles.iconBtn} title="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>
          ↓
        </button>
        <button type="button" className={styles.iconBtn} title="Duplicate" onClick={onDuplicate}>
          ⧉
        </button>
        <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="Remove" onClick={onRemove}>
          ✕
        </button>
      </div>
      {open ? (
        <div className={styles.cardBody}>
          {def.type === "embed" ? (
            <EmbedUrlField
              provider={block.content.provider as EmbedProvider}
              url={block.content.url as string}
              onChange={({ provider, url }) => onPatch({ ...block.content, provider, url })}
            />
          ) : null}
          {Object.entries(block.content)
            .filter(([k]) => !(def.type === "embed" && (k === "provider" || k === "url")))
            .map(([k, v]) => (
              <ValueField
                key={k}
                name={k}
                value={v}
                onChange={(nv) => onPatch({ ...block.content, [k]: nv })}
              />
            ))}
          {container ? (
            <p className={styles.cardNote}>
              Nested blocks are edited on the canvas (arrives with the canvas
              layout) — this card edits the container itself.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
