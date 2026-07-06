"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createBlock } from "@/blocks/registry";
import type { BlockCategory, BlockNode } from "@/blocks/types";
import { Button } from "@/components/core/Button";
import { BlockPicker } from "@/editor/BlockPicker";
import { CanvasChildren, type DragCtx } from "@/editor/CanvasBlock";
import { BlockTab } from "@/editor/Inspector";
import { DeviceToggle } from "@/editor/DeviceToggle";
import { useCanvasDrag } from "@/editor/useCanvasDrag";
import { useEditor } from "@/editor/store";
import shell from "@/editor/editor-shell.module.css";
import { saveDraftChrome, publishChrome } from "../actions";
import { CHROME_OWNER_LABEL, type ChromeOwnerType } from "../owners";
import { chromeTemplatesFor, type ChromeTemplate } from "../templates";

/**
 * The block categories the chrome editor's picker offers: the chrome-only
 * blocks (logo/nav-menu/cta-button/search-trigger/…) PLUS the same content/
 * layout/media blocks a page gets, so a header/footer can be composed as
 * freely as a page. `newsletter` is included too — a footer subscribe band
 * is a first-class footer feature (the config-driven system it replaced had
 * one in 1 of its 14 footer recipes), and the newsletter block's
 * `variant: "compact"` fits the footer's column width. Excludes remaining
 * page-flow-only categories (commerce/dynamic) that don't belong in site
 * chrome. `canNest` still governs where each may actually drop.
 */
const CHROME_EDITOR_CATEGORIES: BlockCategory[] = ["chrome", "layout", "content", "media", "newsletter"];

/**
 * Chrome block editor — the standard page-builder infra (the `useEditor` store,
 * canvas, block picker, and the Inspector's Block tab) scoped to a chrome owner
 * (chrome:header / chrome:footer) instead of a page id. Autosaves the DRAFT
 * chrome tree and publishes it; there is no Page-settings tab (chrome has no
 * page row). A template picker seeds a starter tree when the author wants one.
 */
export function ChromeEditor({
  ownerType,
  initialBlocks,
  isDirtyVsPublished,
  enabledTypes,
  firstMenuId,
}: {
  ownerType: ChromeOwnerType;
  initialBlocks: BlockNode[];
  isDirtyVsPublished: boolean;
  enabledTypes?: string[];
  /** Site's first menu id — templates wire it into nav/columns on apply. */
  firstMenuId: string;
}) {
  const storeBlocks = useEditor((s) => s.blocks);
  const readyFor = useEditor((s) => s.readyFor);
  const init = useEditor((s) => s.init);
  const setEnabledTypes = useEditor((s) => s.setEnabledTypes);
  const insert = useEditor((s) => s.insert);
  const dropMove = useEditor((s) => s.dropMove);
  const clearSelection = useEditor((s) => s.clearSelection);
  const device = useEditor((s) => s.device);
  const setDevice = useEditor((s) => s.setDevice);
  const apply = useEditor((s) => s.apply);

  const blocks = readyFor === ownerType ? storeBlocks : initialBlocks;

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishState, setPublishState] = useState<string | null>(null);
  const [draftDiffers, setDraftDiffers] = useState(isDirtyVsPublished);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEnabledTypes(enabledTypes ? new Set(enabledTypes) : null);
  }, [enabledTypes, setEnabledTypes]);

  const scheduleSave = useCallback(
    (tree: BlockNode[]) => {
      if (timer.current) clearTimeout(timer.current);
      setSaveState("saving");
      setDraftDiffers(true);
      timer.current = setTimeout(async () => {
        const res = await saveDraftChrome(ownerType, tree);
        setSaveState(res.ok ? "saved" : "error");
        if (!res.ok) setPublishState(res.error);
      }, 1000);
    },
    [ownerType],
  );

  useEffect(() => {
    init(initialBlocks, scheduleSave, ownerType);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerType]);

  const { dragId, drop, startDrag, dragCandidate, registerEl, registerRoot } = useCanvasDrag({
    blocks,
    dropMove,
    enabled: true,
  });

  const doPublish = async () => {
    setPublishState("Publishing…");
    if (timer.current) clearTimeout(timer.current);
    const saved = await saveDraftChrome(ownerType, blocks);
    if (!saved.ok) return setPublishState(saved.error);
    const res = await publishChrome(ownerType);
    setPublishState(res.ok ? "Published ✓" : res.error);
    if (res.ok) setDraftDiffers(false);
  };

  const applyTemplate = (t: ChromeTemplate) => {
    if (blocks.length > 0 && !window.confirm(`Replace the current ${CHROME_OWNER_LABEL[ownerType].toLowerCase()} with the "${t.label}" template?`)) {
      return;
    }
    clearSelection();
    apply(() => t.build(firstMenuId));
  };

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

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "";
  const templates = chromeTemplatesFor(ownerType);
  const label = CHROME_OWNER_LABEL[ownerType];

  return (
    <div className={shell.shell} data-screen-label={`${label} editor`}>
      <div className={shell.topBar}>
        <Link href="/admin/nav/header" className={shell.back}>← Nav</Link>
        <span className={shell.crumbSep}>/</span>
        <span className={shell.title}>{label}</span>
        <span className={shell.route}>chrome</span>
        <span className={shell.spacer} />
        <TemplateMenu templates={templates} onPick={applyTemplate} />
        <DeviceToggle device={device} onChange={setDevice} />
        <span className={shell.vsep} />
        <span className={`${shell.saveState} ${saveState === "error" ? shell.saveError : ""}`}>{publishState ?? saveLabel}</span>
        <Button variant="accent" size="sm" onClick={doPublish}>Publish</Button>
      </div>

      <div className={shell.canvasWrap}>
        <div className={shell.canvasScroll} onClick={clearSelection} onMouseLeave={() => setHoverId(null)}>
          <div className={shell.canvasPad}>
            <div className={shell.deviceFrame} style={{ maxWidth: 1100 }}>
              {draftDiffers ? (
                <div style={{ padding: "6px var(--space-4)", fontSize: "var(--text-2xs)", color: "var(--accent)", background: "var(--accent-tint)", textAlign: "center" }}>
                  Draft — publish to make it live
                </div>
              ) : null}
              <div ref={registerRoot} style={{ containerType: "inline-size" }} onClick={(e) => e.stopPropagation()}>
                <CanvasChildren blocks={blocks} parentId={null} ctx={dragCtx} />
                <div className={shell.addRow} onClick={(e) => e.stopPropagation()}>
                  <BlockPicker
                    style="menu"
                    category={CHROME_EDITOR_CATEGORIES}
                    onAdd={(t) => insert(null, blocks.length, createBlock(t))}
                    label={blocks.length ? "Add block" : "Add a header/footer block"}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <aside className={shell.inspector}>
          <div className={shell.inspectorBody}>
            <BlockTab />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Small dropdown listing the starter templates for this owner. */
function TemplateMenu({ templates, onPick }: { templates: ChromeTemplate[]; onPick: (t: ChromeTemplate) => void }) {
  const [open, setOpen] = useState(false);
  if (templates.length === 0) return null;
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={shell.segBtn}
        style={{ padding: "6px 10px", fontSize: "var(--text-xs)" }}
      >
        Templates ▾
      </button>
      {open ? (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              zIndex: 50,
              minWidth: 220,
              background: "var(--surface-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-md)",
              padding: "var(--space-2)",
            }}
          >
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(t);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "7px 8px",
                  borderRadius: "var(--radius-xs)",
                  color: "var(--text)",
                }}
              >
                <span style={{ fontSize: "var(--text-sm)" }}>{t.label}</span>
                <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>{t.group}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
