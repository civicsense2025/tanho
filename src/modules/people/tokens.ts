import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

/**
 * Signed, expiring tokens for email links (double-opt-in confirm, unsubscribe,
 * email verification). A token is `payload.expiry.signature`, all base64url;
 * the signature is an HMAC-SHA256 over `purpose|payload|expiry` keyed by a
 * secret derived from APP_ENCRYPTION_KEY. No trust is placed in unsigned URL
 * data — a tampered payload or expiry fails the timing-safe signature check.
 */
const INFO = "people-optin-v1";
const DEV_FALLBACK = "oys-dev-people-optin-insecure-key";

let warned = false;
function signingKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    if (!warned) {
      console.warn(
        "[people] APP_ENCRYPTION_KEY unset — using an insecure dev fallback for email-link signing. Set it in production.",
      );
      warned = true;
    }
  }
  const material = Buffer.from(raw || DEV_FALLBACK, "utf8");
  // HKDF to a stable 32-byte key regardless of the source key length.
  return Buffer.from(hkdfSync("sha256", material, "", INFO, 32));
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");

function sign(purpose: string, payload: string, expiry: number): string {
  return createHmac("sha256", signingKey())
    .update(`${purpose}|${payload}|${expiry}`)
    .digest("base64url");
}

/** Mints a token for `purpose` carrying `payload`, valid for `ttlMs`. */
export function makeSignedToken(
  purpose: string,
  payload: string,
  ttlMs: number,
): string {
  const expiry = Date.now() + ttlMs;
  const sig = sign(purpose, payload, expiry);
  return `${b64(payload)}.${expiry}.${sig}`;
}

/** Verifies a token for `purpose`; returns the payload, or null when invalid/expired. */
export function verifySignedToken(purpose: string, token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [payloadB64, expiryStr, sig] = parts;
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return null;

  let payload: string;
  try {
    payload = unb64(payloadB64!);
  } catch {
    return null;
  }
  const expected = sign(purpose, payload, expiry);
  const a = Buffer.from(sig!);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return payload;
}

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
