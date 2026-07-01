export type BlockType = "text" | "image" | "video" | "metric" | "gallery";

export interface Block {
  type: BlockType;
  content: Record<string, unknown>;
  sortOrder: number;
}

export interface TextBlockContent {
  html: string;
}

export interface ImageBlockContent {
  url: string;
  caption?: string;
}

export interface VideoBlockContent {
  url: string;
  caption?: string;
  poster?: string;
}

export interface MetricBlockContent {
  metrics: { label: string; value: string }[];
}

export interface GalleryBlockContent {
  images: { url: string; caption?: string }[];
}

export const BLOCK_TYPES: BlockType[] = ["text", "image", "video", "metric", "gallery"];
