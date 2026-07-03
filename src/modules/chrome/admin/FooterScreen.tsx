"use client";

import type { Menu } from "@/modules/menus/queries";
import type { FooterConfig } from "../validation";
import { FooterBar } from "../public/FooterBar";
import { useSettingsForm, SaveBar } from "./settings-form";
import { PreviewFrame } from "./PreviewFrame";
import { FooterGallery } from "./FooterGallery";
import { ColumnsEditor } from "./ColumnsEditor";
import { Section, Row } from "@/components/admin/Section";
import { Seg, Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";

/** Footer settings: preset gallery + columns/newsletter/copyright + preview. */
export function FooterScreen({
  initial,
  menus,
  siteName,
  tagline,
}: {
  initial: FooterConfig;
  menus: Menu[];
  siteName: string;
  tagline?: string;
}) {
  const { s, patch, dirty, flash, pending, save } = useSettingsForm("footer", initial);
  const byId = new Map(menus.map((m) => [m.id, m]));
  const columns = s.columns.map((c) => ({ title: c.title, items: byId.get(c.menuId)?.items ?? [] }));
  const social = byId.get(s.socialMenuId)?.items ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <SaveBar dirty={dirty} flash={flash} pending={pending} onSave={save} />

      <PreviewFrame>
        <FooterBar
          config={s}
          columns={columns}
          social={social}
          siteName={siteName}
          tagline={tagline}
          year={new Date().getFullYear()}
        />
      </PreviewFrame>

      <Section title="Layout" desc="Fourteen structural presets — content stays yours.">
        <FooterGallery value={s.layout} onSelect={(layout) => patch({ layout })} />
      </Section>

      <Section title="Logo" desc="Leave the text empty to use the site name.">
        <Row label="Text">
          <Input value={s.logo.text} placeholder={siteName} onChange={(e) => patch({ logo: { ...s.logo, text: e.target.value } })} />
        </Row>
        <Row label="Style">
          <Seg
            value={s.logo.style}
            onChange={(v) => patch({ logo: { ...s.logo, style: v as FooterConfig["logo"]["style"] } })}
            options={[
              { value: "mark", label: "Mark" },
              { value: "wordmark", label: "Wordmark" },
              { value: "icon", label: "Icon" },
            ]}
          />
        </Row>
      </Section>

      <Section title="Menus" desc="Columns show on column layouts; the social menu feeds social rows and the contact card.">
        <Row label="Columns" stack>
          <ColumnsEditor columns={s.columns} menus={menus} onChange={(columns) => patch({ columns })} />
        </Row>
        <Row label="Social menu">
          <Select value={s.socialMenuId} onChange={(e) => patch({ socialMenuId: e.target.value })}>
            <option value="">None</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Row>
      </Section>

      <Section title="Newsletter" desc="Shows on newsletter layouts when enabled.">
        <Row label="Enabled">
          <Toggle value={s.newsletter.enabled} onChange={(v) => patch({ newsletter: { ...s.newsletter, enabled: v } })} />
        </Row>
        {s.newsletter.enabled ? (
          <>
            <Row label="Title">
              <Input value={s.newsletter.title} onChange={(e) => patch({ newsletter: { ...s.newsletter, title: e.target.value } })} />
            </Row>
            <Row label="Body" stack>
              <Textarea rows={2} value={s.newsletter.body} onChange={(e) => patch({ newsletter: { ...s.newsletter, body: e.target.value } })} />
            </Row>
            <Row label="Button label">
              <Input value={s.newsletter.cta} onChange={(e) => patch({ newsletter: { ...s.newsletter, cta: e.target.value } })} />
            </Row>
          </>
        ) : null}
      </Section>

      <Section title="Copyright" desc="Empty renders © current-year + site name.">
        <Row label="Copyright line">
          <Input value={s.copyright} placeholder={`© ${new Date().getFullYear()} ${siteName}`} onChange={(e) => patch({ copyright: e.target.value })} />
        </Row>
      </Section>
    </div>
  );
}
