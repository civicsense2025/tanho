import { z } from "zod";

/** URL-safe slug segment. */
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, and dashes");

/** Site-relative route: "/", "/about", "/p/leaving-the-platform". */
export const routeSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/, "Like /about or /p/my-post");

export const pageLayoutSchema = z.object({
  gutter: z.enum(["none", "narrow", "normal", "wide"]).default("normal"),
  padY: z.enum(["none", "sm", "md", "lg"]).default("md"),
  blockGap: z.enum(["none", "sm", "md", "lg"]).default("md"),
  maxWidth: z.enum(["narrow", "normal", "wide", "full"]).default("normal"),
});

export const pageDetailsSchema = z.object({
  title: z.string().min(1).max(200),
  slug: slugSchema,
  route: routeSchema,
  kind: z.enum(["page", "post"]).default("page"),
  parentId: z.string().nullable().default(null),
  status: z.enum(["draft", "published"]).default("draft"),
  tags: z.array(z.string().max(40)).max(20).default([]),
  priority: z.number().int().min(1).max(5).default(3),
  template: z.enum(["blank", "landing", "article", "shop", "docs"]).default("blank"),
  layout: pageLayoutSchema.partial().default({}),
  seoTitle: z.string().max(200).default(""),
  seoDescription: z.string().max(400).default(""),
  canonicalUrl: z.string().max(400).default(""),
  noIndex: z.boolean().default(false),
});

export type PageDetails = z.infer<typeof pageDetailsSchema>;

/** A block node; children validated recursively. Content is validated
 *  per-type against the registry schema in the save action. */
export type BlockNodeInput = {
  id: string;
  type: string;
  content: Record<string, unknown>;
};
export const blockNodeSchema: z.ZodType<BlockNodeInput> = z.lazy(() =>
  z.object({
    id: z.string().min(1).max(64),
    type: z.string().min(1).max(64),
    content: z.record(z.string(), z.unknown()),
  }),
);

export const blockTreeSchema = z.array(blockNodeSchema).max(500);

/** Hard cap on a serialized tree — abuse guard. */
export const MAX_TREE_BYTES = 1_000_000;
