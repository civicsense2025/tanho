"use client";

import { useState, useTransition } from "react";
import { Row } from "@/components/admin/Section";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { saveAiKey, disconnectAiKey } from "../provider-actions";

type Summary = { accountLabel: string; connectedAt: number } | null;

/**
 * BYO key entry + connection status for the Providers tab. Never renders the
 * key itself — only whether a connection exists (accountLabel + date). The
 * "custom" provider also collects a base URL for the OpenAI-compatible
 * endpoint.
 */
export function ProviderKeyRow({
  summary,
  showBaseUrl,
}: {
  summary: Summary;
  showBaseUrl: boolean;
}) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const connect = () =>
    startTransition(async () => {
      const res = await saveAiKey({ apiKey, baseUrl: baseUrl || undefined });
      if (res.error) setFlash(res.error);
      else {
        setApiKey("");
        setFlash("Connected ✓");
        setTimeout(() => setFlash(null), 1600);
      }
    });

  const disconnect = () =>
    startTransition(async () => {
      const res = await disconnectAiKey();
      if (res.error) setFlash(res.error);
      else setFlash(null);
    });

  return (
    <>
      <Row label="API key">
        {summary ? (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--success)" }}>
              Connected · {summary.accountLabel}
            </span>
            <Button variant="outline" size="sm" onClick={disconnect} loading={pending}>
              Disconnect
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Input
              type="password"
              value={apiKey}
              placeholder="Paste your API key"
              autoComplete="off"
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Button
              variant="accent"
              size="sm"
              onClick={connect}
              loading={pending}
              disabled={!apiKey.trim()}
            >
              Connect
            </Button>
          </div>
        )}
      </Row>
      {showBaseUrl && !summary ? (
        <Row label="Base URL">
          <Input
            value={baseUrl}
            placeholder="https://your-endpoint.example.com/v1"
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </Row>
      ) : null}
      {flash ? (
        <Row label="">
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: flash.includes("✓") ? "var(--success)" : "var(--danger)",
            }}
          >
            {flash}
          </span>
        </Row>
      ) : null}
    </>
  );
}
