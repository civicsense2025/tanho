"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { createBlock } from "@/blocks/registry";
import { pageLayout } from "@/blocks/layout";
import type { BlockNode } from "@/blocks/types";
import type { PageRow } from "@/modules/pages/queries";
import { publishPage, saveDraftBlocks, savePageDetails } from "@/modules/pages/actions";
import { pageRenderMode } from "@/modules/pages/render-mode";
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
import { useAutosave, type ChangeKind } from "./useAutosave";
import { useEditor } from "./store";
import { PageFields, PageMeta, SeoPanel, CustomCodePanel } from "./page-settings";
import type { PageDraft, PageOption } from "./page-settings";
import { LayersPanel } from "./LayersPanel";
import { GridlinesToggle } from "./GridlinesToggle";
import { GridlinesOverlay } from "./GridlinesOverlay";
import { useGridlines } from "./useGridlines";
import { AdminThemeToggle } from "@/components/admin/AdminThemeToggle";
import shell from "./editor-shell.module.css";

const toDraft = (p: PageRow): PageDraft => ({
  title: p.title,
  slug: p.slug,
  route: p.route,
  kind: p.kind,
  parentId: p.parentId,
  status: p.status,
  template: p.template as PageDraft["template"],
  layout: p.layout ?? {},
  tags: p.tags ?? [],
  priority: p.priority,
  seoTitle: p.seoTitle,
  seoDescription: p.seoDescription,
  ogImageMediaId: p.ogImageMediaId ?? null,
  canonicalUrl: p.canonicalUrl,
  noIndex: p.noIndex,
  customCss: p.customCss,
  customHeadHtml: p.customHeadHtml,
  customBodyHtml: p.customBodyHtml,
});

/**
 * Fullscreen page builder — the design's fixed-inset editor. A top bar over a
 * WYSIWYG canvas (default) with a right-rail Block/Page inspector, or a stacked
 * card list. Everything is inline: blocks render as themselves on a device-width
 * frame, page + block settings live in the rail. Mobile-responsive: the rail
 * drops below the canvas on narrow screens.
 */
export function PageEditor({
  page,
  initialBlocks,
  isDirtyVsPublished,
  pageOptions = [],
  enabledTypes,
  isOwner = false,
}: {
  page: PageRow;
  initialBlocks: BlockNode[];
  isDirtyVsPublished: boolean;
  pageOptions?: PageOption[];
  /** Enabled block types from the DB registry (server-fetched). Drives picker
   *  filtering; undefined = show all compiled defs. */
  enabledTypes?: string[];
  isOwner?: boolean;
}) {
  const storeBlocks = useEditor((s) => s.blocks);
  const setEnabledTypes = useEditor((s) => s.setEnabledTypes);

  // Push the server-fetched enabled-types set into the store once so every
  // picker (BlockPicker/AddBlockMenu/BetweenInsert) filters to it.
  useEffect(() => {
    setEnabledTypes(enabledTypes ? new Set(enabledTypes) : null);
  }, [enabledTypes, setEnabledTypes]);
  const readyFor = useEditor((s) => s.readyFor);
  const init = useEditor((s) => s.init);
  // Until the post-paint init effect has loaded this page into the store, render
  // the server-provided blocks directly — no empty-canvas flash on first paint.
  const blocks = readyFor === page.id ? storeBlocks : initialBlocks;
  const insert = useEditor((s) => s.insert);
  const dropMove = useEditor((s) => s.dropMove);
  const clearSelection = useEditor((s) => s.clearSelection);
  const patch = useEditor((s) => s.patch);
  const move = useEditor((s) => s.move);
  const duplicate = useEditor((s) => s.duplicate);
  const remove = useEditor((s) => s.remove);
  const selectionSize = useEditor((s) => s.selection.size);
  const lastSelected = useEditor((s) => s.lastSelected);

  const [layout, setLayout] = useState<"canvas" | "stacked">("canvas");
  // Device lives in the editor store (not local state) so the Inspector's Style
  // section edits the same breakpoint the canvas previews. See store.ts.
  const device = useEditor((s) => s.device);
  const setDevice = useEditor((s) => s.setDevice);
  // Inspector tab. `null` = follow selection (Block when a block is selected,
  // Page otherwise); a non-null value is the user's explicit override, cleared
  // whenever the selection changes so a fresh block re-opens the Block tab.
  const [tabOverride, setTabOverride] = useState<"block" | "page" | null>(null);
  const [pickerStyle] = useState<PickerStyle>("panel");
  const [draft, setDraft] = useState<PageDraft>(() => toDraft(page));
  const [publishState, setPublishState] = useState<string | null>(null);
  const [draftDiffers, setDraftDiffers] = useState(isDirtyVsPublished);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // Layers panel (left rail) + gridlines/guides overlay — author editing aids.
  const [layersOpen, setLayersOpen] = useState(false);
  const gridlines = useGridlines();

  const {
    saveState: blockSaveState,
    errorMessage: blockErrorMessage,
    schedule: scheduleBlockSave,
    flush: flushBlockSave,
    cancel: cancelBlockSave,
    resetBaseline: resetBlockBaseline,
  } = useAutosave<BlockNode[]>({
    save: (tree) => saveDraftBlocks(page.id, tree),
  });

  const {
    saveState: detailSaveState,
    errorMessage: detailErrorMessage,
    schedule: scheduleDetailSave,
    cancel: cancelDetailSave,
    resetBaseline: resetDetailBaseline,
  } = useAutosave<PageDraft>({
    save: (next) => savePageDetails(page.id, next),
  });

  const scheduleBlockSaveWithDirty = useCallback(
    (tree: BlockNode[], kind: ChangeKind) => {
      setDraftDiffers(true);
      scheduleBlockSave(tree, kind);
    },
    [scheduleBlockSave],
  );

  useEffect(() => {
    resetBlockBaseline(initialBlocks);
    init(initialBlocks, scheduleBlockSaveWithDirty, page.id);
    return () => {
      cancelBlockSave();
      cancelDetailSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  useEffect(() => {
    resetDetailBaseline(toDraft(page));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  const patchPage = useCallback(
    (partial: Partial<PageDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...partial };
        scheduleDetailSave(next, "text");
        return next;
      });
    },
    [scheduleDetailSave],
  );

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

  const { dragId, drop, startDrag, dragCandidate, registerEl, registerRoot } = useCanvasDrag({
    blocks,
    dropMove,
    enabled: layout === "canvas",
  });

  const doPublish = async () => {
    setPublishState("Publishing…");
    const ok = await flushBlockSave();
    if (!ok) return setPublishState("Save failed");
    const res = await publishPage(page.id);
    setPublishState(res.ok ? "Published ✓" : res.error);
    if (res.ok) {
      setDraftDiffers(false);
      patchPage({ status: "published" });
    }
  };

  const saveState: "idle" | "saving" | "saved" | "error" =
    blockSaveState === "saving" || detailSaveState === "saving" ? "saving" :
      blockSaveState === "error" || detailSaveState === "error" ? "error" :
        blockSaveState === "saved" || detailSaveState === "saved" ? "saved" : "idle";

  const errorMessage = blockErrorMessage ?? detailErrorMessage ?? null;

  const saveLabel =
    saveState === "saving" ? "Saving…" :
      saveState === "saved" ? "Saved" :
        saveState === "error" ? (errorMessage ?? "Save failed") : "";
  const renderMode = pageRenderMode({ hasPaywall: page.hasPaywall });

  const dragCtx: DragCtx = {
    device,
    dragId,
    hoverId,
    drop,
    registerEl,
    setHover: setHoverId,
    startDrag,
    dragCandidate,
    onInsert: (parentId, index, type) => insert(parentId, index, createBlock(type)),
  };

  const L = pageLayout(draft.layout, device);
  const canvasWidth = DEVICES[device].w ? `${DEVICES[device].w}px` : "1100px";

  const pageSettingsPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageFields page={draft} patchPage={patchPage} compact />
      <div className={shell.divider} />
      <PageMeta page={draft} patchPage={patchPage} pages={pageOptions} />
      <SeoPanel page={draft} patchPage={patchPage} />
      <div className={shell.divider} />
      <CustomCodePanel page={draft} patchPage={patchPage} isOwner={isOwner} />
    </div>
  );

  return (
    <div className={shell.shell} data-screen-label={`Page editor · ${draft.title}`}>
      {/* top bar */}
      <div className={shell.topBar}>
        <Link href="/admin" className={shell.back}>← Dashboard</Link>
        <span className={shell.crumbSep}>/</span>
        <span className={shell.title}>{draft.title || "Untitled"}</span>
        <span className={shell.route}>{draft.route}</span>
        <span
          className={shell.route}
          title={renderMode === "dynamic" ? "Renders per-request (has a paywall)" : "Cached & served statically"}
          style={{ color: renderMode === "dynamic" ? "var(--accent)" : "var(--text-faint)" }}
        >
          · {renderMode}
        </span>
        <span className={shell.spacer} />
        <DeviceToggle device={device} onChange={setDevice} />
        <div className={shell.segGroup} role="group" aria-label="Editor layout">
          <button type="button" title="Canvas + inspector" aria-pressed={layout === "canvas"} className={layout === "canvas" ? shell.segOn : shell.segBtn} onClick={() => { clearSelection(); setLayout("canvas"); }}>▤</button>
          <button type="button" title="Stacked cards" aria-pressed={layout === "stacked"} className={layout === "stacked" ? shell.segOn : shell.segBtn} onClick={() => { clearSelection(); setLayout("stacked"); }}>▦</button>
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
        <span className={shell.vsep} />
        <span className={`${shell.saveState} ${saveState === "error" ? shell.saveError : ""}`}>{publishState ?? saveLabel}</span>
        <Button variant="accent" size="sm" onClick={doPublish}>Publish</Button>
      </div>

      {/* body */}
      {layout === "canvas" ? (
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
                <PreviewChrome status={draft.status} device={device} draftRibbon={draftDiffers}>
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
                    {blocks.length === 0 ? (
                      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "var(--space-10) var(--space-4)", gap: "var(--space-3)" }}>
                        <div style={{ fontSize: "32px", color: "var(--text-faint)", marginBottom: "var(--space-2)" }}>▦</div>
                        <h3 style={{ margin: 0, fontSize: "var(--text-body)", fontWeight: "var(--weight-medium)", color: "var(--text)" }}>Start building your page</h3>
                        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: "320px" }}>
                          Add a headline, hero section, or any block to begin.
                        </p>
                        <div style={{ marginTop: "var(--space-3)" }}>
                          <BlockPicker style="panel" onAdd={(t) => insert(null, 0, createBlock(t))} label="Browse blocks" />
                        </div>
                      </div>
                    ) : (
                      <div className={shell.addRow} onClick={(e) => e.stopPropagation()}>
                        <BlockPicker style={pickerStyle} onAdd={(t) => insert(null, blocks.length, createBlock(t))} label="Add block" />
                      </div>
                    )}
                  </div>
                </PreviewChrome>
              </div>
            </div>
          </div>
          <Inspector tab={tab} setTab={setTabOverride} settingsPanel={pageSettingsPanel} settingsLabel="Page" />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(380px, 1fr) minmax(420px, 1.05fr)", gap: "var(--space-6)", maxWidth: 1500, margin: "0 auto", padding: "var(--space-6) var(--space-6) var(--space-10)", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              {blocks.map((b, i) => (
                <div key={b.id} style={{ display: "flex", flexDirection: "column" }}>
                  <BetweenInsert onInsert={(t) => insert(null, i, createBlock(t))} />
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
              {blocks.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "var(--space-10) var(--space-4)", gap: "var(--space-3)" }}>
                  <div style={{ fontSize: "32px", color: "var(--text-faint)", marginBottom: "var(--space-2)" }}>▦</div>
                  <h3 style={{ margin: 0, fontSize: "var(--text-body)", fontWeight: "var(--weight-medium)", color: "var(--text)" }}>Start building your page</h3>
                  <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: "320px" }}>
                    Add a headline, hero section, or any block to begin.
                  </p>
                  <div style={{ marginTop: "var(--space-3)" }}>
                    <BlockPicker style="panel" onAdd={(t) => insert(null, 0, createBlock(t))} label="Browse blocks" />
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: "var(--space-3)" }}>
                  <BlockPicker style={pickerStyle} onAdd={(t) => insert(null, blocks.length, createBlock(t))} label="Add block" />
                </div>
              )}
            </div>
            <div style={{ position: "sticky", top: "var(--space-4)" }}>
              <div className={shell.deviceFrame} style={{ height: "78vh", boxShadow: "none" }}>
                <PreviewChrome status={draft.status} device={device} draftRibbon={draftDiffers}>
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
