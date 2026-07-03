import { createHash, randomBytes } from "node:crypto";

/** 256-bit opaque session token — the value that lives in the cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only the SHA-256 of the token is stored; the DB never sees the token. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
