"use client";

import type { ReactNode } from "react";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Select } from "@/components/forms/Select";
import { Toggle } from "@/components/admin/Seg";

/** The control kinds a data field can render as. */
export type FieldKind = "text" | "textarea" | "select" | "tags" | "number" | "boolean";

/** One data-field descriptor: which control + label (+ options for selects). */
export type FieldDescriptor = {
  key: string;
  label: string;
  kind: FieldKind;
  /** Value/label pairs for `select` controls. */
  options?: [value: string, label: string][];
  hint?: string;
};

/**
 * Per-entity data-field descriptors. Introspecting arbitrary zod is fiddly, so
 * each content type lists its `data` fields explicitly here — this stays in
 * sync with the zod schemas in src/entities/schemas/{project,guide,resource}.ts.
 */
export const FIELD_DESCRIPTORS: Record<string, FieldDescriptor[]> = {
  project: [
    { key: "tagline", label: "Tagline", kind: "text" },
    { key: "year", label: "Year", kind: "text" },
    { key: "live_url", label: "Live URL", kind: "text", hint: "https:// or blank" },
    { key: "github_url", label: "GitHub URL", kind: "text", hint: "https:// or blank" },
    { key: "tags", label: "Tags", kind: "tags", hint: "Comma-separated" },
  ],
  guide: [
    { key: "tagline", label: "Tagline", kind: "text" },
    { key: "summary", label: "Summary", kind: "textarea" },
    { key: "category", label: "Category", kind: "text", hint: "Hub slug" },
    { key: "source_platform", label: "Source platform", kind: "text", hint: "Slug" },
    { key: "target_platform", label: "Target platform", kind: "text", hint: "Slug" },
    {
      key: "difficulty",
      label: "Difficulty",
      kind: "select",
      options: [
        ["beginner", "Beginner"],
        ["intermediate", "Intermediate"],
        ["advanced", "Advanced"],
      ],
    },
    { key: "effort_hours_min", label: "Effort hours (min)", kind: "number" },
    { key: "effort_hours_max", label: "Effort hours (max)", kind: "number" },
    { key: "cost_min_usd", label: "Cost min (USD)", kind: "number" },
    { key: "cost_max_usd", label: "Cost max (USD)", kind: "number" },
    {
      key: "cost_period",
      label: "Cost period",
      kind: "select",
      options: [
        ["mo", "Monthly"],
        ["yr", "Yearly"],
        ["one-time", "One-time"],
      ],
    },
    { key: "tags", label: "Tags", kind: "tags", hint: "Comma-separated" },
    { key: "resource_slugs", label: "Resource slugs", kind: "tags", hint: "Comma-separated" },
    { key: "skills_required", label: "Skills required", kind: "tags", hint: "Comma-separated" },
    { key: "requirements", label: "Requirements", kind: "tags", hint: "Comma-separated" },
  ],
  resource: [
    { key: "url", label: "URL", kind: "text", hint: "https:// or blank" },
    {
      key: "resource_type",
      label: "Type",
      kind: "select",
      options: [
        ["docs", "Docs"],
        ["article", "Article"],
        ["video", "Video"],
        ["forum_thread", "Forum thread"],
        ["tool", "Tool"],
        ["interactive", "Interactive"],
      ],
    },
    { key: "source_name", label: "Source name", kind: "text" },
    { key: "summary", label: "Summary", kind: "textarea" },
    { key: "platforms", label: "Platforms", kind: "tags", hint: "Comma-separated" },
    { key: "is_public", label: "Visibility", kind: "boolean" },
    { key: "internal_notes", label: "Internal notes", kind: "textarea", hint: "Never shown publicly" },
    { key: "internal_route", label: "Internal route", kind: "text", hint: "e.g. /quiz" },
    { key: "category", label: "Category", kind: "text", hint: "Hub slug" },
  ],
};

/** Split a comma-separated string into a trimmed, empties-dropped list. */
export function splitTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Join a tag list back into the comma-separated editing string. */
export function joinTags(value: unknown): string {
  return Array.isArray(value) ? value.map((v) => String(v)).join(", ") : "";
}

type ControlProps = {
  descriptor: FieldDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
};

/** One data-field control, wrapped in a labelled Field. */
export function FieldControl({ descriptor, value, onChange }: ControlProps): ReactNode {
  const { label, kind, options, hint } = descriptor;
  return (
    <Field label={label} hint={hint}>
      {renderControl(kind, value, onChange, options)}
    </Field>
  );
}

function renderControl(
  kind: FieldKind,
  value: unknown,
  onChange: (value: unknown) => void,
  options?: [string, string][],
): ReactNode {
  switch (kind) {
    case "textarea":
      return (
        <Textarea
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "select":
      return (
        <Select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {(options ?? []).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      );
    case "tags":
      return (
        <Input
          value={joinTags(value)}
          onChange={(e) => onChange(splitTags(e.target.value))}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={typeof value === "number" || typeof value === "string" ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
        />
      );
    case "boolean":
      return (
        <Toggle
          value={Boolean(value)}
          onChange={(v) => onChange(v)}
          on="Public"
          off="Internal"
        />
      );
    case "text":
    default:
      return (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
