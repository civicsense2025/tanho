import type { ComponentType } from "react";
import { TextEditor } from "./editors/TextEditor";
import { ImageEditor } from "./editors/ImageEditor";
import { VideoEditor } from "./editors/VideoEditor";
import { MetricEditor } from "./editors/MetricEditor";
import { GalleryEditor } from "./editors/GalleryEditor";
import type { BlockType } from "./types";

export interface BlockEditorProps {
  content: unknown;
  onChange: (content: unknown) => void;
  /** Only used by the image/video/gallery editors; text/metric ignore it. */
  onUpload: (file: File) => Promise<string>;
}

// Admin-only counterpart to src/lib/blocks/renderers.ts. Every entry here has
// its own "use client" directive; this map itself doesn't need one (see that
// file's comment for why), but it's imported only from admin components
// (ProjectForm, PageBuilder) so its client bundle weight never reaches a
// public page.
export const blockEditors: Record<BlockType, ComponentType<BlockEditorProps>> = {
  text: TextEditor as ComponentType<BlockEditorProps>,
  image: ImageEditor as ComponentType<BlockEditorProps>,
  video: VideoEditor as ComponentType<BlockEditorProps>,
  metric: MetricEditor as ComponentType<BlockEditorProps>,
  gallery: GalleryEditor as ComponentType<BlockEditorProps>,
};
