import { isContainer, kidsOf } from "@/blocks/tree";
import type { BlockNode } from "@/blocks/types";

/**
 * Portability allowlist — which block types are safe to include in a portable
 * pack (`.lamina-pack.json`). A block may be:
 *
 *   - ALWAYS safe (allowlist): pure presentational content with no site-specific
 *     dependencies. Exported verbatim, imports without configuration.
 *   - REQUIRES CONFIG: exportable, but the destination must reconfigure it
 *     (e.g. a paywall tied to membership tiers, a form bound to a form record,
 *     a data-bound block that resolves live CMS rows). Kept in the pack and
 *     flagged via `requiresConfigTypes` so the importer can warn the user.
 *   - EXCLUDED: never exported (would break or leak site-specific state). Stripped
 *     from the tree before serialization and reported via `excludedTypes`.
 *
 * Unknown block types (no compiled def on the exporting install) are left alone
 * — they already render as placeholders on the destination, and the allowlist
 * can't reason about types it doesn't know.
 */

/**
 * Always safe to export — pure content/layout/media with no site-specific
 * dependencies. Mirrors the content/layout/media block families in the registry.
 */
export const PORTABILITY_ALLOWLIST = new Set<string>([
  // content
  "heading",
  "richtext",
  "quote",
  "code",
  "callout",
  "list",
  "buttons",
  "accordion",
  // layout
  "section",
  "container",
  "row",
  "columns",
  "spacer",
  "divider",
  // media
  "image",
  "gallery",
  "video",
  "carousel",
  "embed",
  // data (presentational — values live in the block content, not a data source)
  "metric",
  "table",
  "chart",
  "timeline",
  "progress",
]);

/**
 * Exportable but the destination must reconfigure before the block works.
 * Bound blocks (`bound: true` in their def) resolve server data per-install,
 * and commerce/interactive blocks reference site-specific records (forms,
 * products, membership tiers). Kept in the pack so the structure survives;
 * flagged so the importer can surface a "configure these" warning.
 */
export const PORTABILITY_REQUIRES_CONFIG = new Set<string>([
  // dynamic data (bound to live CMS records)
  "profile-header",
  "project-list",
  "experience-list",
  "skills-list",
  "award-list",
  "education-list",
  // newsletter / membership
  "paywall",
  "newsletter",
  "account",
  "postlist",
  // commerce (bound to product/form records)
  "product",
  "productgrid",
  "pricing",
  "checkout",
  "booking",
  // interactive (form bound to a form record)
  "form",
]);

/**
 * Never exported in portable packs. Currently empty — every compiled block is
 * either always-safe or requires-config. Internal-ID-only blocks (if any are
 * added later) would land here so they can't break a foreign install.
 */
export const PORTABILITY_EXCLUDED = new Set<string>([]);

/** True if the type may appear in a portable pack (allowlist OR requires-config). */
export function isPortable(type: string): boolean {
  return PORTABILITY_ALLOWLIST.has(type) || PORTABILITY_REQUIRES_CONFIG.has(type);
}

/** True if the type is exportable but needs configuration on import. */
export function requiresConfig(type: string): boolean {
  return PORTABILITY_REQUIRES_CONFIG.has(type);
}

/** True if the type must never be exported in a portable pack. */
export function isExcluded(type: string): boolean {
  return PORTABILITY_EXCLUDED.has(type);
}

export type FilterResult = {
  /** The portable subset of the tree: excluded blocks stripped, allowlisted +
   *  requires-config + unknown types kept. Structure (nesting) is preserved. */
  portable: BlockNode[];
  /** Types in the kept tree that need configuration on import (deduped). */
  requiresConfigTypes: string[];
  /** Types that were stripped from the tree (deduped). */
  excludedTypes: string[];
};

/**
 * Walk a block tree, strip excluded blocks (preserving nesting for containers),
 * and collect diagnostics. Unknown types are kept untouched (the allowlist
 * can't reason about them; they render as placeholders on the destination).
 */
export function filterPortableBlocks(blocks: BlockNode[]): FilterResult {
  const requiresConfigTypes = new Set<string>();
  const excludedTypes = new Set<string>();

  const walk = (nodes: BlockNode[]): BlockNode[] => {
    const out: BlockNode[] = [];
    for (const node of nodes) {
      if (isExcluded(node.type)) {
        excludedTypes.add(node.type);
        continue;
      }
      if (requiresConfig(node.type)) requiresConfigTypes.add(node.type);
      let content = node.content;
      if (isContainer(node)) {
        const kids = walk(kidsOf(node));
        content = { ...content, blocks: kids };
      }
      out.push({ ...node, content });
    }
    return out;
  };

  const portable = walk(blocks);
  return {
    portable,
    requiresConfigTypes: [...requiresConfigTypes],
    excludedTypes: [...excludedTypes],
  };
}
