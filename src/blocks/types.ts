import type { ReactNode } from "react";
import type { z } from "zod";
import type { Capability } from "./capabilities";

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
   * The current repeater record, when this block is being rendered inside a
   * `collection` item template. Atoms bind to it via `{{record.field}}` tokens
   * (substituted in RenderBlock after validation). Absent everywhere else.
   */
  record?: Record<string, unknown>;
  /**
   * Renders a child block list (layout blocks call this for content.blocks).
   * In the editor this wraps children in selection/drag chrome; on the
   * public site it renders them plainly — blocks never care which. `record`
   * sets the repeater record for the rendered subtree (the collection block).
   */
  children: (blocks: BlockNode[], opts?: { horizontal?: boolean; record?: Record<string, unknown> }) => ReactNode;
  /**
   * The page's precomputed heading-anchor map, keyed by heading block id
   * (from `buildOutline().byBlockId`). Lets `RenderHeading` stamp a
   * page-unique id even when two headings share text — which a per-block
   * slugify can't do in isolation. Absent in the editor / standalone
   * renders, where headings fall back to a bare slug of their own text.
   */
  anchors?: Record<string, string>;
  /**
   * The page's heading outline (from `buildOutline().headings`) — the
   * table-of-contents block reads it here rather than via a resolver, because
   * a bound resolver only sees its own block's content, never the sibling
   * tree. Absent in the editor preview (the TOC shows a placeholder there).
   */
  outline?: OutlineHeadingCtx[];
  /**
   * The current page's identity + resolved ancestor trail — for the
   * breadcrumbs block, which (like the TOC) needs page-level context a
   * per-block resolver can't provide. Absent in the editor preview.
   */
  page?: PageCtx;
};

/** A page heading as seen by the TOC block (mirror of pages/outline.ts's
 *  OutlineHeading — redeclared here to keep blocks/ free of a modules/ import). */
export type OutlineHeadingCtx = { id: string; text: string; level: number };

/** The current page + its published ancestor trail (root→parent), for
 *  breadcrumbs. `siteName`/`siteUrl` feed the BreadcrumbList JSON-LD. */
export type PageCtx = {
  title: string;
  route: string;
  ancestors: Array<{ title: string; route: string }>;
  siteName: string;
  siteUrl: string;
};

export type BlockCategory =
  | "content"
  | "layout"
  | "media"
  | "data"
  | "commerce"
  | "interactive"
  | "newsletter"
  | "dynamic"
  | "chrome";

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
  /**
   * Content-type slugs this block is especially relevant to (highlighted in the
   * picker when templating that type). `["*"]` = relevant to ANY content type
   * (e.g. the field/entry-list blocks). Omitted = never specially suggested.
   */
  suggestedFor?: string[];
  /**
   * An OPTIONAL dependency this block needs (e.g. "lottie" → lottie-web). If the
   * customer removed that package, the block is hidden from the picker and its
   * Render is skipped — graceful degradation, never a build/page crash. See
   * blocks/capabilities.ts. Omitted = the block has no optional-dep requirement.
   */
  requiresCapability?: Capability;
};

/** Content shape all blocks may carry for per-device visibility. */
export type CommonBlockContent = {
  hideOn?: Device[];
};
