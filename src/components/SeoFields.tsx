"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Field, Input, Textarea } from "@/components/ui";
import { SerpPreview } from "@/components/SerpPreview";
import { resolveTemplate } from "@/lib/seo";
import type { SeoEntityType, SeoTemplate } from "@/lib/db";

export interface SeoFieldsValue {
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  canonicalUrl: string;
  noIndex: boolean;
}

interface Props {
  entityType: SeoEntityType;
  /** Template variables this entity type's title/description templates can reference (e.g.
   * { title, tagline } for projects, { title, summary } for guides/resources). */
  vars: Record<string, string>;
  /** Shown as the URL breadcrumb in the SERP preview and as the fallback OG image alt context. */
  previewUrl?: string;
  value: SeoFieldsValue;
  onChange: (value: SeoFieldsValue) => void;
}

const sectionLabel: CSSProperties = {
  margin: "0 0 var(--space-4)",
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-widest)",
  color: "var(--text-muted)",
};

const ENTITY_VAR_HINTS: Record<SeoEntityType, string> = {
  project: "{{title}}, {{tagline}}",
  guide: "{{title}}, {{tagline}}, {{summary}}",
  resource: "{{title}}, {{summary}}",
  page: "{{title}}",
  post: "{{title}}, {{excerpt}}",
};

/** Reusable "SEO" form section: raw override inputs (seoTitle/seoDescription/ogImage/canonicalUrl/
 * noIndex) plus a live SerpPreview. Placeholders show the *resolved* value each field will inherit
 * (its content type's title/description template with `vars` substituted) so an empty override
 * field visibly previews what actually ships. */
export function SeoFields({ entityType, vars, previewUrl = "", value, onChange }: Props) {
  const [template, setTemplate] = useState<SeoTemplate | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/seo/templates/${entityType}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled) setTemplate(data); })
      .catch(() => { if (!cancelled) setTemplate(null); });
    return () => { cancelled = true; };
  }, [entityType]);

  const set = <K extends keyof SeoFieldsValue>(key: K, v: SeoFieldsValue[K]) => onChange({ ...value, [key]: v });

  const templateTitle = template ? resolveTemplate(template.titleTemplate, vars) : "";
  const templateDescription = template ? resolveTemplate(template.descriptionTemplate, vars) : "";
  const resolvedTitle = value.seoTitle || templateTitle || vars.title || "";
  const resolvedDescription = value.seoDescription || templateDescription || "";

  return (
    <section>
      <details open>
        <summary style={{ ...sectionLabel, cursor: "pointer", display: "list-item" }}>SEO</summary>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", marginTop: "var(--space-5)" }}>
          <SerpPreview title={resolvedTitle} description={resolvedDescription} url={previewUrl} />

          <Field label="SEO title" hint={`Falls back to template (${templateTitle || "…"}) when blank`}>
            <Input value={value.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder={templateTitle || vars.title || "Title"} />
          </Field>
          <Field label="SEO description" hint={`Falls back to template (${ENTITY_VAR_HINTS[entityType]}) when blank`}>
            <Textarea rows={2} value={value.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} placeholder={templateDescription || "Description"} />
          </Field>
          <Field label="OG image" hint="Falls back to cover image when blank">
            <Input value={value.ogImage} onChange={(e) => set("ogImage", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Canonical URL">
            <Input value={value.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder="https://…" />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <input type="checkbox" checked={value.noIndex} onChange={(e) => set("noIndex", e.target.checked)} />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Hide from search engines (noindex)</span>
          </label>
        </div>
      </details>
    </section>
  );
}
