"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { BlockNode } from "@/blocks/types";
import type { PageRow } from "@/modules/pages/queries";
import { publishPage, savePageDetails } from "@/modules/pages/actions";
import { saveOwnerBlocks } from "@/modules/blocks/actions";
import { pageRenderMode } from "@/modules/pages/render-mode";
import { BlockCanvasEditor } from "./BlockCanvasEditor";
import { PageFields, PageMeta, SeoPanel, CustomCodePanel } from "./page-settings";
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
  ogImageMediaId: p.ogImageMediaId ?? null,
  canonicalUrl: p.canonicalUrl,
  noIndex: p.noIndex,
  customCss: p.customCss ?? "",
  customHeadHtml: p.customHeadHtml ?? "",
  customBodyHtml: p.customBodyHtml ?? "",
});

/**
 * Thin page-specific wrapper around BlockCanvasEditor: owns the PageDraft
 * settings state (debounced savePageDetails autosave) and renders the page
 * settings panel + breadcrumb chrome, while the canvas/store/picker/inspector/
 * drag-drop machinery lives in BlockCanvasEditor.
 */
export function PageEditor({
  page,
  initialBlocks,
  isDirtyVsPublished,
  pageOptions = [],
  enabledTypes,
  headerBlocks = [],
  footerBlocks = [],
  isOwner = false,
}: {
  page: PageRow;
  initialBlocks: BlockNode[];
  isDirtyVsPublished: boolean;
  pageOptions?: PageOption[];
  /** Enabled block types from the DB registry (server-fetched). Drives picker
   *  filtering; undefined = show all compiled defs. */
  enabledTypes?: string[];
  /** Published chrome trees (resolved) — shown around the canvas by
   *  BlockCanvasEditor → PreviewChrome so the builder previews the real site. */
  headerBlocks?: BlockNode[];
  footerBlocks?: BlockNode[];
  /** True when the current admin is role "owner" — gates the verbatim custom-code
   *  fields (head/body HTML). Editors see only the sanitised custom-CSS field. */
  isOwner?: boolean;
}) {
  const [draft, setDraft] = useState<PageDraft>(() => toDraft(page));
  // Detail-save (savePageDetails) shares BlockCanvasEditor's top-bar save
  // indicator with block-save, same as pre-extraction — emitted via
  // extraSaveSignal, keyed by a monotonic token so repeat states re-fire.
  const [extraSaveSignal, setExtraSaveSignal] = useState<{ state: "idle" | "saving" | "saved" | "error"; message?: string | null; token: number }>();
  const saveTokenRef = useRef(0);
  const emitSaveSignal = useCallback((state: "idle" | "saving" | "saved" | "error", message?: string | null) => {
    saveTokenRef.current += 1;
    setExtraSaveSignal({ state, message, token: saveTokenRef.current });
  }, []);
  const detailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patchPage = useCallback(
    (partial: Partial<PageDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...partial };
        if (detailTimer.current) clearTimeout(detailTimer.current);
        emitSaveSignal("saving");
        detailTimer.current = setTimeout(async () => {
          const res = await savePageDetails(page.id, next);
          emitSaveSignal(res.ok ? "saved" : "error", res.ok ? undefined : res.error);
        }, 1000);
        return next;
      });
    },
    [page.id, emitSaveSignal],
  );

  const renderMode = pageRenderMode({ hasPaywall: page.hasPaywall });

  const topBarLeft = (
    <>
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
    </>
  );

  const settingsPanel = (
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
    <BlockCanvasEditor
      ownerType="page"
      ownerId={page.id}
      initialBlocks={initialBlocks}
      enabledTypes={enabledTypes}
      settingsPanel={settingsPanel}
      settingsLabel="Page"
      extraSaveSignal={extraSaveSignal}
      initialDraftDiffers={isDirtyVsPublished}
      topBarLeft={topBarLeft}
      screenLabel={`Page editor · ${draft.title}`}
      route={draft.route}
      status={draft.status}
      layout={draft.layout}
      headerBlocks={headerBlocks}
      footerBlocks={footerBlocks}
      onSaveBlocks={(tree) => saveOwnerBlocks("page", page.id, tree)}
      onPublish={async () => {
        const res = await publishPage(page.id);
        if (res.ok) patchPage({ status: "published" });
        return res;
      }}
    />
  );
}
