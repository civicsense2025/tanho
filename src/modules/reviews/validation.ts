import { z } from "zod";

/**
 * Reviews write schemas — the authority for review submission, replies, and
 * per-target config. Shared by server actions (cookie) and API v1 routes
 * (bearer), mirroring the commerce/validation.ts pattern.
 */

/**
 * Target type strings the system recognizes.
 *
 * RESTRICTED to products only (migration 0034). Reviews are now a product
 * attribute — a course review is a review on the course product, not on a
 * free-floating entry. Existing non-product reviews are migrated out by
 * scripts/migrate-reviews-to-products.ts. The `verifiedMethod` enum still
 * carries enrollment/membership for import-row compatibility, but new
 * submissions must target a product.
 */
export const targetTypeSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^product$/, "Must be 'product'");

/** Public submit. `rating` is 0 only when the target is comment-only. */
export const reviewSubmitSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1).max(80),
  rating: z.number().int().min(0).max(5),
  title: z.string().max(120).default(""),
  body: z.string().max(5000).default(""),
  /** mediaIds — resolved/validated against the media module on write. */
  photos: z.array(z.string().max(80)).max(6).default([]),
  /** Type-specific extras (course completion %, dimension ratings, reaction). */
  meta: z.record(z.string(), z.unknown()).default({}),
});

/** Owner edits their own review (within the edit window enforced in actions). */
export const reviewUpdateSchema = z.object({
  rating: z.number().int().min(0).max(5),
  title: z.string().max(120).default(""),
  body: z.string().max(5000).default(""),
  photos: z.array(z.string().max(80)).max(6).default([]),
  meta: z.record(z.string(), z.unknown()).default({}),
});

/** Admin reply to a review — one reply per review (upsert semantics). */
export const reviewReplySchema = z.object({
  body: z.string().min(1).max(2000),
});

/** Admin moderation note (optional, shown only in admin). */
export const reviewModerateSchema = z.object({
  note: z.string().max(500).default(""),
});

/** Per-target-type config upsert. */
export const reviewTargetConfigSchema = z.object({
  targetType: targetTypeSchema,
  enabled: z.boolean().default(true),
  moderation: z.enum(["pre", "post"]).default("post"),
  verifiedGate: z.enum(["required", "optional"]).default("optional"),
  requireLogin: z.boolean().default(true),
  allowRating: z.boolean().default(true),
  minRating: z.number().int().min(0).max(5).default(1),
  maxRating: z.number().int().min(1).max(10).default(5),
});

/** Import row (migration tooling) — reviews seeded as already-approved. */
export const reviewImportRowSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1).max(80),
  personId: z.string().min(1).max(80),
  rating: z.number().int().min(0).max(5),
  title: z.string().max(120).default(""),
  body: z.string().max(5000).default(""),
  verified: z.boolean().default(false),
  verifiedMethod: z.enum(["order", "enrollment", "membership", "none"]).default("none"),
  verifiedRef: z.string().max(80).optional(),
  at: z.number().int().min(0).optional(),
});

/** Block-level sort options (mirrored in the block inspector). */
export const reviewSortSchema = z.enum(["recent", "helpful", "highest", "lowest"]);

export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>;
export type ReviewReplyInput = z.infer<typeof reviewReplySchema>;
export type ReviewTargetConfigInput = z.infer<typeof reviewTargetConfigSchema>;
export type ReviewImportRowInput = z.infer<typeof reviewImportRowSchema>;
export type ReviewSort = z.infer<typeof reviewSortSchema>;
