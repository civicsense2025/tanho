"use server";

import { requireUser } from "@/modules/auth/guards";
import { saveSettings, type SaveSettingsState } from "@/modules/settings/actions";
import type { DomainSettings } from "./validation";
import { runDomainCheck } from "./check";
import { __resetDomainPolicyMemo } from "./queries";

export async function saveDomain(data: unknown): Promise<SaveSettingsState> {
  const res = await saveSettings("domain", data);
  // Bust the proxy's in-memory canonical-policy memo so a policy change takes
  // effect immediately (updateTag only invalidates the "use cache" getter, not
  // the uncached module memo the proxy reads — see getDomainPolicyUncached).
  if (res.ok) __resetDomainPolicyMemo();
  return res;
}

/** Admin-panel (cookie session) entry point — see runDomainCheck for the
 *  auth-agnostic core shared with the /api/v1/domain route. */
export async function checkDomain(): Promise<SaveSettingsState & { data?: DomainSettings }> {
  const user = await requireUser("owner");
  return runDomainCheck(user.id);
}
