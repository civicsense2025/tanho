"use client";

import { useCallback, useEffect, useState } from "react";
import { createBlock } from "@/blocks/registry";
import { pageLayout } from "@/blocks/layout";
import type { BlockNode } from "@/blocks/types";
import { Layers } from "lucide-react";
import { Button } from "@/components/core/Button";
import { BlockPicker, type PickerStyle } from "./BlockPicker";
import { BetweenInsert } from "./BetweenInsert";
import { BlockCard } from "./BlockCard";
import { CanvasChildren, type DragCtx } from "./CanvasBlock";
import { PreviewBlocks } from "./PreviewBlocks";
import { Inspector } from "./Inspector";
import { DeviceToggle, DEVICES } from "./DeviceToggle";
import { PreviewChrome } from "./PreviewChrome";
import { useCanvasDrag } from "./useCanvasDrag";
import { useEditor } from "./store";
import { useAutosave } from "./useAutosave";
import { LayersPanel } from "./LayersPanel";
import { GridlinesToggle } from "./GridlinesToggle";
import { GridlinesOverlay } from "./GridlinesOverlay";
import { useGridlines } from "./useGridlines";
import { AdminThemeToggle } from "@/components/admin/AdminThemeToggle";
import { type BlockCanvasEditorProps } from "./BlockCanvasEditor.types";
import shell from "./editor-shell.module.css";

/**
 * Generic block-canvas editor — the design's fullscreen page builder, extracted
 * so any owner type (page, entry, product…) can drive it. A top bar over a
 * WYSIWYG canvas (default) with a right-rail Block/Settings inspector, or a
 * stacked card list. Owner-specific concerns (identity chrome in the top bar,
 * settings UI in the rail, save/publish wiring) are threaded in via props;
 * everything else — store wiring, device toggle, layout toggle, block
 * insert/move/duplicate/remove, drag-drop, save-state indicator, debounced
 * autosave — is identical across owner types.
 */
export function BlockCanvasEditor({
  ownerType,
  ownerId,
  initialBlocks,
  enabledTypes,
  settingsPanel,
  onSaveBlocks,
  onPublish,
  topBarLeft,
  screenLabel,
  route: _route = "",
  status = "draft",
  layout: layoutSettings,
  settingsLabel,
  initialDraftDiffers = false,
  headerBlocks = [],
  footerBlocks = [],
  previewContent: _previewContent,
  contentTypeContext,
}: BlockCanvasEditorProps) {
  // Namespacing info for the caller's onSaveBlocks/onPublish closures (e.g.
  // saveOwnerBlocks("page", ownerId, tree)) — this component doesn't need it
  // directly, only accepts it per the shared owner-editor contract.
  void ownerType;

  const storeBlocks = useEditor((s) => s.blocks);
  const setEnabledTypes = useEditor((s) => s.setEnabledTypes);
  const setContentTypeContext = useEditor((s) => s.setContentTypeContext);

  // Push the server-fetched enabled-types set into the store once so every
  // picker (BlockPicker/AddBlockMenu/BetweenInsert) filters to it.
  useEffect(() => {
    setEnabledTypes(enabledTypes ? new Set(enabledTypes) : null);
  }, [enabledTypes, setEnabledTypes]);

  // Surface the content-type context (its fields) to the pickers + inspector,
  // and clear it on unmount so it never leaks into the next editor mounted
  // against the shared store.
  useEffect(() => {
    setContentTypeContext(contentTypeContext ?? null);
    return () => setContentTypeContext(null);
  }, [contentTypeContext, setContentTypeContext]);
  const readyFor = useEditor((s) => s.readyFor);
  const init = useEditor((s) => s.init);
  // Until the post-paint init effect has loaded this owner into the store,
  // render the server-provided blocks directly — no empty-canvas flash on
  // first paint.
  const blocks = readyFor === ownerId ? storeBlocks : initialBlocks;
  const insert = useEditor((s) => s.insert);
  // Create a block and insert it, merging an optional starting content patch
  // (used by the content-type "Field" suggestions to pre-bind a field block).
  const addBlock = useCallback(
    (parentId: string | null, index: number, type: string, patch?: Record<string, unknown>) => {
      const block = createBlock(type);
      insert(parentId, index, patch ? { ...block, content: { ...block.content, ...patch } } : block);
    },
    [insert],
  );
  const dropMove = useEditor((s) => s.dropMove);
  const clearSelection = useEditor((s) => s.clearSelection);
  const patch = useEditor((s) => s.patch);
  const move = useEditor((s) => s.move);
  const duplicate = useEditor((s) => s.duplicate);
  const remove = useEditor((s) => s.remove);
  const selectionSize = useEditor((s) => s.selection.size);
  const lastSelected = useEditor((s) => s.lastSelected);

  const [canvasLayout, setCanvasLayout] = useState<"canvas" | "stacked">("canvas");
  // Device lives in the editor store (not local state) so the Inspector's Style
  // section edits the same breakpoint the canvas previews. See store.ts.
  const device = useEditor((s) => s.device);
  const setDevice = useEditor((s) => s.setDevice);
  // Inspector tab. `null` = follow selection (Block when a block is selected,
  // Settings otherwise); a non-null value is the user's explicit override,
  // cleared whenever the selection changes so a fresh block re-opens the
  // Block tab.
  const [tabOverride, setTabOverride] = useState<"block" | "page" | null>(null);
  // Mobile-only: whether the user explicitly opened the settings sheet on the
  // Page tab (there's no selection to open it). A selection opens the sheet on
  // its own (see sheetOpen below); this covers the "edit page settings" path.
  const [pageSheetOpen, setPageSheetOpen] = useState(false);
  const [pickerStyle] = useState<PickerStyle>("menu");
  const [publishState, setPublishState] = useState<string | null>(null);
  const [draftDiffers, setDraftDiffers] = useState(initialDraftDiffers);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // Layers panel (left rail) + gridlines/guides overlay — author editing aids.
  const [layersOpen, setLayersOpen] = useState(false);
  const gridlines = useGridlines();

  const { saveState, errorMessage, schedule: scheduleSave, flush: flushSave, cancel: cancelSave, resetBaseline } = useAutosave<BlockNode[]>({
    save: async (tree) => {
      const res = await onSaveBlocks(tree);
      return res.ok ? { ok: true } : { ok: false, error: res.error ?? "Save failed" };
    },
  });

  useEffect(() => {
    resetBaseline(initialBlocks);
    init(initialBlocks, (tree, kind) => { setDraftDiffers(true); scheduleSave(tree, kind); }, ownerId);
    return () => { cancelSave(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  // When the selected block changes, drop any manual tab override so a newly
  // selected block re-opens the Block tab. Adjusting state during render is
  // React's supported alternative to an effect for deriving from a state change.
  const selKey = selectionSize > 0 ? (lastSelected ?? "sel") : "none";
  const [prevSelKey, setPrevSelKey] = useState(selKey);
  if (selKey !== prevSelKey) {
    setPrevSelKey(selKey);
    setTabOverride(null);
  }
  const tab: "block" | "page" = tabOverride ?? (selectionSize > 0 ? "block" : "page");

  // Mobile inspector-sheet open state. A selected block opens the sheet to its
  // settings; the top-bar Page button opens it to page settings. Closing clears
  // both (deselect + drop the page-sheet flag) so the canvas is fully restored.
  // On desktop this drives `data-open`, which the desktop CSS ignores (the
  // inspector is a permanent rail there), so it's a no-op above the breakpoint.
  const sheetOpen = selectionSize > 0 || pageSheetOpen;
  const closeSheet = useCallback(() => {
    clearSelection();
    setPageSheetOpen(false);
  }, [clearSelection]);

  const { dragId, drop, startDrag, dragCandidate, registerEl, registerRoot } = useCanvasDrag({
    blocks,
    dropMove,
    enabled: canvasLayout === "canvas",
  });

  const doPublish = async () => {
    if (!onPublish) return;
    setPublishState("Publishing…");
    const ok = await flushSave();
    if (!ok) { setPublishState("Save failed"); return; }
    const res = await onPublish();
    setPublishState(res.ok ? "Published ✓" : (res.error ?? "Publish failed"));
    if (res.ok) setDraftDiffers(false);
  };

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? (errorMessage ?? "Save failed") : "";

  const dragCtx: DragCtx = {
    device,
    dragId,
    hoverId,
    drop,
    registerEl,
    setHover: setHoverId,
    startDrag,
    dragCandidate,
    onInsert: (parentId, index, type, patch) => addBlock(parentId, index, type, patch),
  };

  const L = pageLayout(layoutSettings ?? {}, device);
  const canvasWidth = DEVICES[device].w ? `${DEVICES[device].w}px` : "1100px";

  return (
    <div className={shell.shell} data-screen-label={screenLabel}>
      {/* top bar */}
      <div className={shell.topBar}>
        {topBarLeft}
        <span className={shell.spacer} />
        <DeviceToggle device={device} onChange={setDevice} />
        {/* Canvas/stacked layout toggle — hidden on mobile (canvas-mode only). */}
        <div className={`${shell.segGroup} ${shell.layoutToggle}`} role="group" aria-label="Editor layout">
          <button type="button" title="Canvas + inspector" aria-pressed={canvasLayout === "canvas"} className={canvasLayout === "canvas" ? shell.segOn : shell.segBtn} onClick={() => { clearSelection(); setCanvasLayout("canvas"); }}>▤</button>
          <button type="button" title="Stacked cards" aria-pressed={canvasLayout === "stacked"} className={canvasLayout === "stacked" ? shell.segOn : shell.segBtn} onClick={() => { clearSelection(); setCanvasLayout("stacked"); }}>▦</button>
        </div>
        <button
          type="button"
          title="Layers — show the block tree"
          aria-pressed={layersOpen}
          className={layersOpen ? shell.segOn : shell.segBtn}
          onClick={() => setLayersOpen((v) => !v)}
          aria-label="Toggle layers panel"
        >
          <Layers size={15} />
        </button>
        <GridlinesToggle {...gridlines} />
        <AdminThemeToggle />
        {/* Mobile-only: open the settings sheet on the Page tab (no block
            selection needed). Hidden on desktop where the Page tab is always
            visible in the permanent inspector rail. */}
        <button
          type="button"
          className={shell.pageSheetBtn}
          onClick={() => { clearSelection(); setPageSheetOpen(true); }}
        >
          {settingsLabel ?? "Page"}
        </button>
        <span className={shell.vsep} />
        <span className={`${shell.saveState} ${saveState === "error" ? shell.saveError : ""}`}>{publishState ?? saveLabel}</span>
        {onPublish ? <Button variant="accent" size="sm" onClick={doPublish}>Publish</Button> : null}
      </div>

      {/* body */}
      {canvasLayout === "canvas" ? (
        <div className={shell.canvasWrap}>
          {layersOpen ? (
            <div className={shell.layersRail}>
              <LayersPanel open={layersOpen} onToggle={setLayersOpen} style={{ width: 240 }} />
            </div>
          ) : null}
          <div
            className={`${shell.canvasScroll} pb-gridlines-host`}
            onClick={clearSelection}
            onMouseLeave={() => setHoverId(null)}
          >
            <GridlinesOverlay
              gridlines={gridlines.gridlines}
              baselineGrid={gridlines.baselineGrid}
              blockOutlines={gridlines.blockOutlines}
              rulers={gridlines.rulers}
              columns={gridlines.columns}
              gridSize={gridlines.gridSize}
            />
            <div className={shell.canvasPad}>
              <div className={shell.deviceFrame} style={{ maxWidth: canvasWidth }}>
                <PreviewChrome
                  status={status}
                  device={device}
                  draftRibbon={draftDiffers}
                  headerBlocks={headerBlocks}
                  footerBlocks={footerBlocks}
                >
                  <div
                    ref={registerRoot}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: L.gap,
                      containerType: "inline-size",
                      ["--pb-gutter" as never]: L.gutter,
                      maxWidth: L.maxWidth,
                      marginInline: "auto",
                      width: "100%",
                      padding: `${L.padY} ${L.gutter}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CanvasChildren blocks={blocks} parentId={null} ctx={dragCtx} />
                    <div className={shell.addRow} onClick={(e) => e.stopPropagation()}>
                      <BlockPicker style={pickerStyle} onAdd={(t, patch) => addBlock(null, blocks.length, t, patch)} label={blocks.length ? "Add block" : "Add your first block"} />
                    </div>
                  </div>
                </PreviewChrome>
              </div>
            </div>
          </div>
          {/* Mobile sheet backdrop — tap to close. Inert (display:none) on
              desktop; sits below the inspector (z-index) so the sheet overlays it. */}
          <div className={shell.sheetBackdrop} data-open={sheetOpen ? "true" : undefined} onClick={closeSheet} />
          <Inspector
            tab={tab}
            setTab={setTabOverride}
            settingsPanel={settingsPanel}
            settingsLabel={settingsLabel}
            open={sheetOpen}
            onClose={closeSheet}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <div className={shell.stackedGrid}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              {blocks.map((b, i) => (
                <div key={b.id} style={{ display: "flex", flexDirection: "column" }}>
                  <BetweenInsert onInsert={(t, patch) => addBlock(null, i, t, patch)} />
                  <BlockCard
                    block={b}
                    index={i}
                    total={blocks.length}
                    onPatch={(c) => patch(b.id, c)}
                    onMove={(d) => move(b.id, d)}
                    onDuplicate={() => duplicate(b.id)}
                    onRemove={() => remove(b.id)}
                  />
                </div>
              ))}
              <div style={{ marginTop: "var(--space-3)" }}>
                <BlockPicker style={pickerStyle} onAdd={(t, patch) => addBlock(null, blocks.length, t, patch)} label={blocks.length ? "Add block" : "Add your first block"} />
              </div>
            </div>
            <div className={shell.stackedPreview}>
              <div className={shell.deviceFrame} style={{ height: "78vh", boxShadow: "none" }}>
                <PreviewChrome
                  status={status}
                  device={device}
                  draftRibbon={draftDiffers}
                  headerBlocks={headerBlocks}
                  footerBlocks={footerBlocks}
                >
                  {blocks.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: L.gap, ["--pb-gutter" as never]: L.gutter, maxWidth: L.maxWidth, marginInline: "auto", width: "100%", padding: `${L.padY} ${L.gutter}` }}>
                      <PreviewBlocks blocks={blocks} device={device} />
                    </div>
                  ) : (
                    <div style={{ padding: "var(--space-10)", textAlign: "center", color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>Your page preview appears here.</div>
                  )}
                </PreviewChrome>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
