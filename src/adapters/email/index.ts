import type { EmailAdapter } from "../types";
import { ConsoleEmailAdapter } from "./console";

/**
 * Email singleton — the one import site for outbound mail. EMAIL_DRIVER is
 * reserved for future drivers (smtp, resend, …); every value currently falls
 * back to the console adapter so setting the env var ahead of a driver landing
 * is harmless.
 */
function createEmail(): EmailAdapter {
  switch (process.env.EMAIL_DRIVER) {
    case "console":
    default:
      return new ConsoleEmailAdapter();
  }
}

export const email: EmailAdapter = createEmail();
