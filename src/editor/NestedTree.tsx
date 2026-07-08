"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { blockDef } from "@/blocks/registry";
import { isContainer, kidsOf } from "@/blocks/tree";
import type { BlockNode } from "@/blocks/types";
import { useEditor } from "./store";
import { subtreeSelected } from "./CanvasBlock";
import styles from "./editor-shell.module.css";

/** Recursive tree of a container's children — shown in the inspector so an
 *  author can see, navigate into, and reorder nested blocks (section >
 *  columns > blocks) without leaving the rail. Clicking a row selects that
 *  block (the editor flips to the Block tab to edit it); a row highlights
 *  when it or any descendant is selected. Container children recurse, each
 *  indented by depth, with a chevron to collapse the subtree. */
function NestedTree({ block, depth }: { block: BlockNode; depth: number }) {
  const kids = kidsOf(block);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {kids.map((child, i) => (
        <TreeRow key={child.id} block={child} depth={depth} index={i} total={kids.length} />
      ))}
    </div>
  );
}

function TreeRow({
  block,
  depth,
  index,
  total,
}: {
  block: BlockNode;
  depth: number;
  index: number;
  total: number;
}) {
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const move = useEditor((s) => s.move);
  const remove = useEditor((s) => s.remove);
  const [collapsed, setCollapsed] = useState(false);
  const def = blockDef(block.type);
  if (!def) return null;
  const hasKids = isContainer(block) && kidsOf(block).length > 0;
  const active = subtreeSelected(block, selection);

  return (
    <div>
      <div
        onClick={() => select(block.id, "single")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          paddingLeft: `calc(${depth} * var(--space-4))`,
          paddingRight: "var(--space-1)",
          background: active ? "var(--surface-hover)" : undefined,
          cursor: "pointer",
          borderRadius: "var(--radius-sm)",
        }}
      >
        {hasKids ? (
          <button
            type="button"
            style={{ width: 20, height: 20, flexShrink: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((c) => !c);
            }}
            title={collapsed ? "Expand" : "Collapse"}
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : (
          <span style={{ width: 20, flexShrink: 0 }} aria-hidden />
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "var(--text-sm)",
            color: active ? "var(--text)" : "var(--text-muted)",
            fontWeight: active ? "var(--weight-medium)" : undefined,
          }}
          title={def.label}
        >
          {def.label}
        </span>
        <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", gap: 2, flexShrink: 0 }}>
          <button type="button" className={styles.toolBtn} style={{ width: 22, height: 22 }} disabled={index === 0} onClick={() => move(block.id, -1)} title="Move up" aria-label="Move up">
            <ChevronUp size={12} />
          </button>
          <button type="button" className={styles.toolBtn} style={{ width: 22, height: 22 }} disabled={index === total - 1} onClick={() => move(block.id, 1)} title="Move down" aria-label="Move down">
            <ChevronDown size={12} />
          </button>
          <button type="button" className={`${styles.toolBtn} ${styles.toolDanger}`} style={{ width: 22, height: 22 }} onClick={() => remove(block.id)} title="Delete" aria-label="Delete">
            <Trash2 size={12} />
          </button>
        </span>
      </div>
      {hasKids && !collapsed ? <NestedTree block={block} depth={depth + 1} /> : null}
    </div>
  );
}

export { NestedTree };
