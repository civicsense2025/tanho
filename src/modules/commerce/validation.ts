import { z } from "zod";

/**
 * Commerce write schemas. THE authority for prices is integer CENTS — the
 * admin form collects dollars and converts (see money.ts) before it ever
 * reaches these schemas. The storefront and Stripe sync read cents only.
 */

/** Media reference: an app-served upload or an https URL. */
const imageRef = z
  .string()
  .max(2000)
  .regex(/^\/api\/media\/|^https:\/\//, "Must be an /api/media path or https:// URL");

const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only");

const seoSchema = z
  .object({
    title: z.string().max(200).default(""),
    description: z.string().max(400).default(""),
  })
  .default({ title: "", description: "" });

const dimsSchema = z
  .object({
    l: z.string().max(20).default(""),
    w: z.string().max(20).default(""),
    h: z.string().max(20).default(""),
    unit: z.enum(["in", "cm"]).default("in"),
  })
  .default({ l: "", w: "", h: "", unit: "in" });

export const CURRENCIES = ["usd", "eur", "gbp", "cad"] as const;

export const variantSchema = z.object({
  id: z.string().max(40).optional(),
  label: z.string().min(1).max(80),
  priceCents: z.number().int().min(0).max(100_000_00),
  inventory: z.number().int().min(0).max(1_000_000).default(0),
  sku: z.string().max(80).default(""),
  weight: z.string().max(20).default(""),
  dims: z.string().max(120).default(""),
  imageMediaId: z.string().max(120).nullable().default(null),
});
export type VariantInput = z.infer<typeof variantSchema>;

export const productSchema = z.object({
  name: z.string().min(1).max(200),
  slug,
  status: z.enum(["draft", "active"]).default("draft"),
  priceCents: z.number().int().min(0).max(100_000_00),
  compareAtCents: z.number().int().min(0).max(100_000_00).nullable().default(null),
  currency: z.enum(CURRENCIES).default("usd"),
  sku: z.string().max(80).default(""),
  description: z.string().max(100_000).default(""),
  images: z.array(imageRef).max(24).default([]),
  trackInventory: z.boolean().default(true),
  inventory: z.number().int().min(0).max(1_000_000).default(0),
  lowStockThreshold: z.number().int().min(0).max(1_000_000).default(10),
  allowBackorder: z.boolean().default(false),
  weight: z.string().max(20).default(""),
  weightUnit: z.enum(["lb", "kg"]).default("lb"),
  dims: dimsSchema,
  shippingClass: z.enum(["standard", "heavy", "digital"]).default("standard"),
  seo: seoSchema,
});
export type ProductInput = z.infer<typeof productSchema>;

export const collectionSchema = z.object({
  name: z.string().min(1).max(200),
  slug,
  description: z.string().max(2000).default(""),
  coverMediaId: z.string().max(120).nullable().default(null),
  visible: z.boolean().default(true),
  seo: seoSchema,
});
export type CollectionInput = z.infer<typeof collectionSchema>;

export const shippingZoneSchema = z.object({
  name: z.string().min(1).max(80),
  method: z.enum(["flat", "weight"]).default("flat"),
  rateCents: z.number().int().min(0).max(100_000_00).default(0),
  perLbCents: z.number().int().min(0).max(100_000_00).default(0),
  freeOverCents: z.number().int().min(0).max(100_000_00).nullable().default(null),
  countries: z.array(z.string().max(4)).max(300).default([]),
});
export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>;

/** Payments settings namespace — provider-level commerce config. */
export const paymentsSettingsSchema = z.object({
  currency: z.enum(CURRENCIES).default("usd"),
  statementDescriptor: z.string().max(22).default(""),
  automaticTax: z.boolean().default(false),
  payoutSchedule: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});
export type PaymentsSettings = z.infer<typeof paymentsSettingsSchema>;
export const PAYMENTS_DEFAULTS: PaymentsSettings = paymentsSettingsSchema.parse({});

/** Ecommerce settings namespace — store unlock + fulfillment origin. */
export const ecommerceSettingsSchema = z.object({
  unlocked: z.boolean().default(false),
  origin: z.string().max(120).default(""),
  processingDays: z.string().max(60).default("1–2 business days"),
});
export type EcommerceSettings = z.infer<typeof ecommerceSettingsSchema>;
export const ECOMMERCE_DEFAULTS: EcommerceSettings = ecommerceSettingsSchema.parse({});
