"use client";

import { Section, Row } from "@/components/admin/Section";
import { Toggle, Seg } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import type { AiCrawlersSettings } from "../validation";
import { ProviderKeyRow } from "./ProviderKeyRow";

type Patch = (next: Partial<AiCrawlersSettings>) => void;

/** Protection tab — image watermark, content credentials, right-click, hotlink. */
export function ProtectionTab({ s, patch }: { s: AiCrawlersSettings; patch: Patch }) {
  const set = (next: Partial<AiCrawlersSettings["protection"]>) =>
    patch({ protection: { ...s.protection, ...next } });
  return (
    <Section title="Content protection" desc="Deter scraping and misuse of your media.">
      <Row label="Image watermark">
        <Toggle value={s.protection.watermark} onChange={(v) => set({ watermark: v })} />
      </Row>
      <Row label="Watermark text">
        <Input
          value={s.protection.watermarkText}
          placeholder="© your site"
          onChange={(e) => set({ watermarkText: e.target.value })}
        />
      </Row>
      <Row label="Content Credentials (C2PA)">
        <Toggle
          value={s.protection.contentCredentials}
          onChange={(v) => set({ contentCredentials: v })}
        />
      </Row>
      <Row label="Disable right-click">
        <Toggle value={s.protection.noRightClick} onChange={(v) => set({ noRightClick: v })} />
      </Row>
      <Row label="Hotlink protection">
        <Toggle
          value={s.protection.hotlinkProtection}
          onChange={(v) => set({ hotlinkProtection: v })}
        />
      </Row>
    </Section>
  );
}

/** Authoring tab — AI writing assists (flags only this phase). */
export function AuthoringTab({ s, patch }: { s: AiCrawlersSettings; patch: Patch }) {
  const set = (next: Partial<AiCrawlersSettings["authoring"]>) =>
    patch({ authoring: { ...s.authoring, ...next } });
  return (
    <Section
      title="AI authoring assists"
      desc="Draft-time helpers. Flags are stored now; the AI provider wires up in a later phase."
    >
      <Row label="Alt-text suggestions">
        <Toggle value={s.authoring.alt} onChange={(v) => set({ alt: v })} />
      </Row>
      <Row label="SEO suggestions">
        <Toggle value={s.authoring.seo} onChange={(v) => set({ seo: v })} />
      </Row>
      <Row label="Post summaries">
        <Toggle value={s.authoring.summarize} onChange={(v) => set({ summarize: v })} />
      </Row>
    </Section>
  );
}

/** Providers tab — which model backs the assists, plus the BYO key. */
export function ProvidersTab({
  s,
  patch,
  aiConnection,
}: {
  s: AiCrawlersSettings;
  patch: Patch;
  aiConnection: { accountLabel: string; connectedAt: number } | null;
}) {
  const set = (next: Partial<AiCrawlersSettings["provider"]>) =>
    patch({ provider: { ...s.provider, ...next } });
  const needsKey = s.provider.which !== "builtin";
  return (
    <Section
      title="AI provider"
      desc="Choose the model backend and connect your own API key. Built-in makes no live AI calls."
    >
      <Row label="Provider">
        <Seg
          value={s.provider.which}
          onChange={(v) => set({ which: v as AiCrawlersSettings["provider"]["which"] })}
          options={[
            { value: "builtin", label: "Built-in" },
            { value: "anthropic", label: "Anthropic" },
            { value: "openai", label: "OpenAI" },
            { value: "custom", label: "Custom" },
          ]}
        />
      </Row>
      <Row label="Model">
        <Input
          value={s.provider.model}
          placeholder="default"
          onChange={(e) => set({ model: e.target.value })}
        />
      </Row>
      <Row label="Monthly cap (requests)">
        <Input
          type="number"
          min={0}
          value={String(s.provider.monthlyCap)}
          onChange={(e) => set({ monthlyCap: Math.max(0, Number(e.target.value) || 0) })}
        />
      </Row>
      {needsKey ? (
        <ProviderKeyRow summary={aiConnection} showBaseUrl={s.provider.which === "custom"} />
      ) : null}
      {needsKey && !aiConnection ? (
        <Row label="">
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            No key saved here yet — falls back to the ANTHROPIC_API_KEY / OPENAI_API_KEY
            environment variable if set on this deployment.
          </span>
        </Row>
      ) : null}
    </Section>
  );
}

/** Personalization tab — related content, smart search, greeting. */
export function PersonalizationTab({ s, patch }: { s: AiCrawlersSettings; patch: Patch }) {
  const set = (next: Partial<AiCrawlersSettings["personalization"]>) =>
    patch({ personalization: { ...s.personalization, ...next } });
  return (
    <Section
      title="Personalization"
      desc="Tailor what visitors see. Embedding-backed features activate with the AI adapter."
    >
      <Row label="Related content">
        <Toggle value={s.personalization.recs} onChange={(v) => set({ recs: v })} />
      </Row>
      <Row label="Smart search">
        <Toggle value={s.personalization.search} onChange={(v) => set({ search: v })} />
      </Row>
      <Row label="Personalized greeting">
        <Toggle value={s.personalization.greeting} onChange={(v) => set({ greeting: v })} />
      </Row>
    </Section>
  );
}
