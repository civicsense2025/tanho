/**
 * Pure canonical-URL policy: given the requested host + path and the site's
 * www/trailing-slash policy, return the URL to 301-redirect to, or `null` when
 * the request is already canonical (NO redirect — this is what prevents loops).
 *
 * Kept free of Next/request types so it is exhaustively unit-testable; the proxy
 * adapter (src/proxy.ts) passes the request's host/path/protocol in and issues
 * the redirect only on a non-null result.
 */

export type WwwPolicy = "as-is" | "force-www" | "force-apex";
export type TrailingSlashPolicy = "as-is" | "strip" | "add";

export type CanonicalPolicy = {
  wwwPolicy: WwwPolicy;
  trailingSlash: TrailingSlashPolicy;
};

/** Apply the www policy to a host, or return it unchanged. */
function canonicalHost(host: string, policy: WwwPolicy): string {
  const hasWww = host.startsWith("www.");
  if (policy === "force-www" && !hasWww) return `www.${host}`;
  if (policy === "force-apex" && hasWww) return host.slice(4);
  return host;
}

/** Whether a path looks like a file (has an extension in its last segment). */
function looksLikeFile(pathname: string): boolean {
  const last = pathname.split("/").pop() ?? "";
  return last.includes(".");
}

/** Apply the trailing-slash policy to a pathname, or return it unchanged. */
function canonicalPath(pathname: string, policy: TrailingSlashPolicy): string {
  // Never touch the root, and never rewrite something that looks like a file
  // (e.g. /sitemap.xml, /file.pdf) — those legitimately have no trailing slash.
  if (pathname === "/" || looksLikeFile(pathname)) return pathname;
  if (policy === "strip") return pathname.replace(/\/+$/, "") || "/";
  if (policy === "add") return pathname.endsWith("/") ? pathname : `${pathname}/`;
  return pathname;
}

/**
 * Compute the canonical redirect target for a request, or `null` if it's
 * already canonical. Query string is preserved by the caller.
 */
export function canonicalRedirect(
  input: { host: string; pathname: string },
  policy: CanonicalPolicy,
): { host: string; pathname: string } | null {
  const host = canonicalHost(input.host, policy.wwwPolicy);
  const pathname = canonicalPath(input.pathname, policy.trailingSlash);
  if (host === input.host && pathname === input.pathname) return null;
  return { host, pathname };
}

/** True when either policy is active (lets the proxy skip work when both off). */
export function canonicalPolicyActive(policy: CanonicalPolicy): boolean {
  return policy.wwwPolicy !== "as-is" || policy.trailingSlash !== "as-is";
}
