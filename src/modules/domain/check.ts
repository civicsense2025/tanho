"use server";

import { revalidateTag } from "next/cache";
import { db } from "@/lib/db/client";
import { settings } from "@/modules/settings/schema";
import { readSettingRow } from "@/modules/settings/queries";
import { writeAudit } from "@/modules/audit/log";
import { domainSettingsSchema, type DomainSettings } from "./validation";
import { verifyDomainDns } from "./verify";

export type DomainCheckOutcome = { ok?: boolean; error?: string; data?: DomainSettings };

/**
 * Runs a fresh DNS check against the saved custom domain and persists the
 * result. Synchronous, on-demand — this codebase has no background job
 * system, and every comparable self-hosted tool (Coolify, CapRover, Ghost)
 * also verifies on click rather than polling.
 *
 * Auth-agnostic and writes to the settings table directly (mirrors
 * /api/v1/settings/[namespace]'s PATCH handler) rather than going through
 * the `saveSettings` server action, which does its own cookie-session
 * `requireUser("owner")` check — that check only holds on the admin-panel
 * request path. Callers (the "checkDomain" server action, the /api/v1/domain
 * route) are each responsible for their own auth before calling this, and
 * pass the resolved userId through for the audit entry below.
 */
export async function runDomainCheck(userId: string): Promise<DomainCheckOutcome> {
  const raw = await readSettingRow("domain");
  const parsed = domainSettingsSchema.safeParse(raw);
  const existing = parsed.success ? parsed.data : domainSettingsSchema.parse({});

  if (!existing.customDomain) {
    return { error: "Enter a domain before checking." };
  }

  const result = await verifyDomainDns(existing.customDomain);
  const now = Date.now();
  const next: DomainSettings = {
    ...existing,
    status: result.status,
    errorMessage: result.status === "verified" ? "" : result.detail,
    lastCheckedAt: now,
    verifiedAt: result.status === "verified" ? now : existing.verifiedAt,
  };

  await db
    .insert(settings)
    .values({ namespace: "domain", data: next, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.namespace,
      set: { data: next, updatedAt: now },
    });
  revalidateTag("settings:domain", "max");
  await writeAudit({ userId, action: "settings.save", ownerType: "settings", ownerId: "domain" });

  return { ok: true, data: next };
}
