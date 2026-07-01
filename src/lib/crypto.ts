import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const key = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!key) throw new Error("SETTINGS_ENCRYPTION_KEY must be set to encrypt/decrypt settings");
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) throw new Error("SETTINGS_ENCRYPTION_KEY must decode to 32 bytes (openssl rand -base64 32)");
  return buf;
}

/** Encrypts a secret setting value for storage. Output is a single colon-joined base64 string
 * (iv:authTag:ciphertext) so it fits in one TEXT column across all three DB adapters. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

/** Inverse of encryptSecret. Throws if the value was tampered with or encrypted under a
 * different key (GCM auth-tag mismatch). */
export function decryptSecret(stored: string): string {
  const [ivB64, authTagB64, ciphertextB64] = stored.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error("Malformed encrypted setting value");
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf-8");
}
