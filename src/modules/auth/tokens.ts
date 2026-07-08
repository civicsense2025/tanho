import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

/** 256-bit opaque session token — the value that lives in the cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only the SHA-256 of the token is stored; the DB never sees the token. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Signed, expiring tokens for admin email links (password reset). A token is
 * `payload.expiry.signature`, all base64url; the signature is an
 * HMAC-SHA256 over `purpose|payload|expiry` keyed by a secret derived from
 * APP_ENCRYPTION_KEY. No trust is placed in unsigned URL data — a tampered
 * payload or expiry fails the timing-safe signature check.
 *
 * Same pattern as `modules/people/tokens.ts` (reader-facing invite/verify/
 * opt-in links) — kept as a separate copy rather than a cross-import since
 * `users` (admin) and `people` (readers) are deliberately separate
 * principal types (see docs/architecture/auth.md) and `auth/` is the more
 * foundational of the two modules.
 */
const SIGNED_TOKEN_INFO = "admin-signed-token-v1";
const DEV_FALLBACK = "lamina-dev-admin-token-insecure-key";

let warned = false;
function signingKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw && !warned) {
    console.warn(
      "[auth] APP_ENCRYPTION_KEY unset — using an insecure dev fallback for admin token signing. Set it in production.",
    );
    warned = true;
  }
  const material = Buffer.from(raw || DEV_FALLBACK, "utf8");
  return Buffer.from(hkdfSync("sha256", material, "", SIGNED_TOKEN_INFO, 32));
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");

function sign(purpose: string, payload: string, expiry: number): string {
  return createHmac("sha256", signingKey())
    .update(`${purpose}|${payload}|${expiry}`)
    .digest("base64url");
}

/** Mints a token for `purpose` carrying `payload`, valid for `ttlMs`. */
export function makeSignedToken(purpose: string, payload: string, ttlMs: number): string {
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

export const HOUR_MS = 60 * 60 * 1000;
