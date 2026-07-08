import { z } from "zod";
import { themeInputSchema } from "@/modules/theme/validation";
import { blockTreeSchema } from "@/modules/pages/validation";
import type { EntitySchema } from "../types";

/**
 * A design pack — a complete template: a theme plus named page block trees.
 * Stored as an entry of type `design_pack`; the `data` JSON carries the theme
 * scalars and the page templates (each a name, a route, and a block tree).
 *
 * Activating a design pack (1) writes the theme to the singleton `theme` row
 * and (2) creates a page per template (route-collisions are skipped with a
 * diagnostic). The block trees are shape-validated on import; unknown block
 * types are preserved so they render as placeholders (the "import never breaks
 * the site" guarantee).
 */
export const designPackDataSchema = z.object({
  description: z.string().max(2000).default(""),
  theme: themeInputSchema,
  pageTemplates: z
    .array(
      z.object({
        name: z.string().max(120).default("Page"),
        route: z.string().max(200).default("/"),
        blocks: blockTreeSchema,
      }),
    )
    .max(50)
    .default([]),
  requiredTypes: z.array(z.string().max(64)).max(200).default([]),
  source: z.enum(["local", "imported", "library", "marketplace"]).default("local"),
  origin: z.string().max(300).default(""),
  packVersion: z.number().int().min(1).default(1),
});

export type DesignPackData = z.infer<typeof designPackDataSchema>;

export const designPackSchema: EntitySchema<typeof designPackDataSchema> = {
  entity: "design_pack",
  label: "Design pack",
  plural: "Design packs",
  /** No public route — design packs are admin/library assets. */
  basePath: "/design-packs",
  dataSchema: designPackDataSchema,
  listColumns: [
    { key: "source", header: "Source", width: "9rem" },
    { key: "packVersion", header: "Version", width: "7rem" },
  ],
};
