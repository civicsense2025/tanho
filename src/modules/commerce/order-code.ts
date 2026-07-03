import { randomBytes } from "node:crypto";

// Crockford base32 (no I, L, O, U) — unambiguous, URL-safe, human-legible.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * A short, unguessable order code, e.g. "ORD-7F3KQ9ZB". 8 base32 chars = 40
 * bits of crypto-random entropy, so the success page (which looks orders up
 * by code) cannot be enumerated. NOT sequential — never derived from a count.
 */
export function generateOrderCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `ORD-${out}`;
}
