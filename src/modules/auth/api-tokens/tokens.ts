import { createHash, randomBytes } from "node:crypto";

/** 256-bit opaque bearer token for API clients (Swift app, scripts, etc.). */
export function generateApiToken(): string {
  return `oys_${randomBytes(32).toString("base64url")}`;
}

/** Only the SHA-256 of the token is stored — the DB never sees the raw token. */
export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** First 8 chars of the raw token, shown in the admin UI for identification. */
export function tokenPrefix(token: string): string {
  return token.slice(0, 8);
}
