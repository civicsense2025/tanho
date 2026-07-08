import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/guards";
import { listSessions, revokeSession, revokeOtherSessions } from "@/modules/auth/session-actions";
import { enrollMfa, disableMfa, regenerateBackupCodes } from "@/modules/auth/mfa/actions";
import { PermissionsProvider } from "@/modules/auth/usePermissions";
import { AdminPage } from "@/components/admin/AdminPage";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

export const metadata = { title: "Account" };

/** Form-action wrapper — enrolls in MFA. */
async function handleEnrollMfa() {
  "use server";
  await enrollMfa();
  revalidatePath("/admin/account");
}

/** Form-action wrapper — disables MFA (requires password). */
async function handleDisableMfa(formData: FormData) {
  "use server";
  await disableMfa(String(formData.get("password") ?? ""));
  revalidatePath("/admin/account");
}

/** Form-action wrapper — regenerates backup codes (requires password). */
async function handleRegenerateBackupCodes(formData: FormData) {
  "use server";
  await regenerateBackupCodes(String(formData.get("password") ?? ""));
  revalidatePath("/admin/account");
}

/** Form-action wrapper — revokes a single session. */
async function handleRevokeSession(formData: FormData) {
  "use server";
  await revokeSession(String(formData.get("sessionId") ?? ""));
  revalidatePath("/admin/account");
}

/** Form-action wrapper — revokes all other sessions. */
async function handleRevokeOtherSessions() {
  "use server";
  await revokeOtherSessions();
  revalidatePath("/admin/account");
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageInner />
    </Suspense>
  );
}

async function AccountPageInner() {
  const user = await requireUser();
  const sessionsResult = await listSessions();
  const sessions = sessionsResult.ok ? (sessionsResult.data ?? []) : [];
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <PermissionsProvider permissions={user.permissions}>
      <AdminPage>
        <h1 style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          Account
        </h1>

        {/* Profile */}
        <section style={{ marginBottom: "var(--space-8)" }}>
          <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
            Profile
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: "32rem" }}>
            <div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Name</span>
              <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "var(--text)" }}>{user.name}</p>
            </div>
            <div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Email</span>
              <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "var(--text)" }}>{user.email}</p>
            </div>
            <div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Role</span>
              <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-sm)", color: "var(--text)", textTransform: "capitalize" }}>{user.role}</p>
            </div>
          </div>
        </section>

        {/* MFA */}
        <section style={{ marginBottom: "var(--space-8)" }}>
          <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
            Two-factor authentication
          </h2>
          <div style={{ padding: "var(--space-4)", border: "1px solid var(--border)", borderRadius: 8, maxWidth: "32rem" }}>
            <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Add an extra layer of security with a TOTP authenticator app. After enrolling, you&apos;ll scan a QR code and verify a 6-digit code.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <form action={handleEnrollMfa}>
                <Button type="submit">Enroll in MFA</Button>
              </form>
              <form action={handleDisableMfa} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <label htmlFor="disable-mfa-password" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  Password (required to disable MFA)
                </label>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
                  <Input id="disable-mfa-password" type="password" name="password" placeholder="Your password" autoComplete="current-password" required style={{ flex: 1 }} />
                  <Button type="submit" variant="outline">Disable MFA</Button>
                </div>
              </form>
              <form action={handleRegenerateBackupCodes} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <label htmlFor="regen-password" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  Password (required to regenerate backup codes)
                </label>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
                  <Input id="regen-password" type="password" name="password" placeholder="Your password" autoComplete="current-password" required style={{ flex: 1 }} />
                  <Button type="submit" variant="outline">Regenerate backup codes</Button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Sessions */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <h2 style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
              Active sessions
            </h2>
            {otherSessions.length > 0 ? (
              <form action={handleRevokeOtherSessions}>
                <button type="submit" style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-xs)", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                  Revoke all other sessions
                </button>
              </form>
            ) : null}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>Device</th>
                <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>IP</th>
                <th style={{ padding: "var(--space-2) var(--space-4)", fontWeight: 500, color: "var(--text-muted)" }}>Last seen</th>
                <th style={{ padding: "var(--space-2) var(--space-4)" }}></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "var(--space-2) var(--space-4)" }}>
                    {s.userAgent ?? "Unknown device"}
                    {s.isCurrent ? (
                      <span style={{ marginLeft: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--accent)" }}>
                        (this device)
                      </span>
                    ) : null}
                  </td>
                  <td style={{ padding: "var(--space-2) var(--space-4)", color: "var(--text-muted)" }}>{s.ip ?? "—"}</td>
                  <td style={{ padding: "var(--space-2) var(--space-4)", color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "var(--space-2) var(--space-4)" }}>
                    {!s.isCurrent ? (
                      <form action={handleRevokeSession}>
                        <input type="hidden" name="sessionId" value={s.id} />
                        <button type="submit" style={{ background: "none", border: "none", color: "var(--danger)", fontSize: "var(--text-xs)", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                          Revoke
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </AdminPage>
    </PermissionsProvider>
  );
}
