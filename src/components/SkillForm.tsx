"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Button } from "@/components/ui";

interface SkillData {
  name: string;
  category: string;
  sortOrder: number;
}

interface Props {
  skillId?: string;
  initial?: Partial<SkillData>;
}

const DEFAULT: SkillData = { name: "", category: "", sortOrder: 0 };

export function SkillForm({ skillId, initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState<SkillData>({ ...DEFAULT, ...initial });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (key: keyof SkillData, value: unknown) => setData((d) => ({ ...d, [key]: value }));

  async function save() {
    setSaving(true);
    const res = skillId
      ? await fetch(`/api/skills/${skillId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      : await fetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      alert("Save failed");
      setSaving(false);
    }
  }

  async function remove() {
    if (!skillId) return;
    if (!confirm("Delete this skill?")) return;
    setDeleting(true);
    const res = await fetch(`/api/skills/${skillId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      alert("Delete failed");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
        <Field label="Skill name">
          <Input value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="React" />
        </Field>
        <Field label="Category">
          <Input value={data.category} onChange={(e) => set("category", e.target.value)} placeholder="Engineering" />
        </Field>
      </div>
      <Field label="Sort order">
        <Input type="number" value={data.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
      </Field>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border)" }}>
        <Button type="submit" variant="accent" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {skillId && (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-sm)", color: "var(--danger)" }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}
