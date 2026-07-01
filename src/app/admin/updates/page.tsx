import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { Badge, TextLink } from "@/components/ui";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";

interface OysManifest {
  hubUrl?: string;
  instanceId?: string;
  installedVersion?: string | null;
  baseVersion?: string | null;
  activatedAt?: string;
  lastCheckedAt?: string | null;
}

async function readManifest(): Promise<OysManifest | null> {
  try {
    const raw = await readFile(join(process.cwd(), ".own-your-site", "manifest.json"), "utf-8");
    return JSON.parse(raw) as OysManifest;
  } catch {
    return null;
  }
}

const cardStyle: React.CSSProperties = {
  padding: "var(--space-5)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  marginBottom: "var(--space-5)",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-2xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-faint)",
  marginBottom: "var(--space-1)",
};

const valueStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--text)",
};

const codeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-xs)",
  background: "var(--surface-raised)",
  padding: "var(--space-3) var(--space-4)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  display: "block",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
};

export default async function UpdatesPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");

  const manifest = await readManifest();

  return (
    <AdminPageShell title="Updates">
      <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        Check your template version and apply updates from the Own Your Site hub. Updates preserve your
        customizations via a 3-way merge — conflicts are left with markers for manual resolution, never
        auto-overwritten.
      </p>

      {!manifest ? (
        <div style={cardStyle}>
          <div style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)", marginBottom: "var(--space-2)" }}>
            Not activated
          </div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
            This install hasn&apos;t been activated with a license key yet. Activate from your project directory
            to check for and apply updates:
          </p>
          <code style={codeStyle}>npx own-your-site@latest activate YOUR-LICENSE-KEY</code>
        </div>
      ) : (
        <>
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <span style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)" }}>
                Template version
              </span>
              <Badge status="published">v{manifest.installedVersion ?? "unknown"}</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <div>
                <div style={labelStyle}>Hub</div>
                <div style={valueStyle}>{manifest.hubUrl ?? "—"}</div>
              </div>
              <div>
                <div style={labelStyle}>Instance ID</div>
                <div style={{ ...valueStyle, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)" }}>
                  {manifest.instanceId ?? "—"}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Activated</div>
                <div style={valueStyle}>
                  {manifest.activatedAt ? new Date(manifest.activatedAt).toLocaleDateString() : "—"}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Last checked</div>
                <div style={valueStyle}>
                  {manifest.lastCheckedAt ? new Date(manifest.lastCheckedAt).toLocaleDateString() : "never"}
                </div>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)", marginBottom: "var(--space-2)" }}>
              Check for updates
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
              Run this from your project directory to check for and apply the latest template update:
            </p>
            <code style={codeStyle}>npx own-your-site@latest update</code>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: "var(--space-3)" }}>
              The CLI downloads the signed release, verifies the Ed25519 signature, and runs a 3-way merge
              to preserve your customizations. Your deployed site keeps running regardless — only new updates
              pause if your license expires.
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)", marginBottom: "var(--space-2)" }}>
              Other commands
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div>
                <div style={labelStyle}>Status</div>
                <code style={codeStyle}>npx own-your-site@latest status</code>
              </div>
              <div>
                <div style={labelStyle}>Diagnostics</div>
                <code style={codeStyle}>npx own-your-site@latest doctor</code>
              </div>
            </div>
          </div>
        </>
      )}

      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: "var(--space-6)" }}>
        <TextLink arrow="back" muted href="/admin" style={{ fontSize: "var(--text-xs)" }}>
          Back to admin
        </TextLink>
      </p>
    </AdminPageShell>
  );
}
