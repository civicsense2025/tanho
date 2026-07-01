// Backward-compat shim. The block system's source of truth moved to the pure-data specs
// (kinds/*/spec.ts) collected in registry.ts. This module re-exports the same names the rest
// of the codebase already imports, now derived from those specs, so no call site changes and
// the content types can never drift from their Zod schemas.
import type { RegisteredBlockType } from "./registry";
import { BLOCK_TYPES as REGISTERED_BLOCK_TYPES } from "./registry";
import type { TextContent } from "./kinds/text/spec";
import type { ImageContent } from "./kinds/image/spec";
import type { VideoContent } from "./kinds/video/spec";
import type { MetricContent } from "./kinds/metric/spec";
import type { GalleryContent } from "./kinds/gallery/spec";
import type { RichtextContent } from "./kinds/richtext/spec";
import type { CodeContent } from "./kinds/code/spec";
import type { CalloutContent } from "./kinds/callout/spec";
import type { ChecklistContent } from "./kinds/checklist/spec";

export type BlockType = RegisteredBlockType;

export interface Block {
  type: BlockType;
  content: Record<string, unknown>;
  sortOrder: number;
}

// Old per-block content interfaces, now aliased to the schema-inferred types so a single Zod
// schema is the one source for both runtime validation and static types.
export type TextBlockContent = TextContent;
export type ImageBlockContent = ImageContent;
export type VideoBlockContent = VideoContent;
export type MetricBlockContent = MetricContent;
export type GalleryBlockContent = GalleryContent;
export type RichtextBlockContent = RichtextContent;
export type CodeBlockContent = CodeContent;
export type CalloutBlockContent = CalloutContent;
export type ChecklistBlockContent = ChecklistContent;

export const BLOCK_TYPES: BlockType[] = REGISTERED_BLOCK_TYPES;
