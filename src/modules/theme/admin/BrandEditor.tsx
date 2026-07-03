"use client";

import { useState, useTransition } from "react";
import { saveTheme } from "../actions";
import type { ThemeInput } from "../validation";
import { Section, Row } from "@/components/admin/Section";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { PALETTE_PRESETS } from "./palette-presets";
import { ThemePreview } from "./ThemePreview";
import { ContrastPanel } from "./ContrastPanel";
import { ThemeActionsBar } from "./ThemeActionsBar";

const FONTS = [
  ["geist", "Geist (default)"],
  ["system", "System UI"],
  ["serif", "Serif"],
  ["grotesk", "Grotesk"],
  ["humanist", "Humanist"],
] as const;

/**
 * The Brand editor — the white-label theming surface. Four base colors +
 * type/spacing scalars drive the whole site's CSS vars (deriveTokens). A live
 * preview and WCAG panel update as you edit; Save writes the singleton theme
 * row. Save-as-theme / import / export live in the ThemeActionsBar.
 */
export function BrandEditor({ initial }: { initial: ThemeInput }) {
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

  const save = () =>
    startTransition(async () => {
      const res = await saveTheme(t);
      if (res.error) setFlash(res.error);
      else {
        setDirty(false);
        setFlash("Saved ✓");
        setTimeout(() => setFlash(null), 1600);
      }
    });

  const bases = { accent: t.accent, accent2: t.accent2, ink: t.ink, paper: t.paper };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,360px)", gap: "var(--space-8)" }}>
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
            <Select value={t.font} onChange={(e) => set("font", e.target.value as ThemeInput["font"])}>
              {FONTS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
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

        <ThemeActionsBar current={t} />
      </div>

      <aside style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", position: "sticky", top: "var(--space-6)", alignSelf: "start" }}>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {(["light", "dark"] as const).map((m) => (
            <Button key={m} variant={mode === m ? "accent" : "outline"} size="sm" onClick={() => setMode(m)}>
              {m === "light" ? "Light" : "Dark"}
            </Button>
          ))}
        </div>
        <ThemePreview theme={t} mode={mode} />
        <Section title="Contrast (WCAG)">
          <ContrastPanel bases={bases} mode={mode} />
        </Section>
      </aside>
    </div>
  );
}
