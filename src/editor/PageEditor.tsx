"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import { useEditor } from "./store";
import type { PageDraft, PageOption } from "./page-settings";
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
  canonicalUrl: p.canonicalUrl,
  noIndex: p.noIndex,
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
}: {
  page: PageRow;
  initialBlocks: BlockNode[];
  isDirtyVsPublished: boolean;
  pageOptions?: PageOption[];
  /** Enabled block types from the DB registry (server-fetched). Drives picker
   *  filtering; undefined = show all compiled defs. */
  enabledTypes?: string[];
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
  const [pickerStyle] = useState<PickerStyle>("menu");
  const [draft, setDraft] = useState<PageDraft>(() => toDraft(page));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishState, setPublishState] = useState<string | null>(null);
  const [draftDiffers, setDraftDiffers] = useState(isDirtyVsPublished);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const blockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleBlockSave = useCallback(
    (tree: BlockNode[]) => {
      if (blockTimer.current) clearTimeout(blockTimer.current);
      setSaveState("saving");
      setDraftDiffers(true);
      blockTimer.current = setTimeout(async () => {
        const res = await saveDraftBlocks(page.id, tree);
        setSaveState(res.ok ? "saved" : "error");
        if (!res.ok) setPublishState(res.error);
      }, 1000);
    },
    [page.id],
  );

  useEffect(() => {
    init(initialBlocks, scheduleBlockSave, page.id);
    return () => {
      if (blockTimer.current) clearTimeout(blockTimer.current);
      if (detailTimer.current) clearTimeout(detailTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  const patchPage = useCallback(
    (partial: Partial<PageDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...partial };
        if (detailTimer.current) clearTimeout(detailTimer.current);
        setSaveState("saving");
        detailTimer.current = setTimeout(async () => {
          const res = await savePageDetails(page.id, next);
          setSaveState(res.ok ? "saved" : "error");
          if (!res.ok) setPublishState(res.error);
        }, 1000);
        return next;
      });
    },
    [page.id],
  );

  // When the selected block changes, drop any manual tab override so a newly
  // selected block re-opens the Block tab. Adjusting state during render is
  // React's supported alternative to an effect for "derive from prop/state
  // change" — it re-renders immediately with no flash.
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
    if (blockTimer.current) clearTimeout(blockTimer.current);
    const saved = await saveDraftBlocks(page.id, blocks);
    if (!saved.ok) return setPublishState(saved.error);
    const res = await publishPage(page.id);
    setPublishState(res.ok ? "Published ✓" : res.error);
    if (res.ok) {
      setDraftDiffers(false);
      patchPage({ status: "published" });
    }
  };

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "";
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

  return (
    <div className={shell.shell} data-screen-label={`Page editor · ${draft.title}`}>
      {/* top bar */}
      <div className={shell.topBar}>
        <Link href="/admin/pages" className={shell.back}>← Pages</Link>
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
        <span className={shell.vsep} />
        <span className={`${shell.saveState} ${saveState === "error" ? shell.saveError : ""}`}>{publishState ?? saveLabel}</span>
        <Button variant="accent" size="sm" onClick={doPublish}>Publish</Button>
      </div>

      {/* body */}
      {layout === "canvas" ? (
        <div className={shell.canvasWrap}>
          <div className={shell.canvasScroll} onClick={clearSelection} onMouseLeave={() => setHoverId(null)}>
            <div className={shell.canvasPad}>
              <div className={shell.deviceFrame} style={{ maxWidth: canvasWidth }}>
                <PreviewChrome route={draft.route} status={draft.status} device={device} draftRibbon={draftDiffers}>
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
                      <BlockPicker style={pickerStyle} onAdd={(t) => insert(null, blocks.length, createBlock(t))} label={blocks.length ? "Add block" : "Add your first block"} />
                    </div>
                  </div>
                </PreviewChrome>
              </div>
            </div>
          </div>
          <Inspector tab={tab} setTab={setTabOverride} page={draft} patchPage={patchPage} pages={pageOptions} />
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
              <div style={{ marginTop: "var(--space-3)" }}>
                <BlockPicker style={pickerStyle} onAdd={(t) => insert(null, blocks.length, createBlock(t))} label={blocks.length ? "Add block" : "Add your first block"} />
              </div>
            </div>
            <div style={{ position: "sticky", top: "var(--space-4)" }}>
              <div className={shell.deviceFrame} style={{ height: "78vh", boxShadow: "none" }}>
                <PreviewChrome route={draft.route} status={draft.status} device={device} draftRibbon={draftDiffers}>
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
