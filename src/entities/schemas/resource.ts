import { z } from "zod";
import type { EntitySchema } from "../types";
import { httpsOrEmpty, slugRef } from "./common";

/**
 * An external (or in-app) reference cited from guides. `is_public` gates
 * whether it ever appears on the public site; `internal_notes` is NEVER
 * rendered publicly — the public router strips it and only ever queries
 * is_public=true, status=published rows.
 */
export const resourceDataSchema = z.object({
  url: httpsOrEmpty,
  resource_type: z
    .enum(["docs", "article", "video", "forum_thread", "tool", "interactive"])
    .default("docs"),
  source_name: z.string().max(120).default(""),
  summary: z.string().max(500).default(""),
  platforms: z.array(z.string().max(80)).max(30).default([]),
  is_public: z.boolean().default(true),
  /** NEVER rendered publicly. Editor-only working notes. */
  internal_notes: z.string().max(2000).default(""),
  /** In-app route for `interactive` resources (e.g. "/quiz"). */
  internal_route: z.string().max(80).optional(),
  category: slugRef.or(z.literal("")).optional(),
});

export type ResourceData = z.infer<typeof resourceDataSchema>;

export const resourceSchema: EntitySchema<typeof resourceDataSchema> = {
  entity: "resource",
  label: "Resource",
  plural: "Resources",
  basePath: "/resources",
  dataSchema: resourceDataSchema,
  titleKey: "source_name",
  listColumns: [
    { key: "resource_type", header: "Type", width: "9rem" },
    { key: "is_public", header: "Visibility", width: "8rem" },
    { key: "status", header: "Status", width: "8rem" },
  ],
};
