"use client";

import { useState, useTransition } from "react";
import { saveDomain } from "@/modules/domain/actions";
import { Section, Row } from "@/components/admin/Section";
import { Seg } from "@/components/admin/Seg";
import { Button } from "@/components/core/Button";
import type { DomainSettings } from "@/modules/domain/validation";

/**
 * Canonical-host + trailing-slash policy (the `domain` settings namespace).
 * Both default to "as-is" (no redirect). When set, the proxy 301s public URLs
 * to their canonical form — see src/proxy.ts / modules/seo/technical/canonical.
 */
export function CanonicalForm({ initial }: { initial: DomainSettings }) {
  const [s, setS] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const patch = (next: Partial<DomainSettings>) => {
    setS((p) => ({ ...p, ...next }));
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ flex: 1 }} />
        {flash ? (
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: flash.includes("✓") ? "var(--success)" : "var(--danger)",
            }}
          >
            {flash}
          </span>
        ) : null}
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          {dirty ? "Save •" : "Save"}
        </Button>
      </div>

      <Section
        title="Canonical URLs"
        desc="Redirect visitors + crawlers to one canonical form of every URL, so a page is never indexed twice. Off by default."
      >
        <Row label="www vs apex">
          <Seg
            value={s.wwwPolicy}
            onChange={(v) => patch({ wwwPolicy: v as DomainSettings["wwwPolicy"] })}
            options={[
              { value: "as-is", label: "Leave as-is" },
              { value: "force-www", label: "Force www" },
              { value: "force-apex", label: "Force apex" },
            ]}
          />
        </Row>
        <Row label="Trailing slash">
          <Seg
            value={s.trailingSlash}
            onChange={(v) => patch({ trailingSlash: v as DomainSettings["trailingSlash"] })}
            options={[
              { value: "as-is", label: "Leave as-is" },
              { value: "strip", label: "Remove (/foo)" },
              { value: "add", label: "Add (/foo/)" },
            ]}
          />
        </Row>
      </Section>
    </div>
  );
}
