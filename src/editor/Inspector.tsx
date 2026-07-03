"use client";

import { blockDef, categories, createBlock } from "@/blocks/registry";
import { isContainer, kidsOf, treeFind, treeLocate, canNest } from "@/blocks/tree";
import { Button } from "@/components/core/Button";
import { AddBlockMenu } from "./AddBlockMenu";
import { ValueField } from "./ValueField";
import { StyleFields } from "./StyleFields";
import { isStyledBlock } from "@/blocks/common";
import { useEditor } from "./store";
import { PageFields, PageMeta, SeoPanel, type PageDraft, type PageOption, type PatchPage } from "./page-settings";
import styles from "./editor-shell.module.css";

const catLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

/**
 * Right-rail inspector — the design's two-tab panel. BLOCK tab edits the
 * selected block (header + quick actions + fields), or the bulk bar when many
 * are selected. PAGE tab holds structured page settings + SEO (PageFields /
 * PageMeta / SeoPanel), so page-level controls live in the rail, not a
 * separate screen.
 */
export function Inspector({
  tab,
  setTab,
  page,
  patchPage,
  pages,
}: {
  tab: "block" | "page";
  setTab: (t: "block" | "page") => void;
  page: PageDraft;
  patchPage: PatchPage;
  pages: PageOption[];
}) {
  const selection = useEditor((s) => s.selection);
  const hasSelection = selection.size > 0;

  return (
    <aside className={styles.inspector}>
      <div className={styles.inspectorTabs}>
        <div className={styles.tabBar}>
          <button
            type="button"
            disabled={!hasSelection}
            className={tab === "block" ? styles.tabOn : styles.tab}
            onClick={() => setTab("block")}
          >
            Block
          </button>
          <button
            type="button"
            className={tab === "page" ? styles.tabOn : styles.tab}
            onClick={() => setTab("page")}
          >
            Page
          </button>
        </div>
      </div>

      <div className={styles.inspectorBody}>
        {tab === "block" ? <BlockTab /> : <PageTab page={page} patchPage={patchPage} pages={pages} />}
      </div>
    </aside>
  );
}

function PageTab({ page, patchPage, pages }: { page: PageDraft; patchPage: PatchPage; pages: PageOption[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageFields page={page} patchPage={patchPage} compact />
      <div className={styles.divider} />
      <PageMeta page={page} patchPage={patchPage} pages={pages} />
      <SeoPanel page={page} patchPage={patchPage} />
    </div>
  );
}

function BlockTab() {
  const blocks = useEditor((s) => s.blocks);
  const selection = useEditor((s) => s.selection);
  const patch = useEditor((s) => s.patch);
  const insert = useEditor((s) => s.insert);
  const move = useEditor((s) => s.move);
  const remove = useEditor((s) => s.remove);
  const duplicate = useEditor((s) => s.duplicate);
  const wrap = useEditor((s) => s.wrapInSection);
  const bulkDelete = useEditor((s) => s.bulkDelete);
  const bulkDuplicate = useEditor((s) => s.bulkDuplicate);
  const bulkWrap = useEditor((s) => s.bulkWrapInSection);

  if (selection.size === 0) {
    return (
      <div className={styles.inspectorEmpty}>
        <p style={{ margin: 0 }}>Select a block on the canvas to edit it.</p>
        <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--text-xs)" }}>
          Cmd-click to multi-select, shift-click for a range.
        </p>
      </div>
    );
  }

  if (selection.size > 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h3 className={styles.sectionHead}>{selection.size} blocks selected</h3>
        <Button variant="outline" size="sm" onClick={bulkDuplicate}>Duplicate all</Button>
        <Button variant="outline" size="sm" onClick={bulkWrap}>Wrap in section</Button>
        <Button variant="ghost" size="sm" onClick={bulkDelete}>Delete all</Button>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          Wrap requires the selection to share one parent.
        </p>
      </div>
    );
  }

  const id = [...selection][0];
  const block = treeFind(blocks, id);
  const def = block ? blockDef(block.type) : undefined;
  if (!block || !def) return null;

  const locked = !!def.bound;
  const loc = treeLocate(blocks, id);
  const parentType = loc?.parentId ? treeFind(blocks, loc.parentId)?.type ?? null : null;
  const canWrap =
    !locked &&
    block.type !== "section" &&
    canNest("section", block.type) &&
    canNest(parentType, "section");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div className={styles.blockHead}>
        <span className={`${styles.blockHeadIcon} ${def.bound ? styles.blockHeadIconBound : ""}`}>
          {def.bound ? "◆" : "▧"}
        </span>
        <div>
          <div className={styles.blockHeadLabel}>{def.label}</div>
          <div className={styles.blockHeadCat}>{catLabel(def.category)}</div>
        </div>
      </div>

      <div className={styles.quickRow}>
        <button type="button" className={styles.quickAction} disabled={locked} onClick={() => move(id, -1)} title="Move up">↑ Up</button>
        <button type="button" className={styles.quickAction} disabled={locked} onClick={() => move(id, 1)} title="Move down">↓ Down</button>
        <button type="button" className={styles.quickAction} disabled={!canWrap} onClick={() => canWrap && wrap(id)} title="Wrap in section">▣ Wrap</button>
        <button type="button" className={styles.quickAction} disabled={locked} onClick={() => duplicate(id)} title="Duplicate">⧉ Dup</button>
        <button type="button" className={`${styles.quickAction} ${styles.quickDanger}`} disabled={locked} onClick={() => remove(id)} title="Delete">🗑 Del</button>
      </div>

      <div className={styles.divider} />

      {def.bound ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          <span style={{ color: "var(--accent-2)" }}>· Live</span> block — its content
          comes from the CMS record on the published page.
        </p>
      ) : null}

      {Object.entries(block.content)
        .filter(([k]) => k !== "blocks")
        .map(([k, v]) => (
          <ValueField
            key={k}
            name={k}
            value={v}
            onChange={(nv) => patch(block.id, { ...block.content, [k]: nv })}
          />
        ))}

      {/* Universal style controls — only for blocks that opted into styleContent.
          Bound blocks stay locked (their layout is entity-driven). */}
      {!locked && isStyledBlock(def.schema) ? (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)" }}>
          <StyleFields
            content={block.content}
            onChange={(next) => patch(block.id, next)}
          />
        </div>
      ) : null}

      {isContainer(block) ? (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <span className={styles.sectionHead} style={{ margin: 0 }}>Children</span>
          <AddBlockMenu
            label="Add inside"
            onAdd={(type) => insert(block.id, kidsOf(block).length, createBlock(type))}
          />
        </div>
      ) : null}
    </div>
  );
}
