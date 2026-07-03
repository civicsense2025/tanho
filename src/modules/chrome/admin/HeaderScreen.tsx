"use client";

import type { Menu } from "@/modules/menus/queries";
import type { HeaderConfig } from "../validation";
import { HeaderBar } from "../public/HeaderBar";
import { useSettingsForm, SaveBar } from "./settings-form";
import { PreviewFrame } from "./PreviewFrame";
import { HeaderGallery } from "./HeaderGallery";
import { Section, Row } from "@/components/admin/Section";
import { Seg, Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";

const MOBILE_STYLES = [
  ["drawer-right", "Drawer, right"],
  ["drawer-left", "Drawer, left"],
  ["fullscreen", "Fullscreen"],
  ["dropdown", "Dropdown"],
] as const;

/** Header settings: preset gallery + config form + live preview. */
export function HeaderScreen({
  initial,
  menus,
  siteName,
  tagline,
}: {
  initial: HeaderConfig;
  menus: Menu[];
  siteName: string;
  tagline?: string;
}) {
  const { s, patch, dirty, flash, pending, save } = useSettingsForm("header", initial);
  const menu = menus.find((m) => m.id === s.menuId) ?? menus[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <SaveBar dirty={dirty} flash={flash} pending={pending} onSave={save} />

      <PreviewFrame>
        <HeaderBar config={s} items={menu?.items ?? []} siteName={siteName} tagline={tagline} />
        <div aria-hidden style={{ height: 96, background: "var(--surface)", opacity: 0.6 }} />
      </PreviewFrame>

      <Section title="Layout" desc="Sixteen structural presets — content stays yours.">
        <HeaderGallery value={s.layout} onSelect={(layout) => patch({ layout })} />
      </Section>

      <Section title="Logo" desc="Leave the text empty to use the site name.">
        <Row label="Text">
          <Input value={s.logo.text} placeholder={siteName} onChange={(e) => patch({ logo: { ...s.logo, text: e.target.value } })} />
        </Row>
        <Row label="Style">
          <Seg
            value={s.logo.style}
            onChange={(v) => patch({ logo: { ...s.logo, style: v as HeaderConfig["logo"]["style"] } })}
            options={[
              { value: "mark", label: "Mark" },
              { value: "wordmark", label: "Wordmark" },
              { value: "icon", label: "Icon" },
            ]}
          />
        </Row>
        {s.logo.style === "icon" ? (
          <Row label="Icon glyph">
            <Input value={s.logo.icon} onChange={(e) => patch({ logo: { ...s.logo, icon: e.target.value } })} />
          </Row>
        ) : null}
      </Section>

      <Section title="Navigation">
        <Row label="Menu">
          <Select value={s.menuId} onChange={(e) => patch({ menuId: e.target.value })}>
            <option value="">First menu (default)</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Row>
      </Section>

      <Section title="Call to action">
        <Row label="Show CTA">
          <Toggle value={s.cta.enabled} onChange={(v) => patch({ cta: { ...s.cta, enabled: v } })} />
        </Row>
        {s.cta.enabled ? (
          <>
            <Row label="Label">
              <Input value={s.cta.label} onChange={(e) => patch({ cta: { ...s.cta, label: e.target.value } })} />
            </Row>
            <Row label="Link">
              <Input
                value={s.cta.href}
                placeholder="/contact or https://…"
                onChange={(e) => patch({ cta: { ...s.cta, href: e.target.value } })}
              />
            </Row>
            <Row label="Variant">
              <Seg
                value={s.cta.variant}
                onChange={(v) => patch({ cta: { ...s.cta, variant: v as HeaderConfig["cta"]["variant"] } })}
                options={[
                  { value: "solid", label: "Solid" },
                  { value: "accent", label: "Accent" },
                  { value: "outline", label: "Outline" },
                ]}
              />
            </Row>
          </>
        ) : null}
      </Section>

      <Section title="Behavior">
        <Row label="Sticky on scroll">
          <Toggle value={s.sticky} onChange={(v) => patch({ sticky: v })} />
        </Row>
        <Row label="Transparent on hero">
          <Toggle value={s.transparentOnHero} onChange={(v) => patch({ transparentOnHero: v })} />
        </Row>
        <Row label="Mobile menu">
          <Select
            value={s.mobile.style}
            onChange={(e) => patch({ mobile: { style: e.target.value as HeaderConfig["mobile"]["style"] } })}
          >
            {MOBILE_STYLES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Row>
      </Section>
    </div>
  );
}
