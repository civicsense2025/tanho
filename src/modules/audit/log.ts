import { db } from "@/lib/db/client";
import { auditLog } from "./schema";

type AuditEntry = {
  userId?: string | null;
  action: string;
  ownerType?: string;
  ownerId?: string;
  meta?: Record<string, unknown>;
};

/** Fire-and-forget audit write — never blocks or fails the mutation. */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values(entry);
  } catch (err) {
    console.error("[audit] write failed", err);
  }
}
