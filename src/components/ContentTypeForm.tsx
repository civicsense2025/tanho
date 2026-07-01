"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, Button } from "@/components/ui";
import { FIELD_KINDS, FIELD_KIND_META, type FieldDef, type FieldKind } from "@/lib/content-types";
import { slugify } from "@/lib/utils";
import type { ContentType } from "@/lib/db";

interface Props {
  typeId?: string;
  initial?: Partial<ContentType>;
}

const sectionLabel: CSSProperties = {
  margin: "0 0 var(--space-4)",
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-widest)",
  color: "var(--text-muted)",
};

function parseFields(fieldsJson: string): FieldDef[] {
  try {
    return JSON.parse(fieldsJson) as FieldDef[];
  } catch {
    return [];
  }
}

export function ContentTypeForm({ typeId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [icon, setIcon] = useState(initial?.icon || "");
  const [seoTitleTemplate, setSeoTitleTemplate] = useState(initial?.seoTitleTemplate || "");
  const [seoDescriptionTemplate, setSeoDescriptionTemplate] = useState(initial?.seoDescriptionTemplate || "");
  const [fields, setFields] = useState<FieldDef[]>(initial?.fields ? parseFields(initial.fields) : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addField() {
    setFields((prev) => [...prev, { key: `field_${prev.length + 1}`, label: "New Field", kind: "text" }]);
  }

  function updateField(i: number, patch: Partial<FieldDef>) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function removeField(i: number) {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveField(i: number, dir: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const body = {
        name,
        slug: slug || slugify(name),
        icon: icon || null,
        fields,
        seoTitleTemplate: seoTitleTemplate || null,
        seoDescriptionTemplate: seoDescriptionTemplate || null,
      };
      const url = typeId ? `/api/content-types/${typeId}` : "/api/content-types";
      const method = typeId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(err.error || "Save failed");
      }
      router.push("/admin/content-types");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <div>
        <h2 style={sectionLabel}>Type Details</h2>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Guide, Project, Testimonial" />
        </Field>
        <Field label="Slug">
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(name) || "auto-from-name"} />
        </Field>
        <Field label="Icon (optional)">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="emoji or icon name" />
        </Field>
        <Field label="SEO Title Template (optional)">
          <Input value={seoTitleTemplate} onChange={(e) => setSeoTitleTemplate(e.target.value)} placeholder="{{title}} — Site Name" />
        </Field>
        <Field label="SEO Description Template (optional)">
          <Input value={seoDescriptionTemplate} onChange={(e) => setSeoDescriptionTemplate(e.target.value)} placeholder="{{summary}}" />
        </Field>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <h2 style={sectionLabel}>Fields</h2>
          <Button onClick={addField} size="sm" variant="outline">+ Add field</Button>
        </div>
        {fields.length === 0 && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No fields yet. Add one to define this content type&apos;s schema.</p>
        )}
        {fields.map((field, i) => (
          <div key={i} style={{ padding: "var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
              <Field label="Key">
                <Input value={field.key} onChange={(e) => updateField(i, { key: e.target.value })} style={{ fontFamily: "var(--font-mono)" }} />
              </Field>
              <Field label="Label">
                <Input value={field.label} onChange={(e) => updateField(i, { label: e.target.value })} />
              </Field>
              <Field label="Kind">
                <Select value={field.kind} onChange={(e) => updateField(i, { kind: e.target.value as FieldKind })}>
                  {FIELD_KINDS.map((k) => (
                    <option key={k} value={k}>{FIELD_KIND_META[k].label}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
              <Field label="Default value">
                <Input
                  value={field.defaultValue as string ?? ""}
                  onChange={(e) => updateField(i, { defaultValue: e.target.value })}
                  placeholder={field.kind === "select" ? "option value" : field.kind === "tags" || field.kind === "block-list" ? "[]" : ""}
                />
              </Field>
              {field.kind === "select" && (
                <Field label="Options (comma-separated)">
                  <Input
                    value={(field.options || []).join(", ")}
                    onChange={(e) => updateField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  />
                </Field>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)", paddingBottom: "var(--space-2)" }}>
                <input type="checkbox" checked={!!field.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                Required
              </label>
            </div>
            {field.helpText !== undefined && (
              <Field label="Help text">
                <Input value={field.helpText} onChange={(e) => updateField(i, { helpText: e.target.value })} />
              </Field>
            )}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => moveField(i, -1)} size="sm" variant="outline" disabled={i === 0}>↑</Button>
              <Button onClick={() => moveField(i, 1)} size="sm" variant="outline" disabled={i === fields.length - 1}>↓</Button>
              <Button onClick={() => removeField(i)} size="sm" variant="outline">Remove</Button>
            </div>
          </div>
        ))}
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>{error}</p>}
      <Button onClick={save} disabled={saving}>{saving ? "Saving…" : typeId ? "Save changes" : "Create content type"}</Button>
    </div>
  );
}
