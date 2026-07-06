import { z } from "zod";

/**
 * Same-origin guard: a redirect target must be a site-relative path — it starts
 * with a single "/" and is NOT protocol-relative ("//host") and contains no
 * scheme ("http:"). This blocks open redirects to external hosts. Used by both
 * the zod schema (write time) and the catch-all router (redirect time) as
 * defence in depth.
 */
export function isSameOriginPath(path: string): boolean {
  if (typeof path !== "string") return false;
  if (!path.startsWith("/")) return false; // must be root-relative
  if (path.startsWith("//")) return false; // protocol-relative → external
  if (path.startsWith("/\\") || path.startsWith("/%2f") || path.startsWith("/%2F")) {
    return false; // backslash / encoded-slash tricks
  }
  if (/^\/[^/]*:/.test(path)) return false; // "/foo:bar" style scheme smuggling
  return true;
}

/**
 * Normalize a path for comparison: strip the query/hash, collapse duplicate
 * slashes, drop the trailing slash (except root), and lowercase. Two paths that
 * normalize to the same string address the same page — the canonical-host
 * policy already handles slash/case at request time, so a redirect between them
 * would be a no-op at best and a self-loop at worst.
 */
export function normalizePath(path: string): string {
  const noQuery = path.split(/[?#]/)[0] ?? path;
  const collapsed = noQuery.replace(/\/{2,}/g, "/");
  const trimmed = collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
  return trimmed.toLowerCase();
}

/**
 * True when a redirect from → to is an IDENTITY mapping (the new URL already
 * equals the old, after normalization). Such a rule is never worth storing:
 * it does nothing, or creates a self-redirect loop. The single source of truth
 * for "skip this redirect", used by the redirect save path, the importers, and
 * slug-change (replacing their ad-hoc `from === to` checks).
 */
export function isIdentityRedirect(from: string, to: string): boolean {
  return normalizePath(from) === normalizePath(to);
}

const relativePath = z
  .string()
  .min(1)
  .max(2000)
  .refine(isSameOriginPath, {
    message: "Must be a site-relative path starting with / (no external URLs)",
  });

/** Create/update payload for a redirect. Both paths are same-origin relative. */
export const redirectInputSchema = z
  .object({
    fromPath: relativePath,
    toPath: relativePath,
    code: z.union([z.literal(301), z.literal(302)]).default(301),
  })
  .refine((r) => !isIdentityRedirect(r.fromPath, r.toPath), {
    message: "Source and target resolve to the same URL — no redirect needed",
    path: ["toPath"],
  });

export type RedirectInput = z.infer<typeof redirectInputSchema>;
