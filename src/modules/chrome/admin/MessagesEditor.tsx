"use client";

import type { AnnouncementMessage } from "../validation";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

/** Announcement message rows: text + optional CTA label/url, up to five. */
export function MessagesEditor({
  messages,
  onChange,
}: {
  messages: AnnouncementMessage[];
  onChange: (messages: AnnouncementMessage[]) => void;
}) {
  const set = (i: number, next: AnnouncementMessage) =>
    onChange(messages.map((m, idx) => (idx === i ? next : m)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {messages.map((m, i) => (
        <div key={i} style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <Input
            value={m.text}
            placeholder="Message"
            aria-label={`Message ${i + 1}`}
            onChange={(e) => set(i, { ...m, text: e.target.value })}
            style={{ flex: 2 }}
          />
          <Input
            value={m.cta?.label ?? ""}
            placeholder="CTA label"
            aria-label={`Message ${i + 1} CTA label`}
            onChange={(e) => set(i, { ...m, cta: { label: e.target.value, url: m.cta?.url ?? "" } })}
            style={{ flex: 1 }}
          />
          <Input
            value={m.cta?.url ?? ""}
            placeholder="/path or https://…"
            aria-label={`Message ${i + 1} CTA link`}
            onChange={(e) => set(i, { ...m, cta: { label: m.cta?.label ?? "", url: e.target.value } })}
            style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label="Remove message"
            onClick={() => onChange(messages.filter((_, idx) => idx !== i))}
          >
            ✕
          </Button>
        </div>
      ))}
      {messages.length < 5 ? (
        <div>
          <Button variant="outline" size="sm" onClick={() => onChange([...messages, { text: "" }])}>
            + Add message
          </Button>
        </div>
      ) : null}
    </div>
  );
}
