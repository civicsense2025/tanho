"use client";

import { Button, Input } from "@/components/ui";
import type { ChecklistBlockContent } from "../types";

export function ChecklistEditor({ content, onChange }: { content: ChecklistBlockContent; onChange: (c: ChecklistBlockContent) => void }) {
  const items = content.items || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "var(--space-2)" }}>
          <Input
            value={item}
            onChange={(e) => onChange({ items: items.map((it, j) => (j === i ? e.target.value : it)) })}
            placeholder="Checklist item"
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ items: items.filter((_, j) => j !== i) })} aria-label="Remove item">
            ×
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({ items: [...items, ""] })}>
        + Add item
      </Button>
    </div>
  );
}
