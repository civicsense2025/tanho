"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/modules/settings/actions";
import { Section, Row } from "@/components/admin/Section";
import { Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { MediaPicker } from "@/modules/media/admin/MediaPicker";
import { Button } from "@/components/core/Button";
import { SEO_CONTENT_TYPES, type SeoSettings, type SeoTemplate } from "../validation";
import { TemplateEditor } from "./TemplateEditor";

const DEFAULT_TMPL: SeoTemplate = { title: "{title} · {site}", description: "{excerpt}" };

/** The Growth → SEO screen: global defaults + per-content-type templates. */
export function SeoForm({
  initial,
  siteName,
  ogPreviewUrl,
  disabledTypes = {},
}: {
  initial: SeoSettings;
  siteName: string;
  ogPreviewUrl: string;
  /** Content types turned off in Content types settings — their template
   *  editor renders locked (read-only, reduced opacity) since it has no
   *  effect until the type is re-enabled. */
  disabledTypes?: Partial<Record<string, boolean>>;
}) {
  const [s, setS] = useState(initial);
  const [ogUrl, setOgUrl] = useState(ogPreviewUrl);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const patch = (next: Partial<SeoSettings>) => {
    setS((p) => ({ ...p, ...next }));
    setDirty(true);
    setFlash(null);
  };

  const setTemplate = (type: string, tmpl: SeoTemplate) =>
    patch({ templates: { ...s.templates, [type]: tmpl } });

  const save = () =>
    startTransition(async () => {
      const res = await saveSettings("seo", s);
      if (res.error) setFlash(res.error);
      else {
        setDirty(false);
        setFlash("Saved ✓");
        setTimeout(() => setFlash(null), 1600);
      }
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ flex: 1 }} />
        {flash ? (
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: flash.includes("✓") ? "var(--success)" : "var(--danger)",
            }}
          >
            {flash}
          </span>
        ) : null}
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          {dirty ? "Save •" : "Save"}
        </Button>
      </div>

      <Section
        title="Global defaults"
        desc="The canonical origin, default share image, and site-wide sitemap toggle."
      >
        <Row label="Site URL">
          <Input
            value={s.siteUrl}
            placeholder="https://example.com"
            onChange={(e) => patch({ siteUrl: e.target.value })}
          />
        </Row>
        <Row label="Default share image" stack>
          <MediaPicker
            value={ogUrl}
            onChange={(url) => {
              setOgUrl(url);
              patch({ defaultOgMediaId: url || null });
            }}
          />
        </Row>
        <Row label="Generate sitemap.xml">
          <Toggle
            value={s.sitemapEnabled}
            onChange={(v) => patch({ sitemapEnabled: v })}
            on="On"
            off="Off"
          />
        </Row>
      </Section>

      <Section
        title="Metadata templates"
        desc="Per content type. Tokens {title} {excerpt} {tag} {site} are filled per page."
      >
        {SEO_CONTENT_TYPES.map((type) => (
          <TemplateEditor
            key={type}
            type={type}
            value={s.templates?.[type] ?? DEFAULT_TMPL}
            siteName={siteName}
            onChange={(tmpl) => setTemplate(type, tmpl)}
            disabled={!!disabledTypes[type]}
          />
        ))}
      </Section>

      <Section
        title="Site verification"
        desc="Ownership codes from each provider's console. Rendered as <meta> tags in the site <head>."
      >
        <Row label="Google (Search Console)">
          <Input
            value={s.verification.google}
            placeholder="verification token"
            onChange={(e) => patch({ verification: { ...s.verification, google: e.target.value } })}
          />
        </Row>
        <Row label="Bing (Webmaster)">
          <Input
            value={s.verification.bing}
            placeholder="verification token"
            onChange={(e) => patch({ verification: { ...s.verification, bing: e.target.value } })}
          />
        </Row>
        <Row label="Pinterest">
          <Input
            value={s.verification.pinterest}
            placeholder="verification token"
            onChange={(e) => patch({ verification: { ...s.verification, pinterest: e.target.value } })}
          />
        </Row>
        <Row label="Yandex">
          <Input
            value={s.verification.yandex}
            placeholder="verification token"
            onChange={(e) => patch({ verification: { ...s.verification, yandex: e.target.value } })}
          />
        </Row>
      </Section>

      <Section
        title="Social profiles"
        desc="Public profile URLs (one per line). Emitted as Organization sameAs for knowledge-panel linking."
      >
        <Row label="Profile URLs" stack>
          <Textarea
            value={s.socialProfiles.join("\n")}
            rows={4}
            placeholder={"https://x.com/yourhandle\nhttps://www.linkedin.com/company/you"}
            onChange={(e) =>
              patch({
                socialProfiles: e.target.value
                  .split("\n")
                  .map((u) => u.trim())
                  .filter(Boolean),
              })
            }
          />
        </Row>
      </Section>
    </div>
  );
}
