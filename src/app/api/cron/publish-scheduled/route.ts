import { NextRequest, NextResponse } from "next/server";
import { publishDueScheduledContent } from "@/lib/scheduling";

/**
 * Machine-to-machine only (Vercel Cron), never an interactive admin session -- deliberately
 * independent of the cookie-based admin auth model (verifyAdminToken assumes a login cookie a
 * cron invoker will never have; faking one would be more complex than it's worth). Fails closed
 * in production if CRON_SECRET is unset, mirroring auth.ts's ADMIN_SECRET/ADMIN_PASSWORD guard,
 * so a misconfigured deploy fails loudly at boot instead of silently exposing (or permanently
 * rejecting) the route.
 *
 * Deliberately a GET handler, and deliberately absent from BOTH of proxy.ts's twin allowlists
 * (PROTECTED_API_PREFIXES and config.matcher) -- GET is what exempts it from
 * isProtectedApiRequest()'s non-GET-only gate, and proxy() doesn't need to run on this path at
 * all, since the bearer check below is the sole protection. See
 * test/integration/proxy-allowlist.test.ts for the assertion that this stays true.
 */
if (process.env.NODE_ENV === "production" && !process.env.CRON_SECRET) {
  throw new Error("CRON_SECRET must be set in production — refusing to start with an unprotected cron endpoint.");
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const published = await publishDueScheduledContent();
  return NextResponse.json({ published: published.length, ids: published.map((p) => p.id) });
}
