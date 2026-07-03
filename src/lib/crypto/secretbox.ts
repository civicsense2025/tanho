import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

/**
 * Authenticated symmetric encryption for secrets at rest — BYO integration
 * credentials (OAuth refresh tokens, AI provider API keys). AES-256-GCM with a
 * per-message random IV; the 16-byte auth tag makes tampering detectable.
 *
 * The key is derived with HKDF-SHA256 from APP_ENCRYPTION_KEY, so any key
 * length works and this key space is separated from the HMAC signing key used
 * for email links (different `info` string — see people/tokens.ts).
 *
 * WHITE-LABEL / SECURITY: in production APP_ENCRYPTION_KEY is MANDATORY. There
 * is a dev-only fallback (with a one-time warning) so a fresh clone boots, but
 * `sealSecret` throws in production when the key is unset — we never want to
 * write "encrypted" credentials under a publicly-known key.
 */
const INFO = "oys-secretbox-v1";
const DEV_FALLBACK = "oys-dev-secretbox-insecure-key-do-not-ship";
const IV_BYTES = 12; // GCM standard nonce length.

let warned = false;

function encryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "APP_ENCRYPTION_KEY is required in production to encrypt integration credentials. Generate one with `openssl rand -hex 32`.",
      );
    }
    if (!warned) {
      console.warn(
        "[secretbox] APP_ENCRYPTION_KEY unset — using an insecure dev fallback for credential encryption. Set it before storing real secrets.",
      );
      warned = true;
    }
  }
  const material = Buffer.from(raw || DEV_FALLBACK, "utf8");
  return Buffer.from(hkdfSync("sha256", material, "", INFO, 32));
}

/**
 * Encrypt a UTF-8 string into a self-describing token: `iv.tag.ciphertext`,
 * each segment base64url. Safe to store as a plain DB text column.
 */
export function sealSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    ct.toString("base64url"),
  ].join(".");
}

/**
 * Decrypt a token produced by `sealSecret`. Returns null on any failure —
 * malformed input, wrong key, or a failed auth tag (tampered ciphertext) — so
 * callers fail closed rather than trusting corrupted secrets.
 */
export function openSecret(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const [ivB64, tagB64, ctB64] = parts;
    const iv = Buffer.from(ivB64!, "base64url");
    const tag = Buffer.from(tagB64!, "base64url");
    const ct = Buffer.from(ctB64!, "base64url");
    if (iv.length !== IV_BYTES || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8");
  } catch {
    return null;
  }
}

/** Encrypt a JSON-serializable value. */
export function sealJson(value: unknown): string {
  return sealSecret(JSON.stringify(value));
}

/** Decrypt to a JSON value, or null on any failure. */
export function openJson<T>(token: string): T | null {
  const raw = openSecret(token);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
