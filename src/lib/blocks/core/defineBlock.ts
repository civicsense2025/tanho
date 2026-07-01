import type { z } from "zod";
import type { StyleCapabilities } from "./style-schema";

/**
 * The unified block-definition API. One `defineBlock({...})` call — living in a block's
 * `spec.ts` — replaces the old six-location edit (union + content interface + BLOCK_TYPES +
 * renderer-map cast + editor-map cast + the orphaned DEFAULT_CONTENT map). It returns FROZEN
 * DATA ONLY: the Renderer and Editor components are intentionally NOT held here. They are wired
 * in the two split maps (renderers.ts server-only, editors.ts client-only) so that importing a
 * spec never drags client editor code into a public page's bundle, nor server renderers into
 * the admin bundle. That bundle split is load-bearing; keeping components off the spec preserves
 * it by construction.
 *
 * `spec.ts` files are pure data (no React, no "use client"), so they are safe to import from
 * anywhere: server pages, client editors, the block-tree validator, and a docs generator.
 */

/** Distinguishes the two block families without forking the API.
 *  - "content"    : inline content lives in the block JSON/DB, has an Editor (text, image, …).
 *  - "data-bound" : renderer is an async Server Component that self-queries the DB; its
 *                   "content" is just presentational props (the homepage list blocks). */
export type BlockKind = "content" | "data-bound";

export interface VariantDef {
  /** Stable id stored in the block, e.g. "grid-2" | "carousel". */
  id: string;
  label: string;
  description?: string;
}

// Import the SiteFeatures type name only for the requiresFeature key union; kept as a type
// import so this pure-data module never pulls the config value in.
type FeatureKey = keyof import("@/config/site.config").SiteFeatures;

export interface BlockSpec<S extends z.ZodTypeAny = z.ZodTypeAny> {
  /** Registry key, e.g. "text" | "gallery" | "project-list" | a user-custom type. */
  type: string;
  kind: BlockKind;
  /** Zod schema for the block's OWN content (style is merged separately by the validator). */
  schema: S;
  /** Default content for a freshly-added block. Typed as the schema INPUT so a spec can lean
   * on `.default()`s (e.g. `{}` for a block whose fields all default) while validation still
   * fills them in. Must satisfy `schema` — asserted at registration. */
  defaultContent: z.input<S>;
  /** Optional selectable layout variants; drives a variant picker in the editor. */
  variants?: VariantDef[];
  /** Which shared style controls this block exposes in its editor. */
  styleCaps?: StyleCapabilities;
  /** Human name for the block picker + docs. */
  label: string;
  category?: "media" | "text" | "data" | "layout";
  /** data-bound blocks may declare which site feature-flag gates them. */
  requiresFeature?: FeatureKey;
}

/**
 * Registers a block. Runtime guardrails turn what used to be silent six-location drift into a
 * boot-time error: the default content must parse against the schema, and variant ids must be
 * unique. The returned spec is frozen so shared registry data can't be mutated at runtime.
 */
export function defineBlock<S extends z.ZodTypeAny>(spec: BlockSpec<S>): BlockSpec<S> {
  const parsed = spec.schema.safeParse(spec.defaultContent);
  if (!parsed.success) {
    throw new Error(
      `defineBlock("${spec.type}"): defaultContent does not satisfy schema — ${parsed.error.message}`
    );
  }
  if (spec.variants) {
    const ids = spec.variants.map((v) => v.id);
    if (new Set(ids).size !== ids.length) {
      throw new Error(`defineBlock("${spec.type}"): duplicate variant id`);
    }
  }
  return Object.freeze(spec);
}
