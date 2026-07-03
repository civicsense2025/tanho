import { z } from "zod";

/** Fields every block content shape carries. */
export const commonContent = {
  /** Hide this block on specific devices (responsive visibility). */
  hideOn: z.array(z.enum(["desktop", "tablet", "mobile"])).optional(),
} as const;

/**
 * Analytics event name fired when a CTA is clicked: ^[a-z0-9_]+$ (matches the
 * /api/track allowlist), or empty for an untracked plain link. Shared by the
 * buttons/pricing/newsletter blocks so their trackEvent field stays consistent.
 */
export const trackEventSchema = z
  .string()
  .max(40)
  .regex(/^[a-z0-9_]*$/, "Lowercase letters, digits and underscores only")
  .default("");

/** A small string-only params bag sent alongside a tracked CTA event. */
export const trackParamsSchema = z
  .record(z.string().max(40), z.string().max(120))
  .default({});

/** Recursive child-block list for nestable layout blocks. */
export type ChildBlocks = Array<{
  id: string;
  type: string;
  content: Record<string, unknown>;
}>;

export const childBlocksSchema: z.ZodType<ChildBlocks> = z.lazy(() =>
  z.array(
    z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      content: z.record(z.string(), z.unknown()),
    }),
  ),
);
