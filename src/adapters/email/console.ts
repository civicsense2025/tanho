import type { EmailAdapter, EmailMessage } from "../types";

/**
 * Development email adapter — logs each message to the server console instead
 * of delivering it. Verification, confirmation, and welcome links surface here
 * during local development; swap in an SMTP driver for real delivery.
 */
export class ConsoleEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage): Promise<void> {
    console.log(
      `[email] to=${message.to} subject=${JSON.stringify(message.subject)}\n${message.text}`,
    );
  }
}
