"use client";

import type { ReactNode } from "react";
import { blockDef, categories, createBlock } from "@/blocks/registry";
import { isContainer, kidsOf, treeFind, treeLocate, canNest } from "@/blocks/tree";
import { Button } from "@/components/core/Button";
import { AddBlockMenu } from "./AddBlockMenu";
import { ValueField } from "./ValueField";
import { EmbedUrlField } from "./EmbedUrlField";
import { FieldBlockFields } from "./FieldBlockFields";
import { StyleFields } from "./StyleFields";
import type { EmbedProvider } from "@/modules/embeds/resolve";
import { isStyledBlock, isLayoutBlock, hasCustomCss, hasAdvancedStyle, hasMotion } from "@/blocks/common";
import { useEditor } from "./store";
import styles from "./editor-shell.module.css";

const catLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

/**
 * Right-rail inspector — the design's two-tab panel. BLOCK tab edits the
 * selected block (header + quick actions + fields), or the bulk bar when many
 * are selected. The second tab holds owner-specific settings UI (page details
 * + SEO, entry fields, product fields…) handed in as `settingsPanel`, so
 * those controls live in the rail, not a separate screen.
 */
export function Inspector({
  tab,
  setTab,
  settingsPanel,
  settingsLabel = "Page",
  open,
  onClose,
}: {
  tab: "block" | "page";
  setTab: (t: "block" | "page") => void;
  settingsPanel: ReactNode;
  /** Tab label for the settings pane — PageEditor passes "Page" to keep its
   *  UI text unchanged; other owner types can pass "Entry"/"Product"/etc. */
  settingsLabel?: string;
  /** Mobile only: whether the inspector sheet is slid in. Drives the CSS
   *  `data-open` transform; ignored on desktop where the inspector is a
   *  permanent rail (the mobile-sheet CSS only applies under the breakpoint). */
  open?: boolean;
  /** Mobile only: close the sheet (the X shown in the tab row calls this). */
  onClose?: () => void;
}) {
  const selection = useEditor((s) => s.selection);
  const hasSelection = selection.size > 0;

  return (
    <aside className={styles.inspector} data-open={open ? "true" : undefined}>
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
            {settingsLabel}
          </button>
        </div>
        {/* Mobile-only close affordance — hidden on desktop via CSS. */}
        <button
          type="button"
          className={styles.sheetClose}
          onClick={onClose}
          aria-label="Close settings"
        >
          ✕
        </button>
      </div>

      <div className={styles.inspectorBody}>
        {tab === "block" ? <BlockTab /> : settingsPanel}
      </div>
    </aside>
  );
}

/** The block-editing panel (header + quick actions + fields + style + children).
 *  Reads everything from the editor store, so it's reusable standalone — the
 *  chrome editor renders it directly in its rail (no settings tab, since chrome
 *  owners have no page-settings concept). Exported so ChromeEditor can render
 *  it directly. (PageTab moved to PageEditor's settingsPanel when the editor
 *  was unified into BlockCanvasEditor.) */
export function BlockTab() {
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
  const saveAsSymbol = useEditor((s) => s.saveSelectionAsSymbol);
  const detach = useEditor((s) => s.detachSymbol);

  /** Prompt for a name and save the current selection as a reusable block. */
  const promptSaveAsSymbol = async () => {
    const name = window.prompt("Name this saved block");
    if (name && name.trim()) await saveAsSymbol(name.trim());
  };

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
        <Button variant="outline" size="sm" onClick={promptSaveAsSymbol}>Save as block</Button>
        <Button variant="ghost" size="sm" onClick={bulkDelete}>Delete all</Button>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          Wrap and Save as block require the selection to share one parent.
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

      {block.type === "symbol" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            <span style={{ color: "var(--accent-2)" }}>◈ Saved block</span> — edits to
            the definition update every instance.
          </p>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const sid = (block.content as { symbolId?: string }).symbolId;
                if (sid) window.open(`/admin/blocks/symbols/${sid}`, "_blank");
              }}
            >
              Edit block
            </Button>
            <Button variant="ghost" size="sm" onClick={() => detach(id)}>
              Detach
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={promptSaveAsSymbol}>
          Save as reusable block
        </Button>
      )}

      {def.type === "embed" ? (
        <EmbedUrlField
          provider={block.content.provider as EmbedProvider}
          url={block.content.url as string}
          onChange={({ provider, url }) => patch(block.id, { ...block.content, provider, url })}
        />
      ) : null}

      {/* The `field` block is bound (content otherwise read-only), but the owner
          must still pick which field + how to show it — its own control panel,
          field dropdown driven by the content-type context. */}
      {def.type === "field" ? (
        <FieldBlockFields content={block.content} onChange={(next) => patch(block.id, next)} />
      ) : null}

      {Object.entries(block.content)
        // `blocks` is edited via the canvas; `style`/`layout`/`customCss` are owned
        // by StyleFields below (the generic ValueField would mangle them);
        // the embed block's `provider`/`url` are owned by EmbedUrlField above;
        // the field block's own keys are owned by FieldBlockFields above.
        .filter(
          ([k]) =>
            k !== "blocks" &&
            k !== "style" &&
            k !== "layout" &&
            k !== "customCss" &&
            !(def.type === "embed" && (k === "provider" || k === "url")) &&
            !(def.type === "field" &&
              ["field", "display", "level", "label", "prefix", "suffix", "_resolved"].includes(k)),
        )
        .map(([k, v]) => (
          <ValueField
            key={k}
            name={k}
            value={v}
            onChange={(nv) => patch(block.id, { ...block.content, [k]: nv })}
          />
        ))}

      {/* Style / advanced-layout / custom-CSS controls. Shown for any block opting
          into styleContent (inner-box style), layoutStyleContent (flex/grid — the
          four layout blocks), or customCssContent (the escape hatch) — INCLUDING
          bound blocks: these only affect the wrapper/scoped CSS, never entity-driven
          content, so they're safe even while `locked` keeps content fields read-only. */}
      {(() => {
        const showStyle = isStyledBlock(def.schema);
        const showLayout = isLayoutBlock(def.schema);
        const showCustomCss = hasCustomCss(def.schema);
        const showAdvanced = hasAdvancedStyle(def.schema);
        const showMotion = hasMotion(def.schema);
        if (!showStyle && !showLayout && !showCustomCss && !showAdvanced && !showMotion) return null;
        return (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)" }}>
            <StyleFields
              content={block.content}
              onChange={(next) => patch(block.id, next)}
              showStyle={showStyle}
              showLayout={showLayout}
              showCustomCss={showCustomCss}
              showAdvanced={showAdvanced}
              showMotion={showMotion}
              blockType={block.type}
              blockId={block.id}
            />
          </div>
        );
      })()}

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
