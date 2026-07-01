import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getSubscriberById, deleteSubscriber } from "@/lib/db";
import { audit, auditContext } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

/**
 * Admin-only hard delete of a subscriber record (data-subject erasure /
 * GDPR-CCPA-style requests, and the target of the retention purge below).
 * Subscriber PII carries no financial-retention requirement, so a genuine
 * delete is correct here — contrast with the Hub's license anonymization,
 * where the Stripe payment/activation trail must be preserved.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getSubscriberById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteSubscriber(id);
  await audit({ ...auditContext(req), actor: "admin", action: "subscriber.delete", target: id, outcome: "success", metadata: null });
  return NextResponse.json({ ok: true });
}
