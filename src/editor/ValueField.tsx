"use client";

import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Toggle } from "@/components/admin/Seg";
import { Button } from "@/components/core/Button";
import { MediaPicker } from "@/modules/media/admin/MediaPicker";
import { InsertFieldToken } from "./InsertFieldToken";

const MEDIA_FIELDS = new Set(["src", "poster"]);

type Value = unknown;
type OnChange = (v: Value) => void;

const label = (k: string) =>
  k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

/**
 * Generic value-driven control: renders an editor for any JSON value shape.
 * Phase 3's block form — per-kind smart fields replace this in Phase 4.
 */
export function ValueField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Value;
  onChange: OnChange;
}) {
  if (name === "blocks" || name === "hideOn" || name === "_resolved") return null;

  if (typeof value === "boolean") {
    return (
      <Field label={label(name)}>
        <Toggle value={value} onChange={onChange} />
      </Field>
    );
  }
  if (typeof value === "number") {
    return (
      <Field label={label(name)}>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      </Field>
    );
  }
  if (typeof value === "string") {
    if (MEDIA_FIELDS.has(name)) {
      return (
        <Field label={label(name)} hint="Pick from the media library or paste a URL">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <MediaPicker value={value} onChange={onChange} />
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/api/media/… or https://…" />
          </div>
        </Field>
      );
    }
    const long = value.length > 80 || name === "md" || name === "html" || name === "code" || name === "body";
    return (
      <Field label={label(name)}>
        {long ? (
          <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <Input value={value} onChange={(e) => onChange(e.target.value)} />
        )}
        {/* In a content-type template editor, offer a one-click {{field}} insert
            so owners don't have to remember/type token syntax. No-op elsewhere. */}
        <InsertFieldToken onInsert={(token) => onChange(`${value}${token}`)} />
      </Field>
    );
  }
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === "string")) {
      return (
        <Field label={label(name)} hint="One item per line">
          <Textarea
            rows={Math.min(6, value.length + 1)}
            value={(value as string[]).join("\n")}
            onChange={(e) => onChange(e.target.value.split("\n").filter(Boolean))}
          />
        </Field>
      );
    }
    return (
      <Field label={label(name)}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {(value as Record<string, unknown>[]).map((item, i) => (
            <div
              key={i}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              {Object.entries(item).map(([k, v]) => (
                <ValueField
                  key={k}
                  name={k}
                  value={v}
                  onChange={(nv) => {
                    const next = value.slice() as Record<string, unknown>[];
                    next[i] = { ...item, [k]: nv };
                    onChange(next);
                  }}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const proto = (value[0] ?? {}) as Record<string, unknown>;
              const blank = Object.fromEntries(
                Object.entries(proto).map(([k, v]) => [
                  k,
                  typeof v === "number" ? 0 : typeof v === "boolean" ? false : Array.isArray(v) ? [] : "",
                ]),
              );
              onChange([...value, blank]);
            }}
          >
            + Add item
          </Button>
        </div>
      </Field>
    );
  }
  return null;
}
