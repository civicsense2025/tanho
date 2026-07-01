import { describe, it, expect } from "vitest";
import { config, PROTECTED_API_PREFIXES_FOR_TEST } from "@/proxy";

/**
 * proxy.ts maintains protection in two hand-kept places: PROTECTED_API_PREFIXES (used by the
 * auth decision) and config.matcher (which decides whether the middleware even runs on a
 * path). If a prefix is protected but missing from the matcher, the middleware never fires and
 * the route is silently public — a latent auth hole. This guard asserts every protected API
 * prefix has a corresponding matcher entry, so the drift is caught in CI, not in production.
 *
 * PROTECTED_API_PREFIXES is not exported (it's an internal of proxy.ts), so we assert the
 * invariant from the matcher side plus known-protected prefixes. When Phase 6 collapses these
 * into a single source, this test becomes the proof the collapse preserved coverage.
 */

const KNOWN_PROTECTED_API_PREFIXES = [
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
];

function matcherCovers(prefix: string): boolean {
  // A matcher entry covers a prefix if it is exactly the prefix or the prefix + "/:path*".
  return config.matcher.some((m) => m === prefix || m === `${prefix}/:path*` || m === `${prefix}:path*`);
}

describe("proxy allowlist ↔ matcher drift guard", () => {
  it("the static matcher is in EXACT parity with the protected-prefix source", () => {
    // Next.js forbids a computed matcher, so the two lists are maintained separately. This asserts
    // they mirror each other exactly, converting silent drift (an auth hole) into a CI failure.
    const apiMatchers = config.matcher
      .filter((m) => m.startsWith("/api/"))
      .map((m) => m.replace(/\/:path\*$/, ""))
      .sort();
    const expected = [...PROTECTED_API_PREFIXES_FOR_TEST].sort();
    expect(apiMatchers).toEqual(expected);
  });

  it("every known protected API prefix has a matcher entry", () => {
    for (const prefix of KNOWN_PROTECTED_API_PREFIXES) {
      expect(matcherCovers(prefix), `matcher is missing coverage for ${prefix}`).toBe(true);
    }
  });

  it("guards the /admin surface", () => {
    expect(config.matcher.some((m) => m.startsWith("/admin"))).toBe(true);
  });

  it("does not protect public payment/webhook routes", () => {
    // The Stripe webhook needs its raw body untouched by middleware; checkout is public. Neither
    // may be a protected prefix. (Phase 7 adds the routes; this keeps the baseline clean.)
    for (const publicRoute of ["/api/webhooks/stripe", "/api/checkout"]) {
      expect(KNOWN_PROTECTED_API_PREFIXES.some((p) => publicRoute.startsWith(p))).toBe(false);
    }
  });

  it("keeps the public subscribe/unsubscribe routes unprotected despite the subscribers prefix", () => {
    // The runtime guard is `pathname.startsWith(prefix)`. The public POST /api/subscribe and GET
    // /api/unsubscribe must NOT start with any protected prefix — critically not "/api/subscribers"
    // (the admin list), which is why the names are kept distinct (subscribe ≠ subscribers).
    for (const publicRoute of ["/api/subscribe", "/api/subscribe/confirm", "/api/unsubscribe", "/feed.xml"]) {
      expect(
        KNOWN_PROTECTED_API_PREFIXES.some((p) => publicRoute.startsWith(p)),
        `${publicRoute} must stay public`
      ).toBe(false);
    }
  });

  it("the widened public-content matcher (added for AI-crawler blocking) doesn't collide with any protected API prefix", () => {
    // The matcher was additively widened with "/", "/posts/:path*", "/projects/:path*",
    // "/guides/:path*" so the AI-crawler UA check in proxy() actually runs on public content
    // routes. None of those new entries may overlap a PROTECTED_API_PREFIXES entry — if one did,
    // isProtectedApiRequest's `pathname.startsWith(prefix)` semantics would misfire on public
    // pages that happen to share a prefix with an admin-only API route.
    const publicContentMatchers = ["/", "/posts/:path*", "/projects/:path*", "/guides/:path*"];
    for (const m of publicContentMatchers) {
      expect(config.matcher, `expected widened matcher to include ${m}`).toContain(m);
    }
    for (const publicMatcher of publicContentMatchers) {
      const publicPrefix = publicMatcher.replace(/\/:path\*$/, "");
      for (const protectedPrefix of PROTECTED_API_PREFIXES_FOR_TEST) {
        expect(
          protectedPrefix.startsWith(publicPrefix) && publicPrefix !== "/",
          `${protectedPrefix} unexpectedly collides with widened public matcher ${publicMatcher}`
        ).toBe(false);
      }
    }
  });
});
