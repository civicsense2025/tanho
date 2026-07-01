"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea, Button } from "@/components/ui";

interface ExperienceData {
  company: string;
  role: string;
  description: string;
  startDate: string;
  endDate: string;
  current: boolean;
  sortOrder: number;
}

interface Props {
  experienceId?: string;
  initial?: Partial<ExperienceData>;
}

const DEFAULT: ExperienceData = {
  company: "",
  role: "",
  description: "",
  startDate: "",
  endDate: "",
  current: false,
  sortOrder: 0,
};

export function ExperienceForm({ experienceId, initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ExperienceData>({ ...DEFAULT, ...initial });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (key: keyof ExperienceData, value: unknown) => setData((d) => ({ ...d, [key]: value }));

  async function save() {
    setSaving(true);
    const payload = { ...data, current: data.current ? 1 : 0 };
    const res = experienceId
      ? await fetch(`/api/experience/${experienceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/experience", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      alert("Save failed");
      setSaving(false);
    }
  }

  async function remove() {
    if (!experienceId) return;
    if (!confirm("Delete this experience entry?")) return;
    setDeleting(true);
    const res = await fetch(`/api/experience/${experienceId}`, { method: "DELETE" });
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
        <Field label="Role">
          <Input value={data.role} onChange={(e) => set("role", e.target.value)} placeholder="Co-founder & Head of Design" />
        </Field>
        <Field label="Company">
          <Input value={data.company} onChange={(e) => set("company", e.target.value)} placeholder="Fiveable" />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
        <Field label="Start date">
          <Input value={data.startDate} onChange={(e) => set("startDate", e.target.value)} placeholder="2018" />
        </Field>
        <Field label="End date">
          <Input value={data.endDate} onChange={(e) => set("endDate", e.target.value)} placeholder="2024" disabled={data.current} />
        </Field>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <input type="checkbox" checked={data.current} onChange={(e) => set("current", e.target.checked)} />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>I currently work here</span>
      </label>
      <Field label="Description">
        <Textarea rows={3} value={data.description} onChange={(e) => set("description", e.target.value)} placeholder="What you did and achieved…" />
      </Field>
      <Field label="Sort order">
        <Input type="number" value={data.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
      </Field>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border)" }}>
        <Button type="submit" variant="accent" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {experienceId && (
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
