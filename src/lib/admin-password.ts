import { createHash } from "crypto";
import { safeSecretEqual } from "@/lib/crypto";
import { getAdminPassword } from "@/lib/auth";

/**
 * Admin password verification. Node-only (uses node:crypto) — import ONLY from a
 * runtime="nodejs" route, never from the Edge middleware (src/proxy.ts), which
 * must stay Edge-safe.
 *
 * Two modes, in preference order:
 *  1. ADMIN_PASSWORD_HASH set → compare SHA-256(candidate) to the stored hex hash
 *     in constant time. The plaintext password never lives in the environment.
 *  2. Otherwise → constant-time compare against ADMIN_PASSWORD (dev fallback).
 *     Production already refuses to start without ADMIN_PASSWORD/ADMIN_SECRET
 *     (see src/lib/auth.ts), so this fallback only runs in dev unless the operator
 *     deliberately ships a plaintext password.
 *
 * On the choice of SHA-256: the admin secret is a single, high-entropy value
 * compared in constant time, so a fast unsalted digest is acceptable here. A
 * salted KDF (scrypt/bcrypt/argon2) would additionally slow an offline attack on
 * a stolen hash; adopt one if the threat model grows to include hash exfiltration.
 */
function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf-8").digest("hex");
}

export function verifyAdminPassword(candidate: string): boolean {
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (hash) {
    return safeSecretEqual(sha256Hex(candidate), hash.toLowerCase());
  }
  return safeSecretEqual(candidate, getAdminPassword());
}
