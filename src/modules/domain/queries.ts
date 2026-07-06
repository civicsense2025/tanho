import { cacheLife, cacheTag } from "next/cache";
import { readSettingRow } from "@/modules/settings/queries";
import { DOMAIN_DEFAULTS, domainSettingsSchema, type DomainSettings } from "./validation";

/**
 * Cached domain settings. Revalidated via revalidateTag("settings:domain", "max")
 * whenever the namespace is written — see modules/domain/check.ts (revalidateTag,
 * not updateTag, since the write path is also reachable from a Route Handler,
 * where updateTag can't be called). Falls back to neutral defaults so the
 * site renders even before the domain is configured.
 */
export async function getDomainSettings(): Promise<DomainSettings> {
  "use cache";
  cacheLife("max");
  cacheTag("settings:domain");
  const data = await readSettingRow("domain");
  const parsed = domainSettingsSchema.safeParse(data);
  return parsed.success ? parsed.data : DOMAIN_DEFAULTS;
}

/**
 * The canonical site URL, in priority order: a verified custom domain, then
 * the SEO namespace's manually-entered siteUrl, then the APP_URL env
 * fallback. Once a domain passes DNS verification it should actually take
 * effect for sitemap/robots/llms.txt generation, not just show a status
 * badge on the settings screen.
 */
export async function getCanonicalSiteUrl(seoSiteUrl: string, appUrlFallback: string): Promise<string> {
  const domain = await getDomainSettings();
  if (domain.status === "verified" && domain.customDomain) {
    return `https://${domain.customDomain}`;
  }
  return seoSiteUrl || appUrlFallback;
}

/** Just the canonical-host/slash policy fields. */
export type DomainPolicy = Pick<DomainSettings, "wwwPolicy" | "trailingSlash">;

// Short in-memory memo so the proxy doesn't hit the DB on every request. The
// policy changes rarely; a 60s window bounds staleness without a cached()
// function (which the proxy runtime can't call — see readSettingRow).
let policyMemo: { at: number; value: DomainPolicy } | null = null;
const POLICY_TTL_MS = 60_000;

/**
 * UNCACHED (no `"use cache"`) read of just the canonical-host/slash policy,
 * memoized in module memory for POLICY_TTL_MS. Safe to call from src/proxy.ts,
 * where `"use cache"` functions like getDomainSettings() throw. Falls back to
 * the neutral `as-is` defaults on any parse/read failure so the proxy never
 * breaks the site over a settings glitch.
 *
 * `now` is injectable for tests (the proxy passes Date.now()).
 */
export async function getDomainPolicyUncached(now: number = Date.now()): Promise<DomainPolicy> {
  if (policyMemo && now - policyMemo.at < POLICY_TTL_MS) return policyMemo.value;
  let value: DomainPolicy = { wwwPolicy: DOMAIN_DEFAULTS.wwwPolicy, trailingSlash: DOMAIN_DEFAULTS.trailingSlash };
  try {
    const parsed = domainSettingsSchema.safeParse(await readSettingRow("domain"));
    if (parsed.success) value = { wwwPolicy: parsed.data.wwwPolicy, trailingSlash: parsed.data.trailingSlash };
  } catch {
    // keep the neutral defaults
  }
  policyMemo = { at: now, value };
  return value;
}

/** Test-only: clear the policy memo between cases. */
export function __resetDomainPolicyMemo(): void {
  policyMemo = null;
}
