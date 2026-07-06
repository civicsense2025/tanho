"use client";

import { useState, useTransition } from "react";
import { saveDomain, checkDomain } from "@/modules/domain/actions";
import { dnsRecordHint } from "@/modules/domain/dns-hint";
import type { DomainSettings } from "@/modules/domain/validation";
import { Section, Row } from "@/components/admin/Section";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

const STATUS_LABEL: Record<DomainSettings["status"], string> = {
  unconfigured: "Not configured",
  pending: "Pending",
  verified: "Verified",
  error: "Error",
};

const STATUS_COLOR: Record<DomainSettings["status"], string> = {
  unconfigured: "var(--text-tertiary)",
  pending: "var(--warning)",
  verified: "var(--success)",
  error: "var(--danger)",
};

/** The Settings → Domain screen: enter a custom domain, see the DNS record
 *  to add, and check it on demand. TLS stays the reverse proxy's job — see
 *  docs/deployment.md. */
export function DomainForm({ initial, appUrl }: { initial: DomainSettings; appUrl: string }) {
  const [s, setS] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [checking, startChecking] = useTransition();

  const set = (customDomain: string) => {
    setS((p) => ({ ...p, customDomain }));
    setDirty(true);
    setFlash(null);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveDomain(s);
      if (res.error) setFlash(res.error);
      else {
        setDirty(false);
        setFlash("Saved ✓");
        setTimeout(() => setFlash(null), 1600);
      }
    });

  const check = () =>
    startChecking(async () => {
      const res = await checkDomain();
      if (res.error) setFlash(res.error);
      else if (res.data) setS(res.data);
    });

  const hint = s.customDomain ? dnsRecordHint(s.customDomain, appUrl) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ flex: 1 }} />
        {flash ? (
          <span style={{ fontSize: "var(--text-xs)", color: flash.includes("✓") ? "var(--success)" : "var(--danger)" }}>
            {flash}
          </span>
        ) : null}
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          {dirty ? "Save •" : "Save"}
        </Button>
      </div>

      <Section
        title="Custom domain"
        desc="Point your own domain at this deployment. DNS record creation happens at your registrar — this platform doesn't own any nameservers."
      >
        <Row label="Domain">
          <Input
            value={s.customDomain}
            placeholder="example.com"
            onChange={(e) => set(e.target.value.trim().toLowerCase())}
          />
        </Row>
        <Row label="Status">
          <span style={{ color: STATUS_COLOR[s.status], fontSize: "var(--text-sm)" }}>
            {STATUS_LABEL[s.status]}
          </span>
        </Row>
        {s.errorMessage ? (
          <Row label=" ">
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{s.errorMessage}</span>
          </Row>
        ) : null}
        {hint ? (
          <Row label="Add this record" stack>
            <div style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)" }}>
              {hint.type === "A" ? (
                <>
                  Type: A · Name: {hint.name} · {hint.note}
                </>
              ) : (
                <>
                  Type: CNAME · Name: {hint.name} · Value: {hint.value}
                </>
              )}
            </div>
          </Row>
        ) : null}
        <Row label=" ">
          <Button variant="outline" size="sm" onClick={check} loading={checking} disabled={!s.customDomain}>
            Check now
          </Button>
        </Row>
        <Row label=" ">
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
            Pointing DNS here doesn&apos;t enable HTTPS by itself — your reverse proxy (Caddy/nginx) handles
            certificates. See the deployment guide.
          </span>
        </Row>
      </Section>
    </div>
  );
}
