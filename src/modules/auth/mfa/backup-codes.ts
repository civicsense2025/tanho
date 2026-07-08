import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userBackupCodes } from "./schema";

// Alphabet excludes visually ambiguous characters (0/O, 1/I) so codes read
// back reliably by hand. 12 chars → ~70 bits of entropy, far beyond the
// ~39 bits a 6-digit TOTP carries, so a backup code is never brute-forceable
// through the same verify path.
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generates `count` random backup codes (default 10), formatted
 * `XXXX-XXXX-XXXX`. The dashes are display-only; `hashBackupCode` and
 * `consumeBackupCode` accept the code with or without them via `normalize`.
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(12);
    let code = "";
    for (let j = 0; j < 12; j++) code += CHARS[bytes[j]! % CHARS.length];
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`);
  }
  return codes;
}

/** Strips dashes/whitespace so `XXXX-XXXX-XXXX` and `XXXXXXXXXXXX` hash alike. */
export function normalizeBackupCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

/** SHA-256 of the normalized code — only the hash is persisted. */
export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

/**
 * Atomically verifies + consumes a backup code for `userId`.
 *
 * The UPDATE is gated on `usedAt IS NULL`, so even under a race (two requests
 * submitting the same code concurrently) only ONE wins — SQLite serializes the
 * write and the second UPDATE matches zero rows (CWE-362). Returns true only
 * when a previously-unused code belonging to this user was marked used.
 */
export async function consumeBackupCode(userId: string, code: string): Promise<boolean> {
  const codeHash = hashBackupCode(code);
  const consumed = await db
    .update(userBackupCodes)
    .set({ usedAt: Date.now() })
    .where(
      and(
        eq(userBackupCodes.userId, userId),
        eq(userBackupCodes.codeHash, codeHash),
        isNull(userBackupCodes.usedAt),
      ),
    )
    .returning({ id: userBackupCodes.id });
  return consumed.length > 0;
}
