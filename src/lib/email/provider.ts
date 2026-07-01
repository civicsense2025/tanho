/**
 * Email-send provider seam. The template never builds delivery infrastructure — a site owner
 * brings their own ESP (Resend/Postmark) via env, mirroring the DB_PROVIDER/CONTENT_PROVIDER
 * switch pattern. When unconfigured, the noop provider logs instead of sending, so nothing
 * crashes and local/static setups work without keys. Keys are server-only (never NEXT_PUBLIC_).
 */
import { log } from "@/lib/log";

export interface EmailRecipient {
  email: string;
  /** Optional per-recipient substitutions (e.g. unsubscribe URL). */
  unsubscribeUrl?: string;
}

export interface DeliveryResult {
  email: string;
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  /** One-off transactional email (confirm/unsubscribe). */
  sendTransactional(to: string, subject: string, html: string): Promise<{ messageId: string }>;
  /** Broadcast an issue to many recipients; returns a per-recipient result (best-effort). */
  sendBroadcast(recipients: EmailRecipient[], subject: string, html: string): Promise<DeliveryResult[]>;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || "newsletter@example.com";
}

let _provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (_provider) return _provider;
  const which = (process.env.EMAIL_PROVIDER || "noop").toLowerCase();
  switch (which) {
    case "resend":
      _provider = createResendProvider();
      break;
    case "postmark":
      _provider = createPostmarkProvider();
      break;
    default:
      _provider = createNoopProvider();
  }
  return _provider;
}

// ---- Resend (REST, no SDK) ----
function createResendProvider(): EmailProvider {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY must be set when EMAIL_PROVIDER=resend");
  async function send(to: string | string[], subject: string, html: string): Promise<string> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to, subject, html }),
    });
    if (!res.ok) throw new Error(`Resend send failed: ${res.status}`);
    const data = (await res.json()) as { id?: string };
    return data.id ?? "";
  }
  return {
    async sendTransactional(to, subject, html) {
      return { messageId: await send(to, subject, html) };
    },
    async sendBroadcast(recipients, subject, html) {
      // Per-recipient sends so one failure never aborts the batch, and each can carry its own
      // unsubscribe link substitution.
      return Promise.all(
        recipients.map(async (r): Promise<DeliveryResult> => {
          try {
            const body = r.unsubscribeUrl ? html.replaceAll("{{unsubscribe_url}}", r.unsubscribeUrl) : html;
            return { email: r.email, ok: true, messageId: await send(r.email, subject, body) };
          } catch (e) {
            return { email: r.email, ok: false, error: (e as Error).message };
          }
        })
      );
    },
  };
}

// ---- Postmark (REST, no SDK) ----
function createPostmarkProvider(): EmailProvider {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) throw new Error("POSTMARK_SERVER_TOKEN must be set when EMAIL_PROVIDER=postmark");
  const serverToken: string = token;
  async function send(to: string, subject: string, html: string): Promise<string> {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: { "X-Postmark-Server-Token": serverToken, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ From: fromAddress(), To: to, Subject: subject, HtmlBody: html }),
    });
    if (!res.ok) throw new Error(`Postmark send failed: ${res.status}`);
    const data = (await res.json()) as { MessageID?: string };
    return data.MessageID ?? "";
  }
  return {
    async sendTransactional(to, subject, html) {
      return { messageId: await send(to, subject, html) };
    },
    async sendBroadcast(recipients, subject, html) {
      return Promise.all(
        recipients.map(async (r): Promise<DeliveryResult> => {
          try {
            const body = r.unsubscribeUrl ? html.replaceAll("{{unsubscribe_url}}", r.unsubscribeUrl) : html;
            return { email: r.email, ok: true, messageId: await send(r.email, subject, body) };
          } catch (e) {
            return { email: r.email, ok: false, error: (e as Error).message };
          }
        })
      );
    },
  };
}

// ---- Noop (default; logs) ----
function createNoopProvider(): EmailProvider {
  return {
    async sendTransactional(to, subject) {
      log.info("email:noop transactional", { to, subject });
      return { messageId: "noop" };
    },
    async sendBroadcast(recipients, subject) {
      log.info("email:noop broadcast", { recipientCount: recipients.length, subject });
      return recipients.map((r) => ({ email: r.email, ok: true, messageId: "noop" }));
    },
  };
}
