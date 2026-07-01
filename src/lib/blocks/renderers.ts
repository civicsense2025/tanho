import type { ComponentType } from "react";
import { TextRenderer } from "./renderers/TextRenderer";
import { ImageRenderer } from "./renderers/ImageRenderer";
import { VideoRenderer } from "./renderers/VideoRenderer";
import { MetricRenderer } from "./renderers/MetricRenderer";
import { GalleryRenderer } from "./renderers/GalleryRenderer";
import type { BlockType } from "./types";

/** Shared render signature. `content` is the block's own content (widened to one type across
 * all blocks — the intentional erasure point); `variant`/`columns` are the optional style
 * threads that layout-aware renderers (gallery, metric) read and others ignore. */
export type BlockRendererProps = { content: unknown; variant?: string; columns?: number };

// No "use client" here and none of the components below have it either --
// this map is imported only from server-rendered public pages, and keeping
// every entry server-compatible means it never accidentally pulls admin-only
// client bundle weight into that path. See src/lib/blocks/editors.ts for the
// admin-side counterpart (deliberately a separate module, not merged into
// this one, so a Server Component importing this file never has to reason
// about client-only imports transitively).
// Each Renderer's `content` prop is typed to its own block's shape
// (TextBlockContent, ImageBlockContent, ...); this map necessarily erases
// that to a single signature so all five can live under one BlockType key.
// The one intentional widening point is documented in BlockTree, which is
// the only place that reads through this map.
export const blockRenderers: Record<BlockType, ComponentType<BlockRendererProps>> = {
  text: TextRenderer as ComponentType<BlockRendererProps>,
  image: ImageRenderer as ComponentType<BlockRendererProps>,
  video: VideoRenderer as ComponentType<BlockRendererProps>,
  metric: MetricRenderer as ComponentType<BlockRendererProps>,
  gallery: GalleryRenderer as ComponentType<BlockRendererProps>,
};
