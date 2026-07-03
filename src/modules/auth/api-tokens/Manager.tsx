"use client";

import { useState, useTransition } from "react";
import { createApiToken, revokeApiToken, type ApiTokenRow } from "@/modules/auth/api-tokens/actions";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";

type CreatedToken = { token: string; row: ApiTokenRow };

/**
 * API token management — owner-only. Mint tokens for external clients (the OYS
 * Swift app, scripts). The raw token is shown ONCE on creation; afterwards only
 * the prefix + last-used timestamp are visible.
 */
export function ApiTokensManager({ initial }: { initial: ApiTokenRow[] }) {
  const [tokens, setTokens] = useState<ApiTokenRow[]>(initial);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const create = () =>
    startTransition(async () => {
      const res = await createApiToken(name);
      if (!res.ok) {
        setFlash(res.error);
        return;
      }
      setTokens((t) => [res.data!.row, ...t]);
      setCreated(res.data!);
      setName("");
      setFlash(null);
      setCopied(false);
    });

  const revoke = (id: string) =>
    startTransition(async () => {
      const res = await revokeApiToken(id);
      if (res.ok) setTokens((t) => t.filter((x) => x.id !== id));
    });

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.token);
      setCopied(true);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div
        style={{
          padding: "var(--space-5)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <h2 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-body)", fontWeight: "var(--weight-medium)" as never }}>
          New token
        </h2>
        <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Tokens carry your full owner authorization. Store them like passwords — you won&apos;t see the full token again.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", flex: 1 }}>
            <label htmlFor="api-token-name" style={{ fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>
              Token name
            </label>
            <Input id="api-token-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My iPhone app" />
          </div>
          <Button onClick={create} disabled={pending || !name.trim()}>
            {pending ? "Creating…" : "Create token"}
          </Button>
        </div>
        {flash ? <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--accent)" }}>{flash}</p> : null}
      </div>

      {created ? (
        <div
          style={{
            padding: "var(--space-5)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--accent)",
            background: "var(--accent-tint)",
          }}
        >
          <h2 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-body)", fontWeight: "var(--weight-medium)" as never }}>
            Copy your token now
          </h2>
          <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            This is the only time the full token is shown. Paste it into your app, then close this dialog.
          </p>
          <code
            style={{
              display: "block",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
              wordBreak: "break-all",
              userSelect: "all",
            }}
          >
            {created.token}
          </code>
          <div style={{ marginTop: "var(--space-3)", display: "flex", gap: "var(--space-3)" }}>
            <Button onClick={copy}>{copied ? "Copied!" : "Copy token"}</Button>
            <Button variant="ghost" onClick={() => setCreated(null)}>
              Done
            </Button>
          </div>
        </div>
      ) : null}

      <div>
        <h2 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-body)", fontWeight: "var(--weight-medium)" as never }}>
          Active tokens ({tokens.length})
        </h2>
        {tokens.length === 0 ? (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No tokens yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {tokens.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div>
                  <div style={{ fontSize: "var(--text-body)", fontWeight: "var(--weight-medium)" as never }}>{t.name}</div>
                  <div style={{ fontSize: "var(--text-2xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                    {t.prefix}… · created {new Date(t.createdAt).toLocaleDateString()}
                    {t.lastUsedAt ? ` · last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : " · never used"}
                  </div>
                </div>
                <Button variant="ghost" onClick={() => revoke(t.id)} disabled={pending}>
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
