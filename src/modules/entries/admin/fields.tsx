"use client";

import type { ReactNode } from "react";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Select } from "@/components/forms/Select";
import { Toggle } from "@/components/admin/Seg";
import { type FieldDescriptor, type FieldKind, splitTags, joinTags } from "./field-descriptors";

export type { FieldDescriptor, FieldKind };

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
