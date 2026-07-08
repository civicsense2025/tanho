"use client";

import Link from "next/link";
import { forwardRef, useImperativeHandle, useState, useTransition } from "react";
import { saveTheme } from "../actions";
import type { ThemeInput } from "../validation";
import { Section, Row } from "@/components/admin/Section";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { MediaIdPicker } from "@/modules/media/admin/MediaIdPicker";
import { PALETTE_PRESETS } from "./palette-presets";
import { ThemePreview } from "./ThemePreview";
import { ContrastPanel } from "./ContrastPanel";
import { ThemeActionsBar } from "./ThemeActionsBar";
import styles from "./brand-editor.module.css";

/** Imperative handle so a host (e.g. the onboarding wizard) can force a save
 *  before navigating away, instead of relying on this form's own Save button
 *  being clicked first. Resolves to the saved data on success (so the host
 *  can update its own copy instead of holding a stale pre-save snapshot),
 *  or null on failure. */
export type BrandEditorHandle = { save: () => Promise<ThemeInput | null> };

/** A custom/Google font family the owner has added (for the Font select). */
export type BrandFontFamily = { id: string; name: string };

const FONTS = [
  ["geist", "Geist (default)"],
  ["system", "System UI"],
  ["serif", "Serif"],
  ["grotesk", "Grotesk"],
  ["humanist", "Humanist"],
] as const;

/** Sentinel select value for "use a built-in preset" (no custom family). */
const PRESET_PREFIX = "preset:";
const FAMILY_PREFIX = "family:";

/**
 * The Brand editor — the white-label theming surface. Four base colors +
 * type/spacing scalars drive the whole site's CSS vars (deriveTokens). A live
 * preview and WCAG panel update as you edit; Save writes the singleton theme
 * row. Save-as-theme / import / export live in the ThemeActionsBar.
 */
export const BrandEditor = forwardRef<
  BrandEditorHandle,
  {
    initial: ThemeInput;
    fontFamilies?: BrandFontFamily[];
    faviconPreviewUrl?: string | null;
    siteName?: string;
  }
>(function BrandEditor({ initial, fontFamilies = [], faviconPreviewUrl = null, siteName }, ref) {
  const [t, setT] = useState<ThemeInput>(initial);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ThemeInput>(k: K, v: ThemeInput[K]) => {
    setT((p) => ({ ...p, [k]: v }));
    setDirty(true);
    setFlash(null);
  };
  const applyPreset = (p: (typeof PALETTE_PRESETS)[number]) => {
    setT((prev) => ({ ...prev, accent: p.accent, accent2: p.accent2, ink: p.ink, paper: p.paper }));
    setDirty(true);
    setFlash(null);
  };

  /** Shared by the on-screen Save button and the imperative handle below —
   *  both need the actual save outcome, not just a fire-and-forget. */
  const doSave = async (): Promise<boolean> => {
    const res = await saveTheme(t);
    if (res.error) {
      setFlash(res.error);
      return false;
    }
    setDirty(false);
    setFlash("Saved ✓");
    setTimeout(() => setFlash(null), 1600);
    return true;
  };

  const save = () =>
    startTransition(() => {
      void doSave();
    });

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!dirty) return t;
      const ok = await doSave();
      return ok ? t : null;
    },
  }));

  const bases = { accent: t.accent, accent2: t.accent2, ink: t.ink, paper: t.paper };

  /** Compute the live --font-sans stack for the currently selected font family,
   *  so the preview updates immediately when the owner switches fonts (no
   *  save-and-reload needed). Mirrors fonts/css.ts#cssStackFor's format. */
  const activeCustomStack = t.fontFamilyId
    ? (() => {
      const family = fontFamilies.find((f) => f.id === t.fontFamilyId);
      return family ? `"${family.name}", ui-sans-serif, system-ui, -apple-system, sans-serif` : null;
    })()
    : null;

  return (
    <div className={styles.layout}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span style={{ flex: 1 }} />
          {flash ? (
            <span style={{ fontSize: "var(--text-xs)", color: flash.includes("✓") ? "var(--success)" : "var(--danger)" }}>
              {flash}
            </span>
          ) : null}
          <Button variant="accent" size="sm" onClick={save} loading={pending}>
            {dirty ? "Save •" : "Save"}
          </Button>
        </div>

        <Section title="Brand identity" desc="Your logo and site name live elsewhere — edit them there, not here.">
          <Row label="Logo">
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Part of your site header.{" "}
              <Link href="/admin/nav/header" style={{ color: "var(--accent)" }}>
                Edit in the Header editor →
              </Link>
            </span>
          </Row>
          <Row label="Site name">
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>
              {siteName || "—"}
            </span>
            <Link href="/admin/settings/general" style={{ fontSize: "var(--text-xs)", color: "var(--accent)", marginLeft: "var(--space-3)" }}>
              Edit in General settings →
            </Link>
          </Row>
        </Section>

        <Section title="Palette presets" desc="A starting point — click to fill the four base colors.">
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            {PALETTE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                title={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--surface-card)",
                  cursor: "pointer",
                  fontSize: "var(--text-xs)",
                }}
              >
                <span style={{ display: "flex" }}>
                  {[p.accent, p.accent2, p.ink, p.paper].map((c, i) => (
                    <span key={i} style={{ width: 12, height: 12, background: c, borderRadius: 2, marginLeft: i ? -2 : 0, border: "1px solid var(--border)" }} />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Colors" desc="Four base colors; the full light + dark token set is derived from them.">
          {([["accent", "Accent"], ["accent2", "Accent 2"], ["ink", "Ink (text)"], ["paper", "Paper (background)"]] as const).map(
            ([k, label]) => (
              <Row key={k} label={label}>
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                  <Input type="color" value={t[k]} onChange={(e) => set(k, e.target.value)} style={{ width: 44, padding: 2 }} />
                  <Input value={t[k]} onChange={(e) => set(k, e.target.value)} style={{ width: 120 }} />
                </div>
              </Row>
            ),
          )}
        </Section>

        <Section title="Typography">
          <Row label="Font">
            <Select
              value={t.fontFamilyId ? `${FAMILY_PREFIX}${t.fontFamilyId}` : `${PRESET_PREFIX}${t.font}`}
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith(FAMILY_PREFIX)) {
                  set("fontFamilyId", v.slice(FAMILY_PREFIX.length));
                } else {
                  setT((p) => ({ ...p, fontFamilyId: null, font: v.slice(PRESET_PREFIX.length) as ThemeInput["font"] }));
                  setDirty(true);
                  setFlash(null);
                }
              }}
            >
              {fontFamilies.length > 0 ? (
                <optgroup label="Your fonts">
                  {fontFamilies.map((f) => (
                    <option key={f.id} value={`${FAMILY_PREFIX}${f.id}`}>{f.name}</option>
                  ))}
                </optgroup>
              ) : null}
              <optgroup label="Built-in">
                {FONTS.map(([v, l]) => (
                  <option key={v} value={`${PRESET_PREFIX}${v}`}>{l}</option>
                ))}
              </optgroup>
            </Select>
          </Row>
          <Row label="">
            <Link href="/admin/settings/fonts" style={{ fontSize: "var(--text-xs)", color: "var(--accent)" }}>
              Manage fonts (upload or add Google Fonts) →
            </Link>
          </Row>
          <Row label={`Base size — ${t.baseSize}px`}>
            <input type="range" min={14} max={20} step={1} value={t.baseSize} onChange={(e) => set("baseSize", Number(e.target.value))} />
          </Row>
          <Row label={`Heading scale — ${t.headingScale}×`}>
            <input type="range" min={0.85} max={1.5} step={0.05} value={t.headingScale} onChange={(e) => set("headingScale", Number(e.target.value))} />
          </Row>
          <Row label={`Line height — ${t.leading}`}>
            <input type="range" min={1.3} max={2} step={0.05} value={t.leading} onChange={(e) => set("leading", Number(e.target.value))} />
          </Row>
        </Section>

        <Section title="Spacing & shape">
          <Row label={`Density — ${t.density}×`}>
            <input type="range" min={0.8} max={1.3} step={0.05} value={t.density} onChange={(e) => set("density", Number(e.target.value))} />
          </Row>
          <Row label="Corner radius">
            <Select value={t.radius} onChange={(e) => set("radius", e.target.value as ThemeInput["radius"])}>
              <option value="square">Square</option>
              <option value="soft">Soft</option>
              <option value="round">Round</option>
            </Select>
          </Row>
          <Row label="Shadow">
            <Select value={t.shadow} onChange={(e) => set("shadow", e.target.value as ThemeInput["shadow"])}>
              <option value="flat">Flat</option>
              <option value="subtle">Subtle</option>
              <option value="elevated">Elevated</option>
            </Select>
          </Row>
        </Section>

        <Section title="Favicon" desc="The small icon shown in browser tabs. PNG, WebP, or SVG (sanitized on upload).">
          <Row label="Favicon">
            <MediaIdPicker
              value={t.faviconMediaId}
              previewUrl={faviconPreviewUrl}
              onChange={(next) => set("faviconMediaId", next?.id ?? null)}
            />
          </Row>
        </Section>

        <ThemeActionsBar current={t} />
      </div>

      <aside className={styles.preview}>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {(["light", "dark"] as const).map((m) => (
            <Button key={m} variant={mode === m ? "accent" : "outline"} size="sm" onClick={() => setMode(m)}>
              {m === "light" ? "Light" : "Dark"}
            </Button>
          ))}
        </div>
        <ThemePreview theme={t} mode={mode} customStack={activeCustomStack} />
        <Section title="Contrast (WCAG)">
          <ContrastPanel bases={bases} mode={mode} />
        </Section>
      </aside>
    </div>
  );
});
