import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { payments } from "@/adapters/payments";
import { formResponses } from "./schema";
import type { FormField } from "./validation";

/**
 * Forms payment: submit-then-pay. When a published form has a "payment"
 * field and Stripe is configured, submitForm creates a Checkout Session
 * after persisting the response, keyed by the response id, and redirects the
 * visitor to it. The webhook (stripe-events.ts, metadata.kind ===
 * "form-payment") marks the response paid on completion — mirroring the
 * existing paid-booking flow in modules/scheduling/booking-payment.ts.
 *
 * No schema change: payment status is recorded inside the response's
 * `values` JSON under a private `_payment` key (never a form field id, so it
 * can't collide with — or be overwritten by — user-submitted values) rather
 * than a new formResponses column.
 */

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** The form's payment field, if it has one (forms support at most one). */
export function paymentField(fields: FormField[]): FormField | null {
  return fields.find((f) => f.kind === "payment") ?? null;
}

/**
 * Create a Checkout Session for a just-persisted response. Amount + currency
 * come from the field definition (server-owned), never the client. There is
 * no dedicated public "/forms/:id" route (forms are embedded via a page
 * block), so success/cancel destinations are the same-site path the caller
 * resolves from the form's own settings (see submit-actions.ts). Returns the
 * hosted payment URL, or null if payments aren't configured or the session
 * couldn't be created.
 */
export async function createFormPaymentCheckout(input: {
  responseId: string;
  formName: string;
  field: FormField;
  returnPath: string;
}): Promise<string | null> {
  if (!payments.isConfigured()) return null;
  if (input.field.amountCents <= 0) return null;

  const back = `${appUrl()}${input.returnPath}`;
  const session = await payments.createCheckoutSession({
    mode: "payment",
    lineItems: [
      {
        name: input.field.label || input.formName,
        amountCents: input.field.amountCents,
        currency: input.field.currency,
        quantity: 1,
      },
    ],
    successUrl: back,
    cancelUrl: back,
    clientReferenceId: input.responseId,
    metadata: { kind: "form-payment", responseId: input.responseId },
  });
  return session.url || null;
}

/**
 * Promote a payment-pending response to paid after Stripe reports payment.
 * Idempotent: a response already marked paid (duplicate webhook) is a no-op.
 * Called by the webhook state machine on checkout.session.completed for
 * form-payment sessions.
 */
export async function markFormResponsePaid(
  responseId: string,
  paymentIntentId: string | null,
): Promise<void> {
  const response = await db.query.formResponses.findFirst({
    where: eq(formResponses.id, responseId),
  });
  if (!response) return;

  const existing = response.values as Record<string, unknown>;
  const currentPayment = existing._payment as { status?: string } | undefined;
  if (currentPayment?.status === "paid") return;

  await db
    .update(formResponses)
    .set({
      values: {
        ...existing,
        _payment: { status: "paid", paymentIntentId },
      },
    })
    .where(eq(formResponses.id, responseId));
}
