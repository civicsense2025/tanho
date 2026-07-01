"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Button } from "@/components/ui";

interface EducationData {
  school: string;
  degree: string;
  span: string;
  sortOrder: number;
}

interface Props {
  educationId?: string;
  initial?: Partial<EducationData>;
}

const DEFAULT: EducationData = { school: "", degree: "", span: "", sortOrder: 0 };

export function EducationForm({ educationId, initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState<EducationData>({ ...DEFAULT, ...initial });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (key: keyof EducationData, value: unknown) => setData((d) => ({ ...d, [key]: value }));

  async function save() {
    setSaving(true);
    const res = educationId
      ? await fetch(`/api/education/${educationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      : await fetch("/api/education", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      alert("Save failed");
      setSaving(false);
    }
  }

  async function remove() {
    if (!educationId) return;
    if (!confirm("Delete this school?")) return;
    setDeleting(true);
    const res = await fetch(`/api/education/${educationId}`, { method: "DELETE" });
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
      <div style={{ display: "grid", gridTemplateColumns: "10rem 1fr", gap: "var(--space-5)" }}>
        <Field label="Span" hint="e.g. Class of ’14">
          <Input value={data.span} onChange={(e) => set("span", e.target.value)} placeholder="Class of ’14" />
        </Field>
        <Field label="School">
          <Input value={data.school} onChange={(e) => set("school", e.target.value)} placeholder="Canisius University" />
        </Field>
      </div>
      <Field label="Degree / detail">
        <Input value={data.degree} onChange={(e) => set("degree", e.target.value)} placeholder="Dual major — Digital Media Arts & Communication Studies" />
      </Field>
      <Field label="Sort order">
        <Input type="number" value={data.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
      </Field>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border)" }}>
        <Button type="submit" variant="accent" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {educationId && (
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
