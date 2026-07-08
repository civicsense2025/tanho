import type { ReactNode } from "react";
import { type PageLayoutSettings } from "@/blocks/layout";
import type { BlockNode } from "@/blocks/types";
import { type ContentTypeContext } from "./store";

export type SaveResult = { ok: boolean; error?: string };

export type BlockCanvasEditorProps = {
  ownerType: string;
  ownerId: string;
  initialBlocks: BlockNode[];
  /** Enabled block types from the DB registry (server-fetched). Drives picker
   *  filtering; undefined = show all compiled defs. */
  enabledTypes?: string[];
  /** The owner-specific settings UI, rendered in the Inspector's non-Block tab. */
  settingsPanel: ReactNode;
  onSaveBlocks: (tree: BlockNode[]) => Promise<SaveResult>;
  /** Optional — not every owner type needs a publish step. */
  onPublish?: () => Promise<SaveResult>;
  /** Owner-specific chrome (breadcrumb, title, render-mode…) rendered at the
   *  start of the top bar, before the device/layout/save controls. */
  topBarLeft?: ReactNode;
  /** `data-screen-label` on the fullscreen shell (debugging/e2e hook). */
  screenLabel?: string;
  /** Accepted for back-compat; no longer rendered (the fake address bar was
   *  removed — the canvas shows the real chrome only). */
  route?: string;
  status?: "draft" | "published";
  /** Canvas frame spacing knobs (gutter/padY/blockGap/maxWidth) — same
   *  vocabulary the public renderer uses, so edit and published views match. */
  layout?: PageLayoutSettings;
  /** Inspector's settings-tab label — Inspector defaults this to "Page". */
  settingsLabel?: string;
  /** Lets the owner-specific settings autosave (e.g. PageEditor's debounced
   *  savePageDetails) share the same top-bar save indicator as the block
   *  autosave — mirrors the pre-extraction behavior where both writers set
   *  the same saveState/publishState. `token` must change on every emission
   *  (even repeats of the same state) so the render-time check below re-applies it. */
  extraSaveSignal?: { state: "idle" | "saving" | "saved" | "error"; message?: string | null; token: number };
  /** Whether the draft already differs from the published version on first
   *  paint (server-computed) — seeds the draft-ribbon flag shown in
   *  PreviewChrome. Defaults to false for owner types with no publish step. */
  initialDraftDiffers?: boolean;
  /** The published chrome trees (bound sub-blocks pre-resolved), rendered
   *  read-only around the canvas by PreviewChrome so every editor surface shows
   *  the real site header/footer. Empty = no chrome band. */
  headerBlocks?: BlockNode[];
  footerBlocks?: BlockNode[];
  /** DISPLAY-ONLY per-block content transform for the canvas (see DragCtx.
   *  previewContent). The content-type template editor sets this to fill
   *  {{field}} tokens + resolve `field` blocks from a sample row; undefined
   *  everywhere else. Never affects the stored/saved tree. */
  previewContent?: (content: Record<string, unknown>, type: string) => Record<string, unknown>;
  /** The content type being templated (its fields) — drives the picker's
   *  per-field suggestions, the `field` block picker, and the insert-field
   *  helper. Undefined for pages/entries/chrome editors. */
  contentTypeContext?: ContentTypeContext;
};
