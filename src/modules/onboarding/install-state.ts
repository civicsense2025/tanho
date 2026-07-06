import { db } from "@/lib/db/client";
import { settings } from "@/modules/settings/schema";
import { users } from "@/modules/auth/schema";
import { installStateSchema, INSTALL_DEFAULTS, type InstallState } from "./install-validation";

/**
 * First-run install state — the source of truth for the site lock.
 *
 * NOTE: this module reads the DB directly (raw Drizzle, no `"use cache"`) so it
 * is safe to call from BOTH server components/actions AND the site-lock proxy
 * (src/proxy.ts). The proxy runs on the Node.js runtime in Next 16, so importing
 * the libSQL client here is fine — but per the Next auth guide, the proxy must
 * not do a DB read on EVERY request. It doesn't: once `isSiteSetUp()` observes a
 * completed install it latches the result in module memory for the process
 * lifetime, so the steady-state (post-install) hot path is a memoized boolean
 * with zero DB cost. The DB reads only recur during the brief pre-install window.
 */

/** Uncached read of the install namespace. */
export async function readInstallState(): Promise<InstallState> {
  const row = await db.query.settings.findFirst({
    where: (s, { eq }) => eq(s.namespace, "install"),
  });
  const parsed = installStateSchema.safeParse(row?.data);
  return parsed.success ? parsed.data : INSTALL_DEFAULTS;
}

/** Count of admin users. 0 ⇒ no owner has been created yet ⇒ first-run. */
export async function userCount(): Promise<number> {
  const rows = await db.select({ id: users.id }).from(users);
  return rows.length;
}

/** True once any admin user exists. Cheaper-to-read alias of `userCount() > 0`. */
export async function hasAnyUser(): Promise<boolean> {
  const rows = await db.select({ id: users.id }).from(users).limit(1);
  return rows.length > 0;
}

/**
 * Records that first-run install finished. Writes the `install` namespace
 * directly (NOT via saveSettings, which is owner-gated) because this is called
 * from the first-owner creation path. Idempotent: only stamps `completedAt`
 * once. Callers should have already created the first owner.
 */
export async function markInstallComplete(): Promise<void> {
  const current = await readInstallState();
  if (current.completedAt !== null) return;
  const data = installStateSchema.parse({ completedAt: Date.now() });
  await db
    .insert(settings)
    .values({ namespace: "install", data, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settings.namespace,
      set: { data, updatedAt: Date.now() },
    });
  latchedSetUp = true;
}

/**
 * The single lock signal the proxy asks: is the site set up and open to the
 * public? True ⇔ a first owner exists AND install was marked complete.
 *
 * Latches: once true, stays true in memory for the process lifetime (setup is a
 * one-way door — you never "un-setup" a running deployment), so every request
 * after install is a memoized boolean, no DB round-trip. Before setup, it does
 * the two cheap indexed reads on each call — acceptable because that window is
 * short and low-traffic (only the deployer hitting the wizard).
 */
let latchedSetUp = false;
export async function isSiteSetUp(): Promise<boolean> {
  if (latchedSetUp) return true;
  const [installed, anyUser] = await Promise.all([readInstallState(), hasAnyUser()]);
  const ready = installed.completedAt !== null && anyUser;
  if (ready) latchedSetUp = true;
  return ready;
}

/** Test-only: reset the in-memory latch so a fresh in-memory DB reads honestly. */
export function __resetInstallLatchForTests(): void {
  latchedSetUp = false;
}
