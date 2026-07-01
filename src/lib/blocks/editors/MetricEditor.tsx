"use client";

import { Input, Button } from "@/components/ui";
import type { MetricBlockContent } from "../types";

export function MetricEditor({ content, onChange }: { content: MetricBlockContent; onChange: (c: MetricBlockContent) => void }) {
  const metrics = content.metrics || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {metrics.map((m, i) => (
        <div key={i} style={{ display: "flex", gap: "var(--space-2)" }}>
          <Input
            value={m.value}
            onChange={(e) => {
              const next = [...metrics];
              next[i] = { ...m, value: e.target.value };
              onChange({ metrics: next });
            }}
            placeholder="Value (e.g. 15M+)"
            style={{ flex: 1 }}
          />
          <Input
            value={m.label}
            onChange={(e) => {
              const next = [...metrics];
              next[i] = { ...m, label: e.target.value };
              onChange({ metrics: next });
            }}
            placeholder="Label"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => onChange({ metrics: metrics.filter((_, j) => j !== i) })}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: "var(--text-body)", padding: "0 var(--space-2)" }}
          >
            ×
          </button>
        </div>
      ))}
      <div>
        <Button type="button" size="sm" variant="ghost" uppercase onClick={() => onChange({ metrics: [...metrics, { label: "", value: "" }] })}>
          + Add metric
        </Button>
      </div>
    </div>
  );
}
