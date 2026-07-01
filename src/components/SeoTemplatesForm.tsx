"use client";

import { useState, type CSSProperties } from "react";
import { Field, Textarea, Button, Input } from "@/components/ui";
import { SerpPreview } from "@/components/SerpPreview";
import { resolveTemplate } from "@/lib/seo";
import type { SeoEntityType } from "@/lib/db";

interface TemplateData {
  titleTemplate: string;
  descriptionTemplate: string;
}

interface Props {
  entityType: SeoEntityType;
  initial: TemplateData;
}

const ENTITY_LABELS: Record<SeoEntityType, string> = {
  project: "Project",
  guide: "Guide",
  resource: "Resource",
  page: "Page",
  post: "Post",
};

/** Sample values used only to render the live preview -- not saved anywhere. */
const SAMPLE_VARS: Record<SeoEntityType, { hint: string; sample: Record<string, string> }> = {
  project: {
    hint: "{{title}}, {{tagline}}",
    sample: { title: "Example Project", tagline: "A one-line summary of the work" },
  },
  guide: {
    hint: "{{title}}, {{tagline}}, {{summary}}",
    sample: { title: "Squarespace to Ghost", tagline: "Move your blog without losing SEO", summary: "A step-by-step migration walkthrough." },
  },
  resource: {
    hint: "{{title}}, {{summary}}",
    sample: { title: "Ghost Docs: Migration", summary: "Official documentation for importing content." },
  },
  page: {
    hint: "{{title}}",
    sample: { title: "Home" },
  },
  post: {
    hint: "{{title}}, {{excerpt}}",
    sample: { title: "Why I left Substack", excerpt: "Owning your list and your platform, explained." },
  },
};

const sectionLabel: CSSProperties = {
  margin: "0 0 var(--space-4)",
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-sm)",
  fontWeight: 500,
  color: "var(--text)",
};

export function SeoTemplatesForm({ entityType, initial }: Props) {
  const [data, setData] = useState<TemplateData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof TemplateData>(key: K, value: TemplateData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/seo/templates/${entityType}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
    else alert("Save failed");
  }

  const { hint, sample } = SAMPLE_VARS[entityType];
  const previewTitle = resolveTemplate(data.titleTemplate, sample);
  const previewDescription = resolveTemplate(data.descriptionTemplate, sample);

  return (
    <section style={{ paddingBottom: "var(--space-8)", borderBottom: "1px solid var(--border)" }}>
      <h2 style={sectionLabel}>{ENTITY_LABELS[entityType]}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Field label="Title template" hint={`Available: ${hint}`}>
            <Input value={data.titleTemplate} onChange={(e) => set("titleTemplate", e.target.value)} placeholder="{{title}} — Tan Ho" />
          </Field>
          <Field label="Description template" hint={`Available: ${hint}`}>
            <Textarea rows={2} value={data.descriptionTemplate} onChange={(e) => set("descriptionTemplate", e.target.value)} placeholder="{{tagline}}" />
          </Field>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {saved && <span style={{ marginLeft: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--success)" }}>Saved</span>}
          </div>
        </div>
        <div>
          <span style={{ display: "block", fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", marginBottom: "var(--space-2)" }}>
            Preview (sample data)
          </span>
          <SerpPreview title={previewTitle} description={previewDescription} url={`tan.ho › ${entityType}s`} />
        </div>
      </div>
    </section>
  );
}
