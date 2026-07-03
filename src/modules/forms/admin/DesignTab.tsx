"use client";

import { Section, Row } from "@/components/admin/Section";
import { Seg } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { THEMES } from "../validation";
import type { Editor } from "./FormBuilder";

/** Design tab — theme, layout, accent. */
export function DesignTab({ editor }: { editor: Editor }) {
  const { design } = editor.draft;
  return (
    <Section title="Appearance" desc="Theme, layout and accent color.">
      <Row label="Theme">
        <Seg
          value={design.theme}
          onChange={(v) => editor.patchDesign({ theme: v as (typeof THEMES)[number] })}
          options={THEMES.map((t) => ({ value: t, label: t[0]!.toUpperCase() + t.slice(1) }))}
        />
      </Row>
      <Row label="Layout">
        <Seg
          value={design.layout}
          onChange={(v) => editor.patchDesign({ layout: v as "classic" | "conversational" })}
          options={[
            { value: "classic", label: "Classic" },
            { value: "conversational", label: "Conversational" },
          ]}
        />
      </Row>
      <Row label="Accent">
        <Input
          type="color"
          value={design.accent}
          onChange={(e) => editor.patchDesign({ accent: e.target.value })}
          style={{ width: "4rem", padding: "2px" }}
        />
      </Row>
    </Section>
  );
}
