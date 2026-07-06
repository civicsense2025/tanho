/**
 * The WXR importers reuse the Ghost importer's HTML chunker verbatim — it's a
 * pure, dependency-free utility (regex-based top-level-boundary detection,
 * zero Ghost-specific imports) whose whole job is "split a post body at safe
 * top-level element boundaries so an over-cap body becomes multiple sequential
 * richtext blocks instead of being rejected." That requirement is identical
 * for WordPress/Squarespace, so re-export rather than duplicate.
 */
export {
  topLevelBoundaries,
  splitIntoTopLevelElements,
  chunkHtmlAtTopLevelBoundaries,
} from "@/modules/importers/ghost/chunk-html";
