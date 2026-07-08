import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/modules/auth/session";
import { isSiteSetUp } from "@/modules/onboarding/install-state";
import { getDomainPolicyUncached } from "@/modules/domain/queries";
// Import from the direct path (NOT the @/modules/seo barrel) so the proxy
// bundle doesn't pull in the module's React server components.
import { canonicalRedirect, canonicalPolicyActive } from "@/modules/seo/technical/canonical";
// Redirect engine — PROXY-SAFE imports only. The proxy resolves exact + prefix
// rules inline (pure JS, no native deps). Wildcard/regex rules need re2, which
// can't load in the proxy bundle, so they're evaluated by an internal call to
// the /api/redirect-resolve route handler on a miss (see engine.ts header).
import { getCompiledRedirects } from "@/modules/redirects/loader";
import { matchExactOrPrefix, hasPatternRules } from "@/modules/redirects/engine";
import { isSameOriginPath } from "@/modules/redirects/validation";

/**
 * Four concerns, one proxy file (Next 16 supports only one):
 *
 * 0. Canonical host/slash (SEO) — when the site opts into a www/apex or
 *    trailing-slash policy, 301 public URLs to their canonical form so a page is
 *    never indexed under two URLs. OFF by default (as-is) → the common path does
 *    a single cached settings read and falls through. Only public content is
 *    canonicalized; /admin, /api, and setup surfaces are skipped. The redirect
 *    target is computed by the loop-safe canonicalRedirect (returns null once a
 *    request is already canonical — see modules/seo/technical/canonical.ts).
 *
 * 0.5. User redirects (migration/SEO) — the admin-managed redirect rules, over a
 *    memoized compiled rule set (loader.ts, uncached like the canonical policy).
 *    The proxy resolves the exact (O(1) Map) and prefix (longest-wins) tiers
 *    INLINE in pure JS — ~95% of real redirects, zero extra hop, no ReDoS surface.
 *    Wildcard/regex rules need re2, which can't be bundled into the proxy, so on
 *    an exact/prefix MISS (and only when pattern rules exist) the proxy calls
 *    /api/redirect-resolve, which evaluates the pattern tier with re2 (linear-time)
 *    and returns the redirect. Runs AFTER canonicalization so a rule lands on the
 *    already-canonical URL, and only on public content. Supersedes the old redirect
 *    check that lived in the [[...slug]] page — moving it here makes redirects true
 *    edge-level and removes the route-collision blind spot (a rule whose source
 *    matched a real route like /account never fired).
 *
 * 1. Site lock (first-run install) — while the site is "not set up" (no owner
 *    created yet / install not marked complete), every PUBLIC route is redirected
 *    to /setup, so a fresh deployment never shows a broken empty site to visitors.
 *    Only the setup surfaces stay reachable: /admin/install, /admin/login, /setup,
 *    and /api/* (OAuth callbacks, etc.). Once install completes, `isSiteSetUp()`
 *    latches true in memory and this becomes a cheap pass-through — no DB read on
 *    the steady-state hot path (see install-state.ts).
 *
 * 2. Admin cookie gate — a cheap cookie-presence check for /admin (NOT the
 *    security boundary; real session verification happens in the admin layout and
 *    inside every server action — see modules/auth/guards.ts).
 *
 * Proxy runs on the Node.js runtime in Next 16, so importing the DB-backed
 * install-state check here is safe (it couldn't be done on the old Edge runtime).
 */

/** Exact path or its subtree stays reachable while the site is locked. */
const SETUP_ALLOWLIST = ["/admin/install", "/admin/login", "/setup"];

function isSetupAllowed(pathname: string): boolean {
  if (pathname.startsWith("/api/") || pathname === "/api") return true;
  return SETUP_ALLOWLIST.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Only public content is canonicalized — never admin/api/Next internals. */
function isCanonicalizable(pathname: string): boolean {
  return !(
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next")
  );
}

/**
 * Resolve the wildcard/regex redirect tier by calling the internal
 * /api/redirect-resolve route (which runs re2 — see engine-patterns.ts). Returns
 * a NextResponse mirroring the resolver's verdict (redirect / 410 / 451), or null
 * when no pattern matched (the request continues normally).
 *
 * Why fetch and not NextResponse.rewrite: the resolver route is shadowed by the
 * root optional catch-all on an internal rewrite, so a rewrite lands on the
 * catch-all 404 instead of the handler. A real (fetch) request resolves route
 * precedence correctly. `redirect: "manual"` keeps the resolver's 3xx as an
 * opaque response we can read the Location off of, rather than following it.
 */
async function resolvePatternRedirect(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse | null> {
  const to = encodeURIComponent(pathname + request.nextUrl.search);
  const resolverUrl = new URL(`/api/redirect-resolve?to=${to}`, request.nextUrl.origin);
  try {
    // Bound the internal round-trip: a hung resolver must not stall the proxy on
    // every pattern-miss request. On timeout the AbortError is caught below and
    // we fail open (serve the request) rather than hang.
    const res = await fetch(resolverUrl, {
      redirect: "manual",
      headers: { accept: "*/*" },
      signal: AbortSignal.timeout(2000),
    });
    // 410/451 — content gone. Mirror the status with no body.
    if (res.status === 410 || res.status === 451) {
      return new NextResponse(null, { status: res.status });
    }
    // 3xx — mirror the redirect. The resolver already validated same-origin and
    // resolved captures; Location is a site-relative path.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location) {
        const dest = new URL(location, request.nextUrl.origin);
        if (dest.origin === request.nextUrl.origin) {
          return NextResponse.redirect(dest, res.status);
        }
      }
    }
    // 404 or anything else → no pattern matched; continue normally.
    return null;
  } catch {
    // Resolver unreachable → fail open (serve the request) rather than error.
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- 0. Canonical host / trailing slash -----------------------------------
  if (isCanonicalizable(pathname)) {
    const domain = await getDomainPolicyUncached();
    if (canonicalPolicyActive(domain)) {
      const host = request.nextUrl.host;
      const target = canonicalRedirect({ host, pathname }, domain);
      if (target) {
        const url = request.nextUrl.clone();
        url.host = target.host;
        url.pathname = target.pathname;
        // 308 (permanent, method-preserving) is the right signal for a
        // canonicalization redirect; query string is preserved by clone().
        return NextResponse.redirect(url, 308);
      }
    }
  }

  // --- 0.5. User redirect rules ---------------------------------------------
  if (isCanonicalizable(pathname)) {
    const rules = await getCompiledRedirects();
    // Exact + prefix, inline (pure JS — safe in the proxy bundle).
    const match = matchExactOrPrefix(rules, pathname);
    if (match) {
      if (match.kind === "gone") {
        // 410 Gone / 451 — content intentionally removed; no destination.
        return new NextResponse(null, { status: match.code === 451 ? 451 : 410 });
      }
      // Destination must be same-origin (defence in depth against a bad row);
      // an off-origin or missing target is ignored rather than followed.
      if (match.destination && isSameOriginPath(match.destination)) {
        const url = request.nextUrl.clone();
        // The destination may carry its own query (e.g. "/new?ref=1"); split it
        // so the "?" isn't percent-encoded into the pathname. A destination query
        // wins; otherwise preserveQuery keeps the incoming one, else it's dropped.
        const q = match.destination.indexOf("?");
        if (q === -1) {
          url.pathname = match.destination;
          if (!match.preserveQuery) url.search = "";
        } else {
          url.pathname = match.destination.slice(0, q);
          url.search = match.destination.slice(q);
        }
        if (match.kind === "rewrite") return NextResponse.rewrite(url);
        return NextResponse.redirect(url, match.code || 308);
      }
    } else if (hasPatternRules(rules)) {
      // No exact/prefix hit, but wildcard/regex rules exist. re2 can't load in
      // the proxy bundle, so the pattern tier is resolved by an internal call to
      // /api/redirect-resolve (which runs re2 via serverExternalPackages). We use
      // fetch (not NextResponse.rewrite): a rewrite to a route handler that sits
      // under the root optional catch-all `(public)/[[...slug]]` is shadowed by
      // that catch-all, whereas a real request resolves route precedence
      // correctly. This costs one localhost round-trip, but ONLY on an
      // exact/prefix miss when pattern rules exist — the rare case.
      const patternMatch = await resolvePatternRedirect(request, pathname);
      if (patternMatch) return patternMatch;
    }
  }

  // --- 1. Site lock ---------------------------------------------------------
  if (!(await isSiteSetUp())) {
    if (!isSetupAllowed(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/setup";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // While locked, a not-yet-created admin can't reach panel routes, but the
    // install/login surfaces above are allowed through — fall through to the
    // admin cookie gate below for any /admin/* that slipped past (defense in
    // depth; the gate itself redirects unauth'd panel hits to /admin/login).
  }

  // --- 2. Admin cookie gate -------------------------------------------------
  // Public admin surfaces (no cookie required): login, install, and the
  // password-reset request/confirm flow (an unauth'd admin who forgot their
  // password must be able to reach it). Everything else under /admin needs a
  // valid session cookie.
  const isPublicAdmin =
    pathname === "/admin/login" ||
    pathname === "/admin/install" ||
    pathname === "/admin/reset-password" ||
    pathname.startsWith("/admin/reset-password/");
  if (pathname.startsWith("/admin") && !isPublicAdmin) {
    if (!request.cookies.get(ADMIN_COOKIE)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything EXCEPT static assets and Next internals, so the site lock
  // can gate public routes too (the old matcher was /admin-only). API routes are
  // matched so nothing bypasses future needs, but the allowlist lets /api/*
  // through while locked. `_next/data` is intentionally NOT excluded (Next runs
  // proxy on it regardless — see the proxy docs' negative-matching note).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
