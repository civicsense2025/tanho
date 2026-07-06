import { NextResponse, type NextRequest } from "next/server";
import { getCompiledRedirects } from "@/modules/redirects/loader";
import { matchPattern } from "@/modules/redirects/engine-patterns";
import { isSameOriginPath } from "@/modules/redirects/validation";

/**
 * Internal wildcard/regex redirect resolver (path /api/redirect-resolve). The
 * proxy (src/proxy.ts) handles exact + prefix rules inline (pure JS), but
 * wildcard/regex need re2, which can't load in the proxy bundle — so on an
 * exact/prefix MISS with pattern rules present, the proxy rewrites the request
 * here. This handler evaluates the pattern tier with re2 (linear-time, ReDoS-safe)
 * and issues the redirect.
 *
 * NOTE: the folder must NOT start with "_" — a leading underscore makes it a Next
 * "private folder" (excluded from routing), so the request would fall through to
 * the public catch-all instead of reaching this handler.
 *
 * Not a public API — reached only via an internal rewrite; a direct hit with no
 * matching pattern just 404s. The proxy passes the ORIGINAL path+query as `?to=`
 * (URL-encoded), since the real request URL here is /api/redirect-resolve.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!to.startsWith("/")) return new NextResponse(null, { status: 404 });

  // `to` is the original "/path?query" — split so patterns match on the path
  // (never the query) and the original query can be re-attached if preserved.
  const qIndex = to.indexOf("?");
  const originalPath = qIndex === -1 ? to : to.slice(0, qIndex);
  const originalQuery = qIndex === -1 ? "" : to.slice(qIndex); // includes leading "?"

  const rules = await getCompiledRedirects();
  const match = matchPattern(rules.patterns, originalPath);
  if (!match) return new NextResponse(null, { status: 404 });

  if (match.kind === "gone") {
    return new NextResponse(null, { status: match.code === 451 ? 451 : 410 });
  }

  // Destination must be same-origin (defence in depth against a bad row); an
  // off-origin or missing target is ignored (404) rather than followed.
  if (match.destination && isSameOriginPath(match.destination)) {
    const url = req.nextUrl.clone();
    // The destination string may itself carry a query (e.g. "/x?ref=1"); take it
    // as-is, then re-attach the original query only when the rule preserves it
    // and the destination didn't already specify one.
    const dIndex = match.destination.indexOf("?");
    url.pathname = dIndex === -1 ? match.destination : match.destination.slice(0, dIndex);
    url.search = dIndex === -1 ? (match.preserveQuery ? originalQuery : "") : match.destination.slice(dIndex);
    if (match.kind === "rewrite") return NextResponse.rewrite(url);
    return NextResponse.redirect(url, match.code || 308);
  }
  return new NextResponse(null, { status: 404 });
}
