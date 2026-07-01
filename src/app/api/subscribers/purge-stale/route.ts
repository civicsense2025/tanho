import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { purgeStaleSubscribers } from "@/lib/db";
import { audit, auditContext } from "@/lib/audit";

const PurgeSchema = z.object({
  olderThanDays: z.number().int().min(1).max(3650).default(365),
});

/**
 * Admin-invoked retention purge: hard-deletes subscribers who never confirmed
 * ("pending") or unsubscribed, untouched for `olderThanDays`. Active/confirmed
 * subscribers are never touched. Not scheduled automatically — the retention
 * *policy* (whether/when this runs) is an operator decision; wire it to a
 * cron only if that's the operator's own policy choice.
 */
export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let json: unknown = {};
  try {
    const text = await req.text();
    if (text) json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PurgeSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const deletedCount = await purgeStaleSubscribers(parsed.data.olderThanDays);
  await audit({
    ...auditContext(req),
    actor: "admin",
    action: "subscribers.purge_stale",
    target: null,
    outcome: "success",
    metadata: { olderThanDays: parsed.data.olderThanDays, deletedCount },
  });
  return NextResponse.json({ deletedCount });
}
