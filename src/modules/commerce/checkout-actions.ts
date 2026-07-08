"use server";

import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { payments } from "@/adapters/payments";
import { getViewer } from "@/modules/people/viewer";
import { readSettingRow } from "@/modules/settings/queries";
import { orderItems, orders, productVariants, products, shippingZones } from "./schema";
import { generateOrderCode } from "./order-code";
import {
  computeShippingCents,
  itemsSubtotalCents,
  priceLineItem,
  type CheckoutRequestItem,
  type PricedItem,
} from "./checkout-pricing";

const requestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).optional(),
        qty: z.number().int().positive().max(999),
      }),
    )
    .min(1)
    .max(50),
  email: z.email().optional(),
  shippingZoneId: z.string().min(1).optional(),
});

export type StartCheckoutResult = { ok: true; url: string } | { ok: false; error: string };

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Whether automatic tax is enabled in the payments settings namespace. */
async function automaticTaxEnabled(): Promise<boolean> {
  const raw = await readSettingRow("payments");
  const parsed = z.object({ automaticTax: z.boolean() }).safeParse(raw);
  return parsed.success ? parsed.data.automaticTax : false;
}

const errorFor = (code: string): string => {
  switch (code) {
    case "unknown_product":
      return "One of your items is no longer available.";
    case "unknown_variant":
      return "A selected option is no longer available.";
    case "insufficient_stock":
      return "One of your items is out of stock.";
    default:
      return "Your cart contains an invalid item.";
  }
};

/**
 * Start a Checkout Session for a cart. SECURITY: every unit price and the
 * total are recomputed from the DB here — the client's localStorage snapshot
 * is display-only and never trusted. Quantities are validated against
 * inventory server-side. Creates a `pending` order the webhook later flips to
 * unfulfilled (and decrements inventory) on payment completion.
 */
export async function startCheckout(input: unknown): Promise<StartCheckoutResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Your cart is empty or invalid." };
  const req = parsed.data;

  // Guest checkout allowed; attach the viewer's identity when present.
  const viewer = await getViewer();
  const email = viewer?.email ?? req.email;
  if (!email) return { ok: false, error: "An email address is required to check out." };

  // Re-fetch every referenced product/variant from the DB.
  const productIds = [...new Set(req.items.map((i) => i.productId))];
  const variantIds = req.items.map((i) => i.variantId).filter((v): v is string => !!v);
  const [dbProducts, dbVariants] = await Promise.all([
    db.query.products.findMany({ where: inArray(products.id, productIds) }),
    variantIds.length
      ? db.query.productVariants.findMany({ where: inArray(productVariants.id, variantIds) })
      : Promise.resolve([]),
  ]);
  const productById = new Map(dbProducts.map((p) => [p.id, p]));
  const variantById = new Map(dbVariants.map((v) => [v.id, v]));

  const priced: PricedItem[] = [];
  for (const item of req.items as CheckoutRequestItem[]) {
    const result = priceLineItem(
      item,
      productById.get(item.productId),
      item.variantId ? variantById.get(item.variantId) : undefined,
    );
    if (!result.ok) return { ok: false, error: errorFor(result.error.code) };
    priced.push(result.item);
  }

  const currency = dbProducts[0]?.currency ?? "usd";
  const subtotalCents = itemsSubtotalCents(priced);

  // Shipping from the chosen zone, computed from DB weights (never client).
  let zone = undefined;
  let shippingCents = 0;
  if (req.shippingZoneId) {
    zone = await db.query.shippingZones.findFirst({
      where: eq(shippingZones.id, req.shippingZoneId),
    });
    const totalWeightLb = priced.reduce((sum, i) => {
      const p = productById.get(i.productId);
      return sum + (Number.parseFloat(p?.weight ?? "") || 0) * i.qty;
    }, 0);
    shippingCents = computeShippingCents(zone, subtotalCents, totalWeightLb);
  }

  const totalCents = subtotalCents + shippingCents;
  const code = generateOrderCode();

  // Record the pending order + snapshot line items (name + DB unit price).
  const [order] = await db
    .insert(orders)
    .values({
      code,
      personId: viewer?.personId ?? null,
      email,
      status: "pending",
      totalCents,
      currency,
    })
    .returning({ id: orders.id });

  await db.insert(orderItems).values(
    priced.map((i) => ({
      orderId: order.id,
      productId: i.productId,
      variantId: i.variantId,
      name: i.name,
      qty: i.qty,
      unitCents: i.unitCents,
    })),
  );

  if (!payments.isConfigured()) {
    return { ok: false, error: "Store isn't accepting payments yet." };
  }

  const { url } = await payments.createCheckoutSession({
    mode: "payment",
    lineItems: priced.map((i) => {
      // Resolve the per-line tax code: variant override > product default.
      const product = productById.get(i.productId);
      const variant = i.variantId ? variantById.get(i.variantId) : undefined;
      const taxCode = variant?.taxCode ?? product?.taxCode ?? undefined;
      const taxBehavior = product?.taxBehavior ?? undefined;
      return {
        amountCents: i.unitCents,
        currency,
        name: i.name,
        quantity: i.qty,
        // Pass through to Stripe Tax when automatic tax is enabled. Stripe
        // ignores these fields when automatic_tax is off, so they're safe to
        // always include.
        ...(taxCode ? { taxCode } : {}),
        ...(taxBehavior ? { taxBehavior } : {}),
      };
    }),
    successUrl: `${appUrl()}/shop/success?code=${encodeURIComponent(code)}`,
    cancelUrl: `${appUrl()}/shop`,
    customerEmail: email,
    clientReferenceId: order.id,
    shippingRates:
      zone && shippingCents > 0
        ? [{ label: zone.name, amountCents: shippingCents }]
        : undefined,
    automaticTax: await automaticTaxEnabled(),
  });

  if (!url) return { ok: false, error: "Could not start checkout. Please try again." };
  return { ok: true, url };
}
