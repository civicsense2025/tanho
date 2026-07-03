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

const relativePath = z
  .string()
  .min(1)
  .max(2000)
  .refine(isSameOriginPath, {
    message: "Must be a site-relative path starting with / (no external URLs)",
  });

/** Create/update payload for a redirect. Both paths are same-origin relative. */
export const redirectInputSchema = z.object({
  fromPath: relativePath,
  toPath: relativePath,
  code: z.union([z.literal(301), z.literal(302)]).default(301),
});

export type RedirectInput = z.infer<typeof redirectInputSchema>;
