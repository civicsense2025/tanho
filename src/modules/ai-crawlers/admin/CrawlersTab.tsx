"use client";

import { Section, Row } from "@/components/admin/Section";
import { Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import type { AiCrawlersSettings } from "../validation";
import { CITATION_BOTS, TRAINING_BOTS } from "../validation";
import styles from "./ai.module.css";

type Patch = (next: Partial<AiCrawlersSettings>) => void;

/** Crawlers tab — citation vs training bot groups, RSL, llms.txt. */
export function CrawlersTab({
  s,
  patch,
}: {
  s: AiCrawlersSettings;
  patch: Patch;
}) {
  const setBot = (
    key: "citationBots" | "trainingBots",
    bot: string,
    on: boolean,
  ) => patch({ [key]: { ...s[key], [bot]: on } } as Partial<AiCrawlersSettings>);

  return (
    <>
      <Section
        title="Citation bots"
        desc="Search and answer engines that cite you — usually worth allowing for referral traffic."
      >
        <Row label="Allow citation bots">
          <Toggle
            value={s.allowCitationBots}
            onChange={(v) => patch({ allowCitationBots: v })}
          />
        </Row>
        {CITATION_BOTS.map((bot) => (
          <div key={bot} className={styles.botRow}>
            <span className={styles.botName}>{bot}</span>
            <Toggle
              value={s.allowCitationBots && s.citationBots[bot] !== false}
              onChange={(v) => setBot("citationBots", bot, v)}
              on="Allow"
              off="Block"
            />
          </div>
        ))}
      </Section>

      <Section
        title="Training bots"
        desc="Crawlers that ingest content to train models. Blocked by default."
      >
        <Row label="Allow training bots">
          <Toggle
            value={s.allowTrainingBots}
            onChange={(v) => patch({ allowTrainingBots: v })}
          />
        </Row>
        {TRAINING_BOTS.map((bot) => (
          <div key={bot} className={styles.botRow}>
            <span className={styles.botName}>{bot}</span>
            <Toggle
              value={s.allowTrainingBots && s.trainingBots[bot] !== false}
              onChange={(v) => setBot("trainingBots", bot, v)}
              on="Allow"
              off="Block"
            />
          </div>
        ))}
      </Section>

      <Section
        title="Licensing and llms.txt"
        desc="Advertise a pay-per-crawl price (RSL) and publish an llms.txt entry-point file."
      >
        <Row label="RSL pay-per-crawl">
          <Toggle
            value={s.rsl.enabled}
            onChange={(v) => patch({ rsl: { ...s.rsl, enabled: v } })}
          />
        </Row>
        <Row label="Price (USD per crawl)">
          <Input
            value={s.rsl.priceUsd}
            inputMode="decimal"
            placeholder="0.00"
            onChange={(e) => patch({ rsl: { ...s.rsl, priceUsd: e.target.value } })}
          />
        </Row>
        <Row label="Publish llms.txt">
          <Toggle
            value={s.llmsTxtEnabled}
            onChange={(v) => patch({ llmsTxtEnabled: v })}
          />
        </Row>
      </Section>
    </>
  );
}
