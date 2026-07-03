import "server-only";
import { db } from "@/lib/db/client";
import { analyticsEvents } from "./schema";
import { EVENT_NAME_RE, sanitizeProps } from "./validation";

export type RecordEventInput = {
  name: string;
  path?: string;
  sessionId?: string;
  personId?: string | null;
  props?: Record<string, unknown>;
};

/**
 * Insert one analytics event via a parameterized Drizzle write. Re-validates
 * the name and re-sanitizes props here (defence in depth — callers may not be
 * the API route). Never throws into the caller: analytics must not break a
 * request, so failures are swallowed and logged.
 */
export async function recordEvent(input: RecordEventInput): Promise<void> {
  if (!EVENT_NAME_RE.test(input.name)) return;
  try {
    await db.insert(analyticsEvents).values({
      name: input.name,
      path: (input.path ?? "").slice(0, 512),
      sessionId: (input.sessionId ?? "").slice(0, 64),
      personId: input.personId ?? null,
      props: sanitizeProps(input.props),
    });
  } catch (err) {
    console.error("[analytics] recordEvent failed", err);
  }
}
