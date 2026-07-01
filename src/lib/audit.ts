import { getAdapter } from "@/lib/db";
import type { AuditLog } from "@/lib/db/types";

/**
 * Best-effort audit logging for admin/security events. Writes an append-only
 * audit event; NEVER throws and NEVER blocks the caller's result on the write —
 * a failed insert is logged to the console but does not fail the operation.
 *
 * Node-only (it touches the DB adapters). Do NOT import from src/proxy.ts (the
 * Edge middleware).
 *
 * NEVER pass secrets: no admin password, no secret setting values, no tokens.
 * Only ids, actions, outcomes, request context (ip/user-agent), and a small
 * metadata object of non-sensitive fields (e.g. a setting KEY, never its value).
 */
export type AuditInput = Omit<AuditLog, "id" | "ts">;

export function auditContext(req: Request): { ip: string | null; userAgent: string | null } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  return { ip, userAgent: req.headers.get("user-agent") };
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    const db = await getAdapter();
    await db.appendAuditLog(input);
  } catch (err) {
    console.error(`audit: failed to write "${input.action}" (${input.outcome}):`, err);
  }
}
