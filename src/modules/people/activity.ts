import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { people, personActivity } from "./schema";

type ActivityType = "view" | "form" | "order" | "subscribe" | "login" | "note";

/**
 * Appends one row to a person's activity timeline and bumps lastActiveAt.
 * Fire-and-forget: a failed activity write never fails the surrounding action.
 */
export async function logActivity(
  personId: string,
  type: ActivityType,
  label: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(personActivity).values({ personId, type, label, meta });
    await db
      .update(people)
      .set({ lastActiveAt: Date.now() })
      .where(eq(people.id, personId));
  } catch (err) {
    console.error("[people] activity write failed", err);
  }
}
