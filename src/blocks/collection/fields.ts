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
  /** The per-record item template — an ordinary child block tree. */
  blocks: childBlocksSchema.default([]),
});

export type CollectionContent = z.infer<typeof collectionSchema>;

export const makeCollection = (): CollectionContent =>
  collectionSchema.parse({ source: { kind: "entries", entity: "post" }, limit: 6, blocks: [] });
