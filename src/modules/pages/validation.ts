import { z } from "zod";
import { sanitizeCss } from "@/lib/css-sanitizer";

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
  ogImageMediaId: z.string().nullable().default(null),
  canonicalUrl: z.string().max(400).default(""),
  noIndex: z.boolean().default(false),
  // Per-page custom code. `customCss` is sanitised (available to any admin);
  // customHead/BodyHtml are rendered VERBATIM and are OWNER-ONLY — the save action
  // (modules/pages/actions.ts) enforces role and sanitises CSS. Schema-layer caps only.
  customCss: z.string().max(50000).default(""),
  customHeadHtml: z.string().max(50000).default(""),
  customBodyHtml: z.string().max(50000).default(""),
});

export type PageDetails = z.infer<typeof pageDetailsSchema>;

/** The page-detail fields that carry OWNER-ONLY raw code (rendered verbatim, no
 *  sanitiser). The save path strips these unless the caller is role "owner". */
export const OWNER_ONLY_PAGE_FIELDS = ["customHeadHtml", "customBodyHtml"] as const;

/**
 * Secure the per-page custom-code fields IN PLACE before they hit the DB — the single
 * authoritative gate, shared by BOTH write paths (the savePageDetails server action AND
 * the /api/v1/pages REST route, so neither can be used to bypass the other):
 *  - `customCss` is SANITISED (AST-rebuilt, allow-listed, page-scoped) — any admin.
 *  - `customHeadHtml` / `customBodyHtml` render VERBATIM (real <script>), so they are
 *    OWNER-ONLY: when `isOwner` is false these keys are DELETED from the payload.
 * Only touches keys that are present (works on a `.partial()` object).
 */
export function secureCustomCode(data: Record<string, unknown>, isOwner: boolean): void {
  if (typeof data.customCss === "string") {
    data.customCss = data.customCss ? sanitizeCss(data.customCss) : "";
  }
  if (!isOwner) {
    for (const f of OWNER_ONLY_PAGE_FIELDS) delete data[f];
  }
}

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
