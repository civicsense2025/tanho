import type { PaymentsAdapter } from "../types";
import { nullPayments } from "./null";
import { stripePayments } from "./stripe";

/**
 * The active payments adapter. Stripe when a secret key is present, else the
 * null adapter (commerce/membership UI shows a connect state; checkout is
 * refused). Swapping providers = another impl of PaymentsAdapter here.
 */
export const payments: PaymentsAdapter = process.env.STRIPE_SECRET_KEY
  ? stripePayments
  : nullPayments;
