"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { z } from "zod";
import { ChevronUp, ChevronDown, ChevronRight, Copy, Trash2, SquareStack, Save } from "lucide-react";
import { blockDef, categories, createBlock } from "@/blocks/registry";
import { isContainer, kidsOf, treeFind, treeLocate, canNest } from "@/blocks/tree";
import type { BlockNode } from "@/blocks/types";
import { markdownToSafeHtml } from "@/lib/sanitize";
import { Button } from "@/components/core/Button";
import { AddBlockMenu } from "./AddBlockMenu";
import { ValueField } from "./ValueField";
import { EmbedUrlField } from "./EmbedUrlField";
import { FieldBlockFields } from "./FieldBlockFields";
import { StyleFields } from "./StyleFields";
import type { EmbedProvider } from "@/modules/embeds/resolve";
import { isStyledBlock, isLayoutBlock, hasCustomCss, hasAdvancedStyle, hasMotion } from "@/blocks/common";
import { useEditor } from "./store";
import { subtreeSelected } from "./CanvasBlock";
import styles from "./editor-shell.module.css";

const catLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

/** Unwrap ZodDefault/ZodOptional/ZodNullable wrappers to reach the inner type
 *  (e.g. z.enum(...).default(...) wraps the enum in ZodDefault). */
function unwrapZod(field: unknown): unknown {
  let f = field;
  for (let i = 0; i < 5; i++) {
    const inner = (f as { _def?: { innerType?: unknown } })._def?.innerType;
    if (inner === undefined) break;
    f = inner;
  }
  return f;
}

/** Extract enum options from a zod schema shape entry, if it's a ZodEnum.
 *  Used to render Select dropdowns (e.g. heading level/align) instead of
 *  free-text inputs for fields defined as zod enums. Handles .default()/
 *  .optional()/.nullable() wrappers that hide the inner ZodEnum. */
function enumOptionsOf(schema: z.ZodType, key: string): readonly string[] | undefined {
  const shape = (schema as unknown as { shape?: Record<string, unknown> }).shape;
  if (!shape) return undefined;
  const field = unwrapZod(shape[key]);
  if (field === undefined) return undefined;
  const opts = (field as { options?: readonly unknown[] }).options;
  if (Array.isArray(opts)) return opts as readonly string[];
  // Zod 3 / older API stored values in _def.values
  const defVals = (field as { _def?: { values?: readonly unknown[] } })._def?.values;
  if (Array.isArray(defVals)) return defVals as readonly string[];
  return undefined;
}

/** For array-typed fields (e.g. buttons.items), extract the item schema's
 *  enum options so nested array items render Select dropdowns for their enum
 *  fields. Returns a map of itemKey → enumOptions, or undefined if the field
 *  isn't an array of objects with enum fields. */
function itemEnumOptionsOf(schema: z.ZodType, key: string): Record<string, readonly string[]> | undefined {
  const shape = (schema as unknown as { shape?: Record<string, unknown> }).shape;
  if (!shape) return undefined;
  const field = unwrapZod(shape[key]);
  // ZodArray exposes .element or _def.type; unwrap to the item schema (ZodObject).
  const element = (field as { element?: unknown }).element
    ?? (field as { _def?: { type?: unknown } })._def?.type;
  if (!element) return undefined;
  const itemShape = (element as { shape?: Record<string, unknown> }).shape;
  if (!itemShape) return undefined;
  const map: Record<string, readonly string[]> = {};
  let hasAny = false;
  for (const itemKey of Object.keys(itemShape)) {
    const opts = enumOptionsOf(element as z.ZodType, itemKey);
    if (opts) {
      map[itemKey] = opts;
      hasAny = true;
    }
  }
  return hasAny ? map : undefined;
}

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
  const blocks = useEditor((s) => s.blocks);
  const hasSelection = selection.size > 0;

  // Micro-header label: orients the user about what they're editing when a
  // single block is selected on the Block tab.
  const editingLabel =
    tab === "block" && selection.size === 1
      ? (() => {
        const b = treeFind(blocks, [...selection][0]);
        return b ? blockDef(b.type)?.label : undefined;
      })()
      : undefined;

  return (
    <aside className={styles.inspector} data-open={open ? "true" : undefined}>
      {editingLabel ? (
        <div className={styles.editingLabel}>Editing: {editingLabel}</div>
      ) : null}
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
            className={styles.toolBtn}
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

  // One-time migration: when a legacy richtext block (md-only, empty html) is
  // selected, seed html from md so the TipTap editor shows its content. Clears
  // md after — html becomes the single source of truth. Idempotent: once html
  // is populated the condition is false, so no loop.
  useEffect(() => {
    if (selection.size !== 1) return;
    const block = treeFind(blocks, [...selection][0]);
    if (!block || block.type !== "richtext") return;
    const c = block.content as { md?: string; html?: string };
    if (c.html || !c.md) return;
    patch(block.id, { ...block.content, html: markdownToSafeHtml(c.md), md: "" });
  }, [blocks, selection, patch]);

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
        <p className={styles.hintText}>Actions apply to all selected blocks.</p>
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

      <div className={styles.toolBar}>
        <button type="button" className={styles.toolBtn} disabled={locked} onClick={() => move(id, -1)} title="Move up" aria-label="Move up">
          <ChevronUp size={16} />
        </button>
        <button type="button" className={styles.toolBtn} disabled={locked} onClick={() => move(id, 1)} title="Move down" aria-label="Move down">
          <ChevronDown size={16} />
        </button>
        <button type="button" className={styles.toolBtn} disabled={locked} onClick={() => duplicate(id)} title="Duplicate" aria-label="Duplicate">
          <Copy size={16} />
        </button>
        <button type="button" className={`${styles.toolBtn} ${styles.toolDanger}`} disabled={locked} onClick={() => remove(id)} title="Delete" aria-label="Delete">
          <Trash2 size={16} />
        </button>
        <span className={styles.toolSep} />
        <button type="button" className={`${styles.toolBtn} ${styles.toolSecondary}`} disabled={!canWrap} onClick={() => canWrap && wrap(id)} title="Wrap in section" aria-label="Wrap in section">
          <SquareStack size={16} />
        </button>
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
            <Button variant="ghost" size="sm" onClick={() => detach()}>
              Detach
            </Button>
          </div>
        </div>
      ) : null}

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
            blockType={block.type}
            enumOptions={enumOptionsOf(def.schema, k)}
            itemEnumOptions={itemEnumOptionsOf(def.schema, k)}
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
          <span className={styles.sectionHead} style={{ margin: 0 }}>Nested blocks</span>
          {kidsOf(block).length === 0 ? (
            <p className={styles.emptyHint}>No blocks inside this one yet.</p>
          ) : (
            <NestedTree block={block} depth={0} />
          )}
          <AddBlockMenu
            label="Add block inside"
            onAdd={(type) => insert(block.id, kidsOf(block).length, createBlock(type))}
          />
        </div>
      ) : null}

      {/* Save-as-reusable lives at the bottom as a low-prominence ghost link —
          kept out of the way of the content/style editing flow above. Symbol
          blocks show Edit/Detach instead (handled earlier in the panel). */}
      {block.type !== "symbol" ? (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)" }}>
          <button type="button" className={styles.ghostLink} onClick={promptSaveAsSymbol} title="Save as reusable block">
            <Save size={14} /> Save as reusable block
          </button>
        </div>
      ) : null}
    </div>
  );
}
