import { z } from "zod";
import type { EntitySchema } from "../types";

/**
 * A source or target platform. Drives guide source/target selects and the
 * flagship hub's roadmap matrix axes. Taxonomy.
 */
export const platformDataSchema = z.object({
  name: z.string().max(80).default(""),
  kind: z.enum(["source", "target"]).default("source"),
  category: z.string().max(60).default(""),
});

export type PlatformData = z.infer<typeof platformDataSchema>;

export const platformSchema: EntitySchema<typeof platformDataSchema> = {
  entity: "platform",
  label: "Platform",
  plural: "Platforms",
  basePath: "/guides",
  dataSchema: platformDataSchema,
  titleKey: "name",
  taxonomy: true,
  listColumns: [
    { key: "kind", header: "Kind", width: "7rem" },
    { key: "category", header: "Category", width: "1.2fr" },
    { key: "status", header: "Status", width: "8rem" },
  ],
};
