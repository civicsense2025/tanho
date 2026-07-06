import { z } from "zod";
import { hostnameResolvesToBlockedIp, isLoopbackOrLinkLocalIp } from "@/lib/ssrf-guard";
import { postgresConfigSchema, supabaseConfigSchema, dataSourceAllowlistEntrySchema } from "./validation";

/**
 * Blocks loopback and link-local (incl. 169.254.169.254 cloud metadata)
 * hosts — no legitimate external DB lives there, and it's the concrete
 * credential-exfiltration risk if this app runs in a cloud VPC. RFC1918
 * ranges are deliberately allowed: self-hosted Postgres on a LAN/VPC is a
 * real use case for this feature. See src/lib/ssrf-guard.ts. Async — only
 * usable via `.safeParseAsync()` on a schema built with `.superRefine()`.
 *
 * Lives in this server-only file (not validation.ts) because it imports
 * ssrf-guard.ts, which uses `node:dns/promises` — a Node built-in with no
 * browser equivalent. validation.ts is imported from client components
 * (CreateConnectionForm, AllowlistEditor) for its sync schemas/types, and
 * bundling ssrf-guard.ts into that client chunk fails outright (Turbopack
 * has no shim for `node:dns/promises`), 500-ing every /admin/* route.
 */
async function assertHostNotBlocked(host: string, ctx: z.RefinementCtx) {
  // Outside production, allow loopback/link-local so a developer can point
  // this at a docker-compose/local Supabase Postgres on 127.0.0.1 — the
  // credential-exfiltration risk this guard exists for only applies to a
  // deployed app reaching its own cloud VPC's loopback/metadata surface.
  // Gated on NODE_ENV, not an opt-in env var a deployment could leave set:
  // a production build is always strict, full stop.
  if (process.env.NODE_ENV !== "production") return;
  const blocked = await hostnameResolvesToBlockedIp(host, isLoopbackOrLinkLocalIp);
  if (blocked) {
    ctx.addIssue({
      code: "custom",
      path: ["host"],
      message: "This host is not allowed for an external database connection",
    });
  }
}

/**
 * Discriminated union — the shape stored (encrypted) in `configEncrypted`.
 * Adds the async host-blocklist check on top of postgresConfigSchema's sync
 * shape validation (supabaseConfigSchema has no raw `host` to check — its
 * host is derived from `projectRef`, always *.supabase.co /
 * *.pooler.supabase.com). Every server action parses input through THIS
 * schema (via safeParseAsync), not postgresConfigSchema directly, so the
 * host check is never skipped for a saved connection.
 */
export const dataSourceConfigSchema = z
  .discriminatedUnion("provider", [postgresConfigSchema, supabaseConfigSchema])
  .superRefine(async (v, ctx) => {
    if (v.provider === "postgres") await assertHostNotBlocked(v.host, ctx);
  });

export const createConnectionSchema = z.object({
  name: z.string().min(1).max(120),
  config: dataSourceConfigSchema,
});
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;

export const updateConnectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  config: dataSourceConfigSchema.optional(),
  allowlist: z.array(dataSourceAllowlistEntrySchema).max(50).optional(),
});
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;
