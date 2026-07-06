import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

const hrefSchema = z
  .string()
  .min(1)
  .max(2000)
  .regex(/^(https?:\/\/|\/|#|mailto:)/, "Must be a web URL, /path, #anchor or mailto:");

export const checkoutItemSchema = z.object({
  name: z.string().max(160).default(""),
  qty: z.number().int().min(1).max(999).default(1),
  price: z.string().max(60).default(""),
});

/**
 * A static cart-summary CTA card for marketing/preview. The REAL cart is the
 * storefront client island (/shop) — this block never reads live cart state.
 */
export const checkoutSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  items: z.array(checkoutItemSchema).max(50).default([]),
  total: z.string().max(60).default(""),
  cta: z.string().max(60).default("Checkout"),
  href: hrefSchema.default("/shop"),
});

export type CheckoutContent = z.infer<typeof checkoutSchema>;

export const makeCheckout = (): CheckoutContent =>
  checkoutSchema.parse({
    items: [
      { name: "Sample item", qty: 1, price: "$29" },
      { name: "Another item", qty: 2, price: "$18" },
    ],
    total: "$65",
    cta: "Checkout",
    href: "/shop",
  });
