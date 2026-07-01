import { NextResponse, type NextRequest } from "next/server";
import { getSubscriberByToken, updateSubscriber } from "@/lib/db";
import { tokenSchema } from "@/lib/validation/schemas";
import { siteConfig } from "@/config/site.config";

/** Public one-click unsubscribe. Token is Zod-narrowed to a UUID. Idempotent: unsubscribing an
 * already-unsubscribed address is a no-op success. */
export async function GET(req: NextRequest) {
  if (!siteConfig.features.newsletter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const parsed = tokenSchema.safeParse({ token });
  if (!parsed.success) return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });

  const sub = await getSubscriberByToken(parsed.data.token);
  if (!sub || sub.unsubscribeToken !== parsed.data.token) {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
  }

  if (sub.status !== "unsubscribed") {
    await updateSubscriber(sub.id, { status: "unsubscribed" });
  }
  return new NextResponse("You have been unsubscribed.", { status: 200, headers: { "Content-Type": "text/plain" } });
}
