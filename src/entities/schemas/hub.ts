import { z } from "zod";
import type { EntitySchema } from "../types";

/**
 * A guide category ("own your ___"). Taxonomy — managed alongside platforms
 * and matrix pairs rather than as a first-class content grid.
 */
export const hubDataSchema = z.object({
  tagline: z.string().max(300).default(""),
});

export type HubData = z.infer<typeof hubDataSchema>;

export const hubSchema: EntitySchema<typeof hubDataSchema> = {
  entity: "hub",
  label: "Hub",
  plural: "Hubs",
  basePath: "/guides",
  dataSchema: hubDataSchema,
  titleKey: "tagline",
  taxonomy: true,
  listColumns: [
    { key: "tagline", header: "Tagline", width: "1.6fr" },
    { key: "status", header: "Status", width: "8rem" },
  ],
};
