import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listSiteSettings, upsertSiteSetting } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { SECRET_SETTING_KEYS, toSettingRow } from "@/lib/settings";
import { audit, auditContext } from "@/lib/audit";

/** Admin-only. Returns every stored key with secret values masked -- the decrypted plaintext of
 * a secret setting is never sent to the browser once saved; only a fresh PATCH overwrites it. */
export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await listSiteSettings();
  return NextResponse.json(rows.map(toSettingRow));
}

/** Bulk save -- body is { [key]: string | null }. Blank/undefined values for a secret key mean
 * "no change" (leave the existing encrypted value alone), matching the admin UI's masked-
 * placeholder convention; an explicit null clears a non-secret key back to its default. */
export async function PATCH(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, string | null | undefined>;

  const ctx = auditContext(req);
  const changedKeys: string[] = [];
  for (const [key, rawValue] of Object.entries(body)) {
    const isSecret = SECRET_SETTING_KEYS.has(key);
    if (isSecret && (rawValue === undefined || rawValue === "")) continue; // no change
    const value = rawValue === undefined ? null : rawValue;
    await upsertSiteSetting(key, {
      value: isSecret && value !== null ? encryptSecret(value) : value,
      isSecret: isSecret ? 1 : 0,
    });
    changedKeys.push(key);
  }

  // Audit the change set — record only the KEYS that changed, never their values
  // (a secret setting's value must never enter the audit log).
  if (changedKeys.length > 0) {
    await audit({ ...ctx, actor: "admin", action: "settings.update", target: null, outcome: "success", metadata: { keys: changedKeys } });
  }

  return NextResponse.json({ ok: true });
}
