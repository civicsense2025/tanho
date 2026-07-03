import { randomBytes } from "node:crypto";

/**
 * Crockford base32 alphabet (no I, L, O, U — unambiguous when read aloud or
 * typed from a confirmation page).
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Generate an unguessable manage code for a booking. For a guest this code IS
 * the authorization to cancel/reschedule (there is no login), so it must be
 * high-entropy and crypto-random. 8 base32 chars = 40 bits of entropy.
 */
export function generateManageCode(): string {
  const bytes = randomBytes(5); // 40 bits
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    // Two chars per byte would overshoot; map each byte into the alphabet and
    // pull an extra char from the high nibble to reach 8 chars total.
    out += ALPHABET[bytes[i]! & 0x1f];
    out += ALPHABET[(bytes[i]! >> 3) & 0x1f];
  }
  return out.slice(0, 8);
}
