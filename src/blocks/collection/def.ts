import type { BlockDef } from "../types";
import { makeCollection, collectionSchema } from "./fields";
import { RenderCollection } from "./Render";

/**
 * General repeater: binds to a record source and repeats an author-designed item
 * template per record, with per-record field binding via `{{record.*}}` tokens.
 * The general replacement for every bespoke `*-list` (which stay registered).
 *
 * `nestable` (its `blocks` is the item template — a real child tree, so canvas
 * DnD/insert work on it) and `bound` (resolves records server-side). Nested
 * collections are blocked in `canNest` (tree.ts) to bound render fan-out.
 */
export const collectionDef: BlockDef<typeof collectionSchema> = {
  type: "collection",
  category: "dynamic",
  label: "Collection",
  icon: "grid",
  blurb: "Repeat a card you design for every record — posts, products, anything",
  schema: collectionSchema,
  make: makeCollection,
  Render: RenderCollection,
  bound: true,
  nestable: true,
};
