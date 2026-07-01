import type { BlockSpec } from "./core/defineBlock";
import { textSpec } from "./kinds/text/spec";
import { imageSpec } from "./kinds/image/spec";
import { videoSpec } from "./kinds/video/spec";
import { metricSpec } from "./kinds/metric/spec";
import { gallerySpec } from "./kinds/gallery/spec";
import { richtextSpec } from "./kinds/richtext/spec";
import { codeSpec } from "./kinds/code/spec";
import { calloutSpec } from "./kinds/callout/spec";
import { checklistSpec } from "./kinds/checklist/spec";

/**
 * The single source of truth for content-carrying block types. PURE DATA — no React, no
 * "use client" — so it's safe to import from server pages, client editors, the block-tree
 * validator, and a docs generator alike. The component wiring lives in the two split maps
 * (renderers.ts / editors.ts), which are derived from these same specs.
 *
 * Data-bound homepage blocks have their own registry (components/homepage/registry.tsx) because
 * they're async Server Components with a different (props-spread) render signature; they are
 * bridged, not merged (see RenderBlock).
 */
// Literal string keys (not computed [spec.type]) so RegisteredBlockType is a precise string
// union rather than widening to `string | number`. Each key must equal its spec's `type`.
export const blockSpecs = {
  text: textSpec,
  image: imageSpec,
  video: videoSpec,
  metric: metricSpec,
  gallery: gallerySpec,
  richtext: richtextSpec,
  code: codeSpec,
  callout: calloutSpec,
  checklist: checklistSpec,
} satisfies Record<string, BlockSpec>;

export type RegisteredBlockType = keyof typeof blockSpecs;

/** Ordered list of registered block types, used by the block picker + default insertion. */
export const BLOCK_TYPES = Object.keys(blockSpecs) as RegisteredBlockType[];

export function getBlockSpec(type: string): BlockSpec | undefined {
  return blockSpecs[type as RegisteredBlockType];
}
