import { z } from "zod";
import type { EntitySchema } from "../types";
import { httpsOrEmpty, tagList } from "./common";

/** Portfolio project / case study. */
export const projectDataSchema = z.object({
  tagline: z.string().max(300).default(""),
  year: z.string().max(10).default(""),
  live_url: httpsOrEmpty,
  github_url: httpsOrEmpty,
  tags: tagList,
});

export type ProjectData = z.infer<typeof projectDataSchema>;

export const projectSchema: EntitySchema<typeof projectDataSchema> = {
  entity: "project",
  label: "Project",
  plural: "Projects",
  basePath: "/work",
  dataSchema: projectDataSchema,
  titleKey: "tagline",
  listColumns: [
    { key: "year", header: "Year", width: "6rem", align: "start" },
    { key: "tags", header: "Tags", width: "1.4fr" },
    { key: "status", header: "Status", width: "8rem" },
  ],
};
