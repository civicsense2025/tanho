import type { ComponentType } from "react";
import { TextRenderer } from "./renderers/TextRenderer";
import { ImageRenderer } from "./renderers/ImageRenderer";
import { VideoRenderer } from "./renderers/VideoRenderer";
import { MetricRenderer } from "./renderers/MetricRenderer";
import { GalleryRenderer } from "./renderers/GalleryRenderer";
import type { BlockType } from "./types";

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
export const blockRenderers: Record<BlockType, ComponentType<{ content: unknown }>> = {
  text: TextRenderer as ComponentType<{ content: unknown }>,
  image: ImageRenderer as ComponentType<{ content: unknown }>,
  video: VideoRenderer as ComponentType<{ content: unknown }>,
  metric: MetricRenderer as ComponentType<{ content: unknown }>,
  gallery: GalleryRenderer as ComponentType<{ content: unknown }>,
};
