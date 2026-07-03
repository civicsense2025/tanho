"use server";

import { z } from "zod";
import { requireUser } from "@/modules/auth/guards";
import { disconnectIntegration } from "@/modules/integrations";
import { saveSettings } from "@/modules/settings/actions";
import { getAnalyticsSettings } from "./settings";

export type ConnectState = { ok?: boolean; error?: string };

/**
 * Config + disconnect actions for the Google Analytics / Search Console
 * surfaces. The CONNECT step itself is a redirect to
 * /api/oauth/google/[provider] (see the connect gate), not a server action —
 * OAuth needs a full navigation to Google's consent screen.
 */

const propertyIdSchema = z.string().max(120);
const siteUrlSchema = z.string().max(300);

/** Owner-only: set the GA4 property id used by the ga4 adapter's reports. */
export async function saveGa4PropertyId(propertyId: string): Promise<ConnectState> {
  await requireUser("owner");
  const parsed = propertyIdSchema.safeParse(propertyId);
  if (!parsed.success) return { error: "Invalid property id." };
  const current = await getAnalyticsSettings();
  const res = await saveSettings("analytics", { ...current, ga4PropertyId: parsed.data.trim() });
  return res.error ? { error: res.error } : { ok: true };
}

/** Owner-only: set the verified GSC site URL used by the ga4 adapter's queries. */
export async function saveGscSiteUrl(siteUrl: string): Promise<ConnectState> {
  await requireUser("owner");
  const parsed = siteUrlSchema.safeParse(siteUrl);
  if (!parsed.success) return { error: "Invalid site URL." };
  const current = await getAnalyticsSettings();
  const res = await saveSettings("analytics", { ...current, gscSiteUrl: parsed.data.trim() });
  return res.error ? { error: res.error } : { ok: true };
}

/** Owner-only: disconnect the Google Analytics OAuth connection. */
export async function disconnectGa(): Promise<ConnectState> {
  const res = await disconnectIntegration("google-analytics");
  return res.ok ? { ok: true } : { error: res.error };
}

/** Owner-only: disconnect the Google Search Console OAuth connection. */
export async function disconnectGsc(): Promise<ConnectState> {
  const res = await disconnectIntegration("google-search-console");
  return res.ok ? { ok: true } : { error: res.error };
}
