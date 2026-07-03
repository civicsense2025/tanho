"use client";

import { useState, useTransition } from "react";
import { Section, Row } from "@/components/admin/Section";
import { Toggle } from "@/components/admin/Seg";
import { Button } from "@/components/core/Button";
import { saveAiCrawlers } from "../actions";
import type { AiCrawlersSettings } from "../validation";
import { CrawlersTab } from "./CrawlersTab";
import {
  AuthoringTab,
  PersonalizationTab,
  ProtectionTab,
  ProvidersTab,
} from "./OtherTabs";
import styles from "./ai.module.css";

const TABS = [
  { id: "crawlers", label: "Crawlers" },
  { id: "protection", label: "Protection" },
  { id: "authoring", label: "Authoring" },
  { id: "providers", label: "Providers" },
  { id: "personalization", label: "Personalization" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type AiConnectionSummary = { accountLabel: string; connectedAt: number } | null;

/** The AI & crawlers screen: master AI switch + five tabs. Owner-gated on save. */
export function AiForm({
  initial,
  aiConnection,
}: {
  initial: AiCrawlersSettings;
  aiConnection: AiConnectionSummary;
}) {
  const [s, setS] = useState(initial);
  const [tab, setTab] = useState<TabId>("crawlers");
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const patch = (next: Partial<AiCrawlersSettings>) => {
    setS((p) => ({ ...p, ...next }));
    setDirty(true);
    setFlash(null);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveAiCrawlers(s);
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
        title="AI features"
        desc="Master switch. When off, every AI feature is disabled and all AI bots are blocked in robots.txt."
      >
        <Row label="Enable AI features">
          <Toggle value={s.aiEnabled} onChange={(v) => patch({ aiEnabled: v })} />
        </Row>
      </Section>

      {s.aiEnabled ? (
        <>
          <div className={styles.tabs} role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "crawlers" ? <CrawlersTab s={s} patch={patch} /> : null}
          {tab === "protection" ? <ProtectionTab s={s} patch={patch} /> : null}
          {tab === "authoring" ? <AuthoringTab s={s} patch={patch} /> : null}
          {tab === "providers" ? (
            <ProvidersTab s={s} patch={patch} aiConnection={aiConnection} />
          ) : null}
          {tab === "personalization" ? (
            <PersonalizationTab s={s} patch={patch} />
          ) : null}
        </>
      ) : (
        <p className={styles.disabledNote}>
          AI features are off. Turn on the master switch to configure crawlers,
          protection, authoring, providers, and personalization.
        </p>
      )}
    </div>
  );
}
