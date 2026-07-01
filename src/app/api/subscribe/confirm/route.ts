import { NextResponse, type NextRequest } from "next/server";
import { getSubscriberByToken, updateSubscriber } from "@/lib/db";
import { tokenSchema } from "@/lib/validation/schemas";
import { siteConfig } from "@/config/site.config";

/** Public double-opt-in confirmation. Token is Zod-narrowed to a UUID before the DB lookup.
 * On success redirects to the posts page; invalid/expired tokens get a plain message. */
export async function GET(req: NextRequest) {
  if (!siteConfig.features.newsletter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const parsed = tokenSchema.safeParse({ token });
  if (!parsed.success) return NextResponse.json({ error: "Invalid confirmation link" }, { status: 400 });

  const sub = await getSubscriberByToken(parsed.data.token);
  // Only a pending subscriber holding this as its CONFIRM token may be confirmed.
  if (!sub || sub.confirmToken !== parsed.data.token) {
    return NextResponse.json({ error: "Invalid or expired confirmation link" }, { status: 400 });
  }

  await updateSubscriber(sub.id, { status: "active", confirmToken: null });
  return NextResponse.redirect(new URL("/posts?confirmed=1", siteConfig.url));
}
