import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth";
import { siteConfig } from "@/config/site.config";
import { isBlockedAiCrawler } from "@/lib/ai-crawlers";

/**
 * Single source of truth for the protected API surface. Both the runtime auth gate
 * (isProtectedApiRequest) and the middleware matcher (config.matcher) derive from this one
 * array, so the two can never drift out of sync — the classic silent-auth-hole this file used
 * to risk. Each prefix guards non-GET requests to that path and everything under it.
 *
 * Public routes (subscribe, unsubscribe, feed.xml, and later checkout/webhooks) are deliberately
 * ABSENT here — that absence is what keeps them reachable without a session.
 */
const PROTECTED_API_PREFIXES = [
  "/api/projects",
  "/api/experience",
  "/api/skills",
  "/api/awards",
  "/api/education",
  "/api/upload",
  "/api/guides",
  "/api/resources",
  "/api/seo",
  "/api/posts",
  "/api/subscribers",
  "/api/import",
  "/api/settings",
  "/api/content-types",
  "/api/content-entries",
];

function isProtectedApiRequest(pathname: string, method: string): boolean {
  if (method === "GET") return false;
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // AI-crawler short-circuit: runs before any auth logic and is fully independent of it. Only
  // takes effect when the site owner has opted in via siteConfig.features.blockAiCrawlers (off
  // by default) -- see src/lib/ai-crawlers.ts for the shared allowlist robots.ts also reads.
  if (siteConfig.features.blockAiCrawlers && isBlockedAiCrawler(req.headers.get("user-agent") || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const authed = token ? await verifyAdminToken(token) : false;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!authed) return NextResponse.redirect(new URL("/admin/login", req.url));
    return NextResponse.next();
  }

  if (isProtectedApiRequest(pathname, req.method)) {
    if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Next.js requires config.matcher to be STATIC (literal strings — it's read by build-time static
// analysis, so it can't be computed from PROTECTED_API_PREFIXES). To prevent the two lists from
// drifting silently — the classic auth-hole — the proxy-allowlist test asserts this matcher stays
// in exact parity with PROTECTED_API_PREFIXES. Adding a protected route = edit both, and the test
// fails loudly if you forget one. `/api/upload` is an exact path; the rest match sub-routes too.
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/projects/:path*",
    "/api/experience/:path*",
    "/api/skills/:path*",
    "/api/awards/:path*",
    "/api/education/:path*",
    "/api/upload",
    "/api/guides/:path*",
    "/api/resources/:path*",
    "/api/seo/:path*",
    "/api/posts/:path*",
    "/api/subscribers/:path*",
    "/api/import/:path*",
    "/api/settings/:path*",
    "/api/content-types/:path*",
    "/api/content-entries/:path*",
    // Additive only, for the AI-crawler UA check above -- the admin/API entries above are the
    // pre-existing auth surface and must stay untouched. Without these, the UA short-circuit
    // would never run on the public content routes it's actually meant to protect. Next.js
    // matcher entries are individual path patterns, so the public routes below (home + the three
    // public content-detail sections that exist under src/app/) are listed one per entry rather
    // than combined into one string.
    "/",
    "/posts/:path*",
    "/projects/:path*",
    "/guides/:path*",
  ],
};

/** Exported for the drift-guard test — the canonical protected-prefix source the static matcher
 * above must mirror. (Not used at runtime beyond isProtectedApiRequest.) */
export const PROTECTED_API_PREFIXES_FOR_TEST = PROTECTED_API_PREFIXES;
