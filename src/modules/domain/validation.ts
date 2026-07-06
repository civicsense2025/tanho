import { z } from "zod";

/**
 * The `domain` settings namespace — a self-hoster's custom domain and the
 * result of the last DNS check. There's no owned nameservers/hosting behind
 * this platform, so verification is a read-only DNS lookup, never a write —
 * see modules/domain/verify.ts.
 */
export const domainSettingsSchema = z.object({
  customDomain: z
    .string()
    .max(255)
    .regex(/^$|^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i, "Enter a valid domain, e.g. example.com")
    .default(""),
  status: z.enum(["unconfigured", "pending", "verified", "error"]).default("unconfigured"),
  errorMessage: z.string().max(500).default(""),
  lastCheckedAt: z.number().nullable().default(null),
  verifiedAt: z.number().nullable().default(null),
  /**
   * Canonical-host policy. `as-is` (default) leaves the host untouched — no
   * redirect. `force-www`/`force-apex` 301 to the canonical host so a page is
   * never indexed under both www.example.com and example.com.
   */
  wwwPolicy: z.enum(["as-is", "force-www", "force-apex"]).default("as-is"),
  /**
   * Trailing-slash policy. `as-is` (default) leaves paths untouched. `strip`
   * 301s `/foo/` → `/foo`; `add` 301s `/foo` → `/foo/`. The site root and paths
   * with a file extension are never rewritten.
   */
  trailingSlash: z.enum(["as-is", "strip", "add"]).default("as-is"),
});

export type DomainSettings = z.infer<typeof domainSettingsSchema>;

export const DOMAIN_DEFAULTS: DomainSettings = domainSettingsSchema.parse({});
