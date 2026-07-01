import { z } from "zod";

/** Payment payload schemas. Kept in the stripe module (not the shared validation file) so this
 * feature is self-contained. The client picks a KIND and optionally a priceId/postId/email; the
 * server maps those to a server-known price — the client never sends an amount (donations use
 * Stripe's bounded custom_unit_amount). */
export const checkoutSchema = z.object({
  kind: z.enum(["one_time", "subscription", "donation"]),
  priceId: z.string().max(255).optional(),
  postId: z.string().max(255).optional(),
  email: z.string().trim().toLowerCase().email().max(320).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
