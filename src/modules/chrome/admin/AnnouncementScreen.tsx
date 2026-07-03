"use client";

import type { AnnouncementConfig } from "../validation";
import { AnnouncementView } from "../public/AnnouncementView";
import { useSettingsForm, SaveBar } from "./settings-form";
import { PreviewFrame } from "./PreviewFrame";
import { MessagesEditor } from "./MessagesEditor";
import { Section, Row } from "@/components/admin/Section";
import { Seg, Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";

/** Announcement bar settings: style/tone, rotation, messages, preview. */
export function AnnouncementScreen({ initial }: { initial: AnnouncementConfig }) {
  const { s, patch, dirty, flash, pending, save } = useSettingsForm("announcement", initial);
  const hasText = s.messages.some((m) => m.text);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <SaveBar dirty={dirty} flash={flash} pending={pending} onSave={save} />

      <PreviewFrame>
        {hasText ? (
          <AnnouncementView key={JSON.stringify(s)} config={s} preview />
        ) : (
          <div style={{ padding: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-faint)", textAlign: "center" }}>
            Add a message below to preview the bar.
          </div>
        )}
      </PreviewFrame>

      <Section title="Announcement bar" desc="A slim strip above the header on every public page.">
        <Row label="Enabled">
          <Toggle value={s.enabled} onChange={(v) => patch({ enabled: v })} />
        </Row>
        <Row label="Style">
          <Seg
            value={s.style}
            onChange={(v) => patch({ style: v as AnnouncementConfig["style"] })}
            options={[
              { value: "solid", label: "Solid" },
              { value: "gradient", label: "Gradient" },
              { value: "outline", label: "Outline" },
              { value: "marquee", label: "Marquee" },
            ]}
          />
        </Row>
        <Row label="Tone">
          <Seg
            value={s.tone}
            onChange={(v) => patch({ tone: v as AnnouncementConfig["tone"] })}
            options={[
              { value: "ink", label: "Ink" },
              { value: "accent", label: "Accent" },
              { value: "accent2", label: "Accent 2" },
              { value: "paper", label: "Paper" },
            ]}
          />
        </Row>
        <Row label="Dismissible">
          <Toggle value={s.dismissible} onChange={(v) => patch({ dismissible: v })} />
        </Row>
        <Row label="Rotation (ms)">
          <Input
            type="number"
            min={2000}
            max={20000}
            step={500}
            value={Number.isFinite(s.rotateMs) ? s.rotateMs : 6000}
            onChange={(e) => {
              const n = Number(e.target.value);
              patch({ rotateMs: Number.isFinite(n) ? n : 6000 });
            }}
          />
        </Row>
      </Section>

      <Section title="Messages" desc="Up to five; multiple messages rotate (or join the marquee).">
        <MessagesEditor messages={s.messages} onChange={(messages) => patch({ messages })} />
      </Section>
    </div>
  );
}
