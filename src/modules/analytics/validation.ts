import { z } from "zod";

/**
 * Analytics settings namespace. `gaConnected`/`gscConnected` mirror the
 * design's connect gates. They now reflect a REAL Google OAuth connection
 * (see modules/integrations + adapters/google) rather than a flipped stub.
 * `ga4PropertyId`/`gscSiteUrl` are non-secret config the owner sets after
 * connecting so the ga4 adapter knows which property/site to query.
 */
export const analyticsSettingsSchema = z.object({
  gaConnected: z.boolean().default(false),
  gscConnected: z.boolean().default(false),
  /** GA4 property id, e.g. "properties/123456789". */
  ga4PropertyId: z.string().max(120).default(""),
  /** GSC verified site URL, e.g. "https://example.com/" or "sc-domain:example.com". */
  gscSiteUrl: z.string().max(300).default(""),
});

export type AnalyticsSettings = z.infer<typeof analyticsSettingsSchema>;

export const ANALYTICS_DEFAULTS: AnalyticsSettings = analyticsSettingsSchema.parse({});

/**
 * Event-name allowlist pattern. Lowercase, digits, and underscores only, with
 * a hard length cap. This is the ONLY gate between the public beacon and a row
 * in analytics_events — keep it strict.
 */
export const EVENT_NAME_RE = /^[a-z0-9_]{1,40}$/;

const MAX_PROP_KEYS = 12;
const MAX_KEY_LEN = 40;
const MAX_VALUE_LEN = 120;

/**
 * Incoming track payload from /api/track. `props` is coerced/stripped by
 * sanitizeProps AFTER parsing — never trust its shape from the client.
 */
export const trackInputSchema = z.object({
  name: z.string().regex(EVENT_NAME_RE, "Invalid event name"),
  path: z.string().max(512).default(""),
  props: z.record(z.string(), z.unknown()).optional(),
});

export type TrackInput = z.infer<typeof trackInputSchema>;

/**
 * Reduce an arbitrary props object to a small, safe bag: cap key count, drop
 * long or non-scalar values, and truncate strings. This is the PII guard —
 * emails, tokens, and long free text simply don't survive it. Pure.
 */
export function sanitizeProps(
  raw: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!raw) return out;
  let count = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (count >= MAX_PROP_KEYS) break;
    if (key.length === 0 || key.length > MAX_KEY_LEN) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
      count++;
    } else if (typeof value === "boolean") {
      out[key] = value;
      count++;
    } else if (typeof value === "string" && value.length > 0) {
      out[key] = value.slice(0, MAX_VALUE_LEN);
      count++;
    }
  }
  return out;
}
