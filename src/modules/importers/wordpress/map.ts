/**
 * The WordPress importer is a thin wrapper over the shared WXR core: a plain
 * WordPress export needs no special card handling beyond the Gutenberg/classic
 * detection in `wxr/card-detect.ts`, so it just re-exports the shared mapper
 * bound to the default (WordPress) detector. Squarespace, by contrast, layers
 * its own detector on top (see squarespace/map.ts).
 */
export {
  mapWxrItemToPage,
  mapWxrAuthor,
  mapItemBody,
  resetBlockIdCounter,
  defaultMapOptions as wordpressMapOptions,
  type MappedItem,
  type MappedAuthor,
  type ImportedBlock,
} from "@/modules/importers/wxr/map";
