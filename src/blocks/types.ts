import type { ReactNode } from "react";
import type { z } from "zod";

/** One node in a page's block tree. Layout blocks nest via content.blocks. */
export type BlockNode = {
  id: string;
  type: string;
  content: Record<string, unknown>;
};

export type Device = "desktop" | "tablet" | "mobile";

/**
 * The reading viewer, for server-enforced gating. Null = anonymous.
 * Membership state is resolved server-side (modules/people/viewer) — a
 * block Render never decides access; the walker does, before serializing.
 */
export type RenderViewer = {
  personId: string;
  memberActive: boolean;
  tier: string | null;
} | null;

/** Context threaded through a render pass. */
export type RenderCtx = {
  /** "public" = visitor page; "editor" = admin canvas/preview. */
  mode: "public" | "editor";
  device: Device;
  /** The reader, for paywall gating. Always null in editor mode. */
  viewer: RenderViewer;
  /**
   * Renders a child block list (layout blocks call this for content.blocks).
   * In the editor this wraps children in selection/drag chrome; on the
   * public site it renders them plainly — blocks never care which.
   */
  children: (blocks: BlockNode[], opts?: { horizontal?: boolean }) => ReactNode;
};

export type BlockCategory =
  | "content"
  | "layout"
  | "media"
  | "data"
  | "commerce"
  | "interactive"
  | "newsletter"
  | "dynamic";

/**
 * The block contract — ONE definition drives the picker, editor form,
 * inspector, and renderer.
 *
 * Rules that keep one renderer possible:
 * - `Render` is pure and client-safe: no data fetching, no async.
 * - Server data for bound blocks comes from `resolve()` (server-only file),
 *   whose result is passed to Render as `content._resolved`.
 */
export type BlockDef<S extends z.ZodType = z.ZodType> = {
  type: string;
  category: BlockCategory;
  label: string;
  icon: string;
  blurb: string;
  /** zod schema for content — validated on save AND before render. */
  schema: S;
  /** Default content for a freshly added block. */
  make: () => z.infer<S>;
  /** Pure presentation. */
  Render: (props: { content: z.infer<S>; ctx: RenderCtx }) => ReactNode;
  /**
   * Bound blocks (`bound: true`) resolve server-side data before render. The
   * resolver itself lives in the SERVER-ONLY `blocks/resolvers.ts` registry
   * keyed by block type — NOT on this def — so the client editor (which imports
   * every def through `registry.ts`) never pulls a server query into its bundle.
   * The walker awaits the resolver and passes the result to Render as
   * `content._resolved`; the editor shows a placeholder for bound blocks.
   */
  /** Layout blocks that hold children. */
  nestable?: boolean;
  /** Supports per-device column collapse. */
  responsive?: boolean;
  /** Bound blocks resolve server data before render (path within blocks/<type>/resolve.ts). */
  bound?: boolean;
  /** Hidden from the picker (pinned entity blocks). */
  hidden?: boolean;
  /** Pinned blocks can't be removed/moved below other blocks. */
  pinned?: boolean;
};

/** Content shape all blocks may carry for per-device visibility. */
export type CommonBlockContent = {
  hideOn?: Device[];
};
