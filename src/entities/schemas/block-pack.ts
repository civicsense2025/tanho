import { z } from "zod";
import type { EntitySchema } from "../types";

/**
 * A reusable block tree the owner authored, imported, or installed from the
 * marketplace. The block tree itself lives in `block_sets` (ownerType
 * `entry:block_pack`); this `data` holds the pack metadata. `requiredTypes`
 * is the declared dependency list (every block type referenced in the tree) so
 * the destination can warn before install. `source` tracks provenance;
 * `origin` is the peer URL for marketplace-installed packs (for update checks).
 */
export const blockPackDataSchema = z.object({
  description: z.string().max(2000).default(""),
  requiredTypes: z.array(z.string().max(64)).max(200).default([]),
  preview: z
    .object({ colors: z.array(z.string().max(20)).max(8).default([]) })
    .default({ colors: [] }),
  source: z.enum(["local", "imported", "library", "marketplace"]).default("local"),
  origin: z.string().max(300).default(""),
  packVersion: z.number().int().min(1).default(1),
});

export type BlockPackData = z.infer<typeof blockPackDataSchema>;

export const blockPackSchema: EntitySchema<typeof blockPackDataSchema> = {
  entity: "block_pack",
  label: "Block pack",
  plural: "Block packs",
  /** No public route in M2 — block packs are admin/library assets. The router
   *  doesn't handle this base, so it stays admin-only. */
  basePath: "/block-packs",
  dataSchema: blockPackDataSchema,
  listColumns: [
    { key: "source", header: "Source", width: "9rem" },
    { key: "packVersion", header: "Version", width: "7rem" },
  ],
};
