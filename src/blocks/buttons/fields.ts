import { z } from "zod";
import { commonContent, styleContent, trackEventSchema, trackParamsSchema } from "../common";

/** Safe link targets only: web URLs, site-relative paths, anchors, mailto. */
const hrefSchema = z
  .string()
  .min(1)
  .max(2000)
  .regex(/^(https?:\/\/|\/|#|mailto:)/, "Must be a web URL, /path, #anchor or mailto:");

export const buttonItemSchema = z.object({
  label: z.string().max(100).default(""),
  href: hrefSchema.default("#"),
  variant: z.enum(["solid", "outline"]).default("solid"),
  target: z.enum(["_self", "_blank"]).default("_self"),
  /** When set, the CTA fires this analytics event on click. */
  trackEvent: trackEventSchema,
  params: trackParamsSchema,
});

export const buttonsSchema = z.object({
  ...commonContent,
  ...styleContent,
  align: z.enum(["left", "center", "right"]).default("left"),
  items: z.array(buttonItemSchema).max(50).default([]),
});

export type ButtonsContent = z.infer<typeof buttonsSchema>;

export const makeButtons = (): ButtonsContent =>
  buttonsSchema.parse({
    align: "left",
    items: [
      { label: "Get started", href: "#", variant: "solid", target: "_self" },
      { label: "Learn more", href: "#", variant: "outline", target: "_self" },
    ],
  });
