import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { generateSecret as otpGenerateSecret, generateURI, verify as otpVerify } from "otplib";

// AES-256-GCM encryption key derived from APP_ENCRYPTION_KEY (same env var as
// auth/tokens.ts). HKDF with a dedicated `info` string derives an isolated
// 256-bit key so the TOTP encryption key is cryptographically separate from the
// signed-token signing key, even though both stem from the same root secret.
const TOTP_KEY_INFO = "lamina-totp-encryption-v1";
const DEV_FALLBACK = "lamina-dev-totp-insecure-key";

let warned = false;
function encryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw && !warned) {
    console.warn(
      "[mfa] APP_ENCRYPTION_KEY unset — using an insecure dev fallback for TOTP secret encryption. Set it in production.",
    );
    warned = true;
  }
  return Buffer.from(hkdfSync("sha256", Buffer.from(raw || DEV_FALLBACK, "utf8"), "", TOTP_KEY_INFO, 32));
}

/**
 * Encrypts a base32 TOTP secret with AES-256-GCM. The ciphertext blob is
 * `iv:ciphertext:authTag` (all base64). The auth tag makes any tampering
 * detectable on decrypt — a DB leak alone can't mint valid TOTP codes.
 */
export function encryptSecret(base32Secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(base32Secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), encrypted.toString("base64"), tag.toString("base64")].join(":");
}

/** Decrypts a blob produced by `encryptSecret`. Throws on tamper / wrong key. */
export function decryptSecret(encrypted: string): string {
  const [ivB64, dataB64, tagB64] = encrypted.split(":");
  if (!ivB64 || !dataB64 || !tagB64) throw new Error("Invalid TOTP secret blob");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

/** Generates a fresh base32-encoded TOTP secret (RFC 6238 default: 20 bytes). */
export function generateSecret(): string {
  return otpGenerateSecret();
}

/**
 * Verifies a 6-digit TOTP `token` against the base32 `secret`. Returns true
 * only on a match within the default time step. Returns false (never throws)
 * on a malformed token — otplib raises `TokenLengthError` for non-6-digit
 * input, but a caller passing a backup code (12 chars) to the unified verify
 * path must not crash; it should simply fall through to the backup-code check.
 */
export async function verifyTotp(token: string, base32Secret: string): Promise<boolean> {
  try {
    const result = await otpVerify({ secret: base32Secret, token });
    return result.valid;
  } catch {
    return false;
  }
}

/** Builds an `otpauth://totp/...` URI for QR-code enrollment. */
export function buildOtpauthUri(email: string, base32Secret: string): string {
  return generateURI({ issuer: "Lamina", label: email, secret: base32Secret });
}
