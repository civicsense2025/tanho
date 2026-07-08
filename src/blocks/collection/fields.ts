import { z } from "zod";
import { commonContent, styleContent } from "../common";
import { childBlocksSchema } from "../common";

/**
 * Where a collection's records come from. A discriminated union so each source
 * kind validates its own params and the resolver dispatches on `.kind`.
 */
export const collectionSourceSchema = z.discriminatedUnion("kind", [
  // The built-in `entries` store, keyed by entity type ("project", "post", …).
  z.object({ kind: z.literal("entries"), entity: z.string().min(1).max(80) }),
  // A table-backed custom content type, by slug or base path ("products").
  z.object({ kind: z.literal("customType"), type: z.string().min(1).max(80) }),
]);

export type CollectionSource = z.infer<typeof collectionSourceSchema>;

/**
 * A general repeater: binds to a record source and repeats a CHILD BLOCK TREE
 * (`blocks`, the item template) once per record. Atoms inside the template bind
 * to the current record via `{{record.field}}` tokens (resolved at render). This
 * one block replaces every bespoke `*-list`: it lists ANY content, with a card
 * the author designs from ordinary blocks.
 */
export const collectionSchema = z.object({
  ...commonContent,
  ...styleContent,
  source: collectionSourceSchema.default({ kind: "entries", entity: "post" }),
  limit: z.number().int().min(1).max(100).default(6),
  /** List-query knobs (applied in resolve after fetch, before the final slice):
   *  filter → sort → offset → limit. All optional/safe defaults so existing
   *  content (source+limit only) behaves identically. */
  orderBy: z.string().max(80).optional(),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
  filterField: z.string().max(80).optional(),
  filterValue: z.string().max(200).optional(),
  offset: z.number().int().min(0).max(1000).default(0),
  /** The per-record item template — an ordinary child block tree. */
  blocks: childBlocksSchema.default([]),
});

export type CollectionContent = z.infer<typeof collectionSchema>;

export const makeCollection = (): CollectionContent =>
  collectionSchema.parse({ source: { kind: "entries", entity: "post" }, limit: 6, blocks: [] });
